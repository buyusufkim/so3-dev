const fs = require('fs');
const content = fs.readFileSync('api/controllers/AppointmentController.php', 'utf8');

const rescheduleHelper = `
    // --- RESCHEDULE HELPERS ---

    private function handleReschedule(int $appointmentId, ?int $forcedTrainerId = null) {
        if (!empty($_GET)) {
            Response::error(
                'Query parameters are not allowed for appointment reschedule.',
                'VALIDATION_ERROR',
                422
            );
        }

        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            Response::error('Malformed JSON payload.', 'INVALID_JSON', 400);
        }

        $dataKeys = array_keys($data);
        sort($dataKeys);
        $allowedSorted = ['ends_at', 'starts_at'];

        if ($dataKeys !== $allowedSorted) {
            Response::error('Exact payload keys required.', 'VALIDATION_ERROR', 422);
        }

        if (!is_string($data['starts_at']) || !is_string($data['ends_at'])) {
            Response::error('starts_at and ends_at must be strings.', 'VALIDATION_ERROR', 422);
        }

        $startsDt = $this->parseWindowDate($data['starts_at'], 'starts_at');
        $endsDt = $this->parseWindowDate($data['ends_at'], 'ends_at');

        if ($startsDt >= $endsDt) {
            Response::error('starts_at must be strictly before ends_at.', 'VALIDATION_ERROR', 422);
        }

        if ($startsDt->format('Y-m-d') !== $endsDt->format('Y-m-d')) {
            Response::error('Appointments must start and end on the same calendar day (Europe/Istanbul).', 'VALIDATION_ERROR', 422);
        }

        $adminId = $_SESSION['admin_id'] ?? 0;
        if (!$adminId || !is_int($adminId) || $adminId <= 0) {
            Response::error('Valid session required.', 'UNAUTHORIZED', 401);
        }

        try {
            $this->db->beginTransaction();

            // Discovery
            $discStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
            $discStmt->bindValue(1, $appointmentId, \PDO::PARAM_INT);
            $discStmt->execute();
            $discovery = $discStmt->fetch(\PDO::FETCH_ASSOC);

            if (!$discovery) {
                $this->db->rollBack();
                Response::error('Appointment not found.', 'NOT_FOUND', 404);
            }

            if ($forcedTrainerId !== null && (int)$discovery['trainer_id'] !== $forcedTrainerId) {
                $this->db->rollBack();
                Response::error('Unauthorized trainer profile access.', 'FORBIDDEN', 403);
            }

            $currentMemberId = (int)$discovery['member_id'];
            $currentTrainerId = (int)$discovery['trainer_id'];

            // 1. Member lock
            $memStmt = $this->db->prepare("SELECT id, deleted_at, status, membership_end_date, trainer_id FROM members WHERE id = ? FOR UPDATE");
            $memStmt->bindValue(1, $currentMemberId, \PDO::PARAM_INT);
            $memStmt->execute();
            $member = $memStmt->fetch(\PDO::FETCH_ASSOC);

            if (!$member || $member['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error('Member not found or deleted.', 'NOT_FOUND', 404);
            }

            if ($member['status'] !== 'active') {
                $this->db->rollBack();
                Response::error('Member is not active.', 'MEMBER_INELIGIBLE', 409);
            }

            if ($member['membership_end_date'] !== null) {
                $memEndDate = new DateTime($member['membership_end_date'] . ' 23:59:59', new DateTimeZone('Europe/Istanbul'));
                if ($startsDt->format('Y-m-d') > $memEndDate->format('Y-m-d')) {
                    $this->db->rollBack();
                    Response::error('Appointment date exceeds membership end date.', 'MEMBER_INELIGIBLE', 409);
                }
            }

            if ($forcedTrainerId !== null && (int)$member['trainer_id'] !== $forcedTrainerId) {
                $this->db->rollBack();
                Response::error('Trainer can only manage appointments for assigned members.', 'FORBIDDEN', 403);
            }

            // 2. Trainer lock
            $trainStmt = $this->db->prepare("SELECT id, deleted_at, is_active, admin_id FROM trainers WHERE id = ? FOR UPDATE");
            $trainStmt->bindValue(1, $currentTrainerId, \PDO::PARAM_INT);
            $trainStmt->execute();
            $trainer = $trainStmt->fetch(\PDO::FETCH_ASSOC);

            if (!$trainer || $trainer['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error('Trainer not found or deleted.', 'NOT_FOUND', 404);
            }

            if ($trainer['is_active'] != 1) {
                $this->db->rollBack();
                Response::error('Trainer is inactive.', 'TRAINER_INELIGIBLE', 409);
            }

            if ($forcedTrainerId !== null && (int)$trainer['admin_id'] !== $adminId) {
                $this->db->rollBack();
                Response::error('Unauthorized trainer profile access.', 'FORBIDDEN', 403);
            }

            // 3. Appointment lock
            $appStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ? FOR UPDATE");
            $appStmt->bindValue(1, $appointmentId, \PDO::PARAM_INT);
            $appStmt->execute();
            $lockedApp = $appStmt->fetch(\PDO::FETCH_ASSOC);

            if (!$lockedApp) {
                $this->db->rollBack();
                Response::error('Appointment not found.', 'NOT_FOUND', 404);
            }

            if ((int)$lockedApp['member_id'] !== $currentMemberId || (int)$lockedApp['trainer_id'] !== $currentTrainerId) {
                $this->db->rollBack();
                Response::error('Appointment participants have changed.', 'APPOINTMENT_CHANGED', 409);
            }

            if ($lockedApp['status'] !== 'scheduled') {
                $this->db->rollBack();
                Response::error('Only scheduled appointments can be rescheduled.', 'APPOINTMENT_NOT_RESCHEDULABLE', 409);
            }

            if ($forcedTrainerId !== null && (int)$lockedApp['trainer_id'] !== $forcedTrainerId) {
                $this->db->rollBack();
                Response::error('Unauthorized trainer profile access.', 'FORBIDDEN', 403);
            }

            if ($lockedApp['starts_at'] === $data['starts_at'] && $lockedApp['ends_at'] === $data['ends_at']) {
                $this->db->rollBack();
                Response::error('At least one time value must change.', 'VALIDATION_ERROR', 422);
            }

            // 4. Trainer conflict
            $tConfStmt = $this->db->prepare("
                SELECT id FROM appointments 
                WHERE id <> ? AND trainer_id = ? AND status = 'scheduled' 
                  AND starts_at < ? AND ends_at > ?
                FOR UPDATE
            ");
            $tConfStmt->bindValue(1, $appointmentId, \PDO::PARAM_INT);
            $tConfStmt->bindValue(2, $currentTrainerId, \PDO::PARAM_INT);
            $tConfStmt->bindValue(3, $data['ends_at'], \PDO::PARAM_STR);
            $tConfStmt->bindValue(4, $data['starts_at'], \PDO::PARAM_STR);
            $tConfStmt->execute();
            
            if ($tConfStmt->fetch()) {
                $this->db->rollBack();
                Response::error('Trainer is already booked for this time.', 'TRAINER_CONFLICT', 409);
            }

            // 5. Member conflict
            $mConfStmt = $this->db->prepare("
                SELECT id FROM appointments 
                WHERE id <> ? AND member_id = ? AND status = 'scheduled' 
                  AND starts_at < ? AND ends_at > ?
                FOR UPDATE
            ");
            $mConfStmt->bindValue(1, $appointmentId, \PDO::PARAM_INT);
            $mConfStmt->bindValue(2, $currentMemberId, \PDO::PARAM_INT);
            $mConfStmt->bindValue(3, $data['ends_at'], \PDO::PARAM_STR);
            $mConfStmt->bindValue(4, $data['starts_at'], \PDO::PARAM_STR);
            $mConfStmt->execute();
            
            if ($mConfStmt->fetch()) {
                $this->db->rollBack();
                Response::error('Member is already booked for this time.', 'MEMBER_CONFLICT', 409);
            }

            // 6. History INSERT
            $historyUuid = $this->generateUuid();
            $histStmt = $this->db->prepare("
                INSERT INTO appointment_reschedules 
                (uuid, appointment_id, previous_starts_at, previous_ends_at, new_starts_at, new_ends_at, rescheduled_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $histStmt->bindValue(1, $historyUuid, \PDO::PARAM_STR);
            $histStmt->bindValue(2, $appointmentId, \PDO::PARAM_INT);
            $histStmt->bindValue(3, $lockedApp['starts_at'], \PDO::PARAM_STR);
            $histStmt->bindValue(4, $lockedApp['ends_at'], \PDO::PARAM_STR);
            $histStmt->bindValue(5, $data['starts_at'], \PDO::PARAM_STR);
            $histStmt->bindValue(6, $data['ends_at'], \PDO::PARAM_STR);
            $histStmt->bindValue(7, $adminId, \PDO::PARAM_INT);
            $histStmt->execute();

            // 7. Appointment UPDATE
            $updStmt = $this->db->prepare("
                UPDATE appointments 
                SET starts_at = ?, ends_at = ?, updated_by = ?
                WHERE id = ?
            ");
            $updStmt->bindValue(1, $data['starts_at'], \PDO::PARAM_STR);
            $updStmt->bindValue(2, $data['ends_at'], \PDO::PARAM_STR);
            $updStmt->bindValue(3, $adminId, \PDO::PARAM_INT);
            $updStmt->bindValue(4, $appointmentId, \PDO::PARAM_INT);
            $updStmt->execute();

            if ($updStmt->rowCount() === 0) {
                $this->db->rollBack();
                Response::error('Failed to update appointment.', 'INTERNAL_ERROR', 500);
            }

            // 8. Persisted fetch
            $fetchStmt = $this->db->prepare("SELECT id, uuid, member_id, trainer_id, starts_at, ends_at, status FROM appointments WHERE id = ?");
            $fetchStmt->bindValue(1, $appointmentId, \PDO::PARAM_INT);
            $fetchStmt->execute();
            $persistedApp = $fetchStmt->fetch(\PDO::FETCH_ASSOC);

            if (!$persistedApp) {
                $this->db->rollBack();
                Response::error('Failed to retrieve persisted appointment.', 'INTERNAL_ERROR', 500);
            }

            $this->db->commit();

            // 9. Audit
            try {
                AuditLogger::log(
                    'appointment.rescheduled',
                    $adminId,
                    'appointment',
                    $appointmentId,
                    [
                        'previous_starts_at' => $lockedApp['starts_at'],
                        'previous_ends_at' => $lockedApp['ends_at'],
                        'new_starts_at' => $persistedApp['starts_at'],
                        'new_ends_at' => $persistedApp['ends_at']
                    ]
                );
            } catch (Throwable $e) {
                error_log("Failed to log appointment reschedule: " . $e->getMessage());
            }

            Response::json([
                'appointment' => [
                    'id' => (int)$persistedApp['id'],
                    'uuid' => $persistedApp['uuid'],
                    'member_id' => (int)$persistedApp['member_id'],
                    'trainer_id' => (int)$persistedApp['trainer_id'],
                    'starts_at' => $persistedApp['starts_at'],
                    'ends_at' => $persistedApp['ends_at'],
                    'status' => $persistedApp['status']
                ]
            ], 200);

        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log("Appointment Reschedule Error: " . $e->getMessage());
            Response::error('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
        }
    }
`;

const publicMethods = `
    public function rescheduleAdminAppointment(int $id) {
        $this->handleReschedule($id);
    }

    public function rescheduleReceptionAppointment(int $id) {
        $this->handleReschedule($id);
    }

    public function rescheduleTrainerAppointment(int $id) {
        $adminId = $_SESSION['admin_id'] ?? 0;
        if (!$adminId) {
            Response::error('Unauthorized.', 'UNAUTHORIZED', 401);
        }
        $trainerId = $this->getTrainerProfileId($adminId);
        $this->handleReschedule($id, $trainerId);
    }
`;

let newContent = content;

// Insert handleReschedule before handleCreate or after handleCreate
const insertPosHelper = newContent.indexOf('    // --- PUBLIC ENTRY POINTS ---');
newContent = newContent.slice(0, insertPosHelper) + rescheduleHelper + '\n' + newContent.slice(insertPosHelper);

// Insert publicMethods at the very end before the closing brace
const lastBracePos = newContent.lastIndexOf('}');
newContent = newContent.slice(0, lastBracePos) + publicMethods + '\n' + newContent.slice(lastBracePos);

fs.writeFileSync('api/controllers/AppointmentController.php', newContent);
