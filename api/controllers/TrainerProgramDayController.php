<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\AuthMiddleware;
use Core\AuditLogger;
use PDO;

class TrainerProgramDayController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    private function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private function getTrainerProfileId(): int
    {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if (!$adminId) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bu işlem için yetkiniz yok.', 'FORBIDDEN', 403);
        }

        $stmt = $this->db->prepare("
            SELECT id FROM trainers 
            WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1
        ");
        $stmt->bindValue(1, $adminId, PDO::PARAM_INT);
        $stmt->execute();
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$trainer) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }
        return (int)$trainer['id'];
    }

    private function getTrainerProfileIdForUpdate(): int
    {
        $adminId = (int)($_SESSION['admin_id'] ?? 0);
        if (!$adminId) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bu işlem için yetkiniz yok.', 'FORBIDDEN', 403);
        }

        $stmt = $this->db->prepare("
            SELECT id FROM trainers 
            WHERE admin_id = ? AND deleted_at IS NULL AND is_active = 1
            FOR UPDATE
        ");
        $stmt->bindValue(1, $adminId, PDO::PARAM_INT);
        $stmt->execute();
        $trainer = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$trainer) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }
        return (int)$trainer['id'];
    }

    private function getJsonPayload(): array
    {
        $contentType = $_SERVER["CONTENT_TYPE"] ?? '';
        if (strcasecmp(trim(explode(';', $contentType)[0]), 'application/json') !== 0) {
            Response::error('Yalnızca JSON kabul edilmektedir.', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            Response::error('Boş istek.', 'BAD_REQUEST', 400);
        }

        if (strlen($raw) > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }

        $isObj = json_decode($raw, false);
        if (json_last_error() !== JSON_ERROR_NONE || !is_object($isObj)) {
            Response::error('JSON bir obje olmalıdır.', 'BAD_REQUEST', 400);
        }

        $data = json_decode($raw, true);

        $allowlist = ['title', 'sort_order', 'notes'];
        foreach (array_keys($data) as $key) {
            if (!in_array($key, $allowlist, true)) {
                Response::error("Geçersiz alan: $key", 'VALIDATION_ERROR', 422);
            }
        }
        return $data;
    }

    /**
     * GET /api/trainer/training-programs/{programId}/days
     */
    public function index($programId): void
    {
        AuthMiddleware::hasRole(['trainer']);
        $trainerId = $this->getTrainerProfileId();
        $programId = (int)$programId;

        try {
            // Verify program ownership
            $stmt = $this->db->prepare("
                SELECT tp.id 
                FROM training_programs tp
                JOIN members m ON tp.member_id = m.id
                WHERE tp.id = ? 
                  AND tp.trainer_id = ? 
                  AND tp.deleted_at IS NULL
                  AND m.trainer_id = ? 
                  AND m.deleted_at IS NULL
            ");
            $stmt->bindValue(1, $programId, PDO::PARAM_INT);
            $stmt->bindValue(2, $trainerId, PDO::PARAM_INT);
            $stmt->bindValue(3, $trainerId, PDO::PARAM_INT);
            $stmt->execute();
            if (!$stmt->fetch()) {
                Response::error('Program bulunamadı.', 'NOT_FOUND', 404);
            }

            $stmt = $this->db->prepare("
                SELECT id, uuid, program_id, title, sort_order, notes, created_at, updated_at
                FROM training_program_days
                WHERE program_id = ? AND deleted_at IS NULL
                ORDER BY sort_order ASC, id ASC
            ");
            $stmt->bindValue(1, $programId, PDO::PARAM_INT);
            $stmt->execute();

            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $items = [];
            foreach ($results as $row) {
                $items[] = [
                    'id' => (int)$row['id'],
                    'uuid' => (string)$row['uuid'],
                    'program_id' => (int)$row['program_id'],
                    'title' => (string)$row['title'],
                    'sort_order' => (int)$row['sort_order'],
                    'notes' => $row['notes'] !== null ? (string)$row['notes'] : null,
                    'created_at' => (string)$row['created_at'],
                    'updated_at' => (string)$row['updated_at']
                ];
            }

            Response::json($items);
        } catch (\Throwable $e) {
            error_log('TrainerProgramDayController@index Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    /**
     * POST /api/trainer/training-programs/{programId}/days
     */
    public function create($programId): void
    {
        AuthMiddleware::hasRole(['trainer']);
        $programId = (int)$programId;
        $val = $this->getJsonPayload();

        if (!array_key_exists('title', $val) || !is_string($val['title'])) {
            Response::error("title zorunludur ve metin olmalıdır.", 'VALIDATION_ERROR', 422);
        }
        $val['title'] = trim($val['title']);
        $len = mb_strlen($val['title'], 'UTF-8');
        if ($len < 1 || $len > 160) {
            Response::error("title 1-160 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
        }

        $sort_order = array_key_exists('sort_order', $val) ? $val['sort_order'] : 0;
        if (!is_int($sort_order) || $sort_order < 0 || $sort_order > 2147483647) {
            Response::error("sort_order 0 veya daha büyük tam sayı olmalıdır.", 'VALIDATION_ERROR', 422);
        }

        $notes = array_key_exists('notes', $val) ? $val['notes'] : null;
        if ($notes !== null) {
            if (!is_string($notes)) {
                Response::error("notes metin olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            $notes = trim($notes);
            if (mb_strlen($notes, 'UTF-8') > 2000) {
                Response::error("notes en fazla 2000 karakter olabilir.", 'VALIDATION_ERROR', 422);
            }
            if ($notes === '') {
                $notes = null;
            }
        }

        try {
            $this->db->beginTransaction();

            $trainerId = $this->getTrainerProfileIdForUpdate();

            $stmt = $this->db->prepare("
                SELECT tp.id 
                FROM training_programs tp
                JOIN members m ON tp.member_id = m.id
                WHERE tp.id = ? 
                  AND tp.trainer_id = ? 
                  AND tp.deleted_at IS NULL
                  AND m.trainer_id = ? 
                  AND m.deleted_at IS NULL
                FOR UPDATE
            ");
            $stmt->bindValue(1, $programId, PDO::PARAM_INT);
            $stmt->bindValue(2, $trainerId, PDO::PARAM_INT);
            $stmt->bindValue(3, $trainerId, PDO::PARAM_INT);
            $stmt->execute();
            $program = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$program) {
                if ($this->db->inTransaction()) {
                    $this->db->rollBack();
                }
                Response::error("Program bulunamadı.", 'NOT_FOUND', 404);
            }

            $currentAdminId = (int)($_SESSION['admin_id'] ?? 0);
            $uuid = $this->generateUuid();

            $stmt = $this->db->prepare("
                INSERT INTO training_program_days 
                (uuid, program_id, title, sort_order, notes, created_by, updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $uuid,
                $programId,
                $val['title'],
                $sort_order,
                $notes,
                $currentAdminId ?: null,
                $currentAdminId ?: null
            ]);

            $dayId = (int)$this->db->lastInsertId();
            $this->db->commit();

            try {
                AuditLogger::log(
                    'trainer_program_day.create',
                    $currentAdminId,
                    'training_program_day',
                    $dayId,
                    [
                        'day_id' => $dayId,
                        'program_id' => $programId,
                        'trainer_id' => $trainerId
                    ]
                );
            } catch (\Throwable $e) {}

            Response::json(['id' => $dayId, 'uuid' => $uuid], 201);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('TrainerProgramDayController@create Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    /**
     * PATCH /api/trainer/program-days/{dayId}
     */
    public function update($dayId): void
    {
        AuthMiddleware::hasRole(['trainer']);
        $dayId = (int)$dayId;
        $val = $this->getJsonPayload();

        if (empty($val)) {
            Response::error("Güncellenecek alan bulunamadı.", 'VALIDATION_ERROR', 422);
        }

        try {
            $this->db->beginTransaction();

            $trainerId = $this->getTrainerProfileIdForUpdate();

            $stmt = $this->db->prepare("
                SELECT d.id, d.program_id, d.title, d.sort_order, d.notes
                FROM training_program_days d
                JOIN training_programs tp ON d.program_id = tp.id
                JOIN members m ON tp.member_id = m.id
                WHERE d.id = ? 
                  AND tp.trainer_id = ? 
                  AND tp.deleted_at IS NULL
                  AND m.trainer_id = ? 
                  AND m.deleted_at IS NULL
                  AND d.deleted_at IS NULL
                FOR UPDATE
            ");
            $stmt->bindValue(1, $dayId, PDO::PARAM_INT);
            $stmt->bindValue(2, $trainerId, PDO::PARAM_INT);
            $stmt->bindValue(3, $trainerId, PDO::PARAM_INT);
            $stmt->execute();
            $currentDay = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$currentDay) {
                if ($this->db->inTransaction()) {
                    $this->db->rollBack();
                }
                Response::error("Program günü bulunamadı.", 'NOT_FOUND', 404);
            }

            $programId = (int)$currentDay['program_id'];
            $currTitle = (string)$currentDay['title'];
            $currSortOrder = (int)$currentDay['sort_order'];
            $currNotes = $currentDay['notes'] !== null ? (string)$currentDay['notes'] : null;

            $updates = [];
            $params = [];
            $changedFields = [];

            if (array_key_exists('title', $val)) {
                if (!is_string($val['title'])) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("title metin olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                $trimmedTitle = trim($val['title']);
                $len = mb_strlen($trimmedTitle, 'UTF-8');
                if ($len < 1 || $len > 160) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("title 1-160 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                if ($trimmedTitle !== $currTitle) {
                    $updates[] = "title = ?";
                    $params[] = $trimmedTitle;
                    $changedFields[] = 'title';
                }
            }

            if (array_key_exists('sort_order', $val)) {
                $sort = $val['sort_order'];
                if (!is_int($sort) || $sort < 0 || $sort > 2147483647) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("sort_order 0 veya daha büyük tam sayı olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                if ($sort !== $currSortOrder) {
                    $updates[] = "sort_order = ?";
                    $params[] = $sort;
                    $changedFields[] = 'sort_order';
                }
            }

            if (array_key_exists('notes', $val)) {
                $notes = $val['notes'];
                if ($notes !== null) {
                    if (!is_string($notes)) {
                        if ($this->db->inTransaction()) { $this->db->rollBack(); }
                        Response::error("notes metin olmalıdır.", 'VALIDATION_ERROR', 422);
                    }
                    $notes = trim($notes);
                    if (mb_strlen($notes, 'UTF-8') > 2000) {
                        if ($this->db->inTransaction()) { $this->db->rollBack(); }
                        Response::error("notes en fazla 2000 karakter olabilir.", 'VALIDATION_ERROR', 422);
                    }
                    if ($notes === '') {
                        $notes = null;
                    }
                }
                if ($notes !== $currNotes) {
                    $updates[] = "notes = ?";
                    $params[] = $notes;
                    $changedFields[] = 'notes';
                }
            }

            if (empty($updates)) {
                $this->db->commit();
                Response::json(['success' => true]);
                return;
            }

            $currentAdminId = (int)($_SESSION['admin_id'] ?? 0);
            $updates[] = "updated_by = ?";
            $params[] = $currentAdminId ?: null;

            $params[] = $dayId;
            $sql = "UPDATE training_program_days SET " . implode(', ', $updates) . " WHERE id = ?";
            $updateStmt = $this->db->prepare($sql);
            $updateStmt->execute($params);

            $this->db->commit();

            try {
                AuditLogger::log(
                    'trainer_program_day.update',
                    $currentAdminId,
                    'training_program_day',
                    $dayId,
                    [
                        'day_id' => $dayId,
                        'program_id' => $programId,
                        'trainer_id' => $trainerId,
                        'changed_fields' => $changedFields
                    ]
                );
            } catch (\Throwable $e) {}

            Response::json(['success' => true]);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('TrainerProgramDayController@update Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    /**
     * DELETE /api/trainer/program-days/{dayId}
     * Soft delete day and unassign exercises (program_day_id = NULL) atomically.
     */
    public function delete($dayId): void
    {
        AuthMiddleware::hasRole(['trainer']);
        $dayId = (int)$dayId;

        try {
            $this->db->beginTransaction();

            $trainerId = $this->getTrainerProfileIdForUpdate();

            $stmt = $this->db->prepare("
                SELECT d.id, d.program_id
                FROM training_program_days d
                JOIN training_programs tp ON d.program_id = tp.id
                JOIN members m ON tp.member_id = m.id
                WHERE d.id = ? 
                  AND tp.trainer_id = ? 
                  AND tp.deleted_at IS NULL
                  AND m.trainer_id = ? 
                  AND m.deleted_at IS NULL
                  AND d.deleted_at IS NULL
                FOR UPDATE
            ");
            $stmt->bindValue(1, $dayId, PDO::PARAM_INT);
            $stmt->bindValue(2, $trainerId, PDO::PARAM_INT);
            $stmt->bindValue(3, $trainerId, PDO::PARAM_INT);
            $stmt->execute();
            $day = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$day) {
                if ($this->db->inTransaction()) {
                    $this->db->rollBack();
                }
                Response::error("Program günü bulunamadı.", 'NOT_FOUND', 404);
            }

            $programId = (int)$day['program_id'];
            $currentAdminId = (int)($_SESSION['admin_id'] ?? 0);

            // Step 1: Unassign all exercises belonging to this day (preserve as legacy/unassigned rows)
            $unassignStmt = $this->db->prepare("
                UPDATE program_exercises 
                SET program_day_id = NULL 
                WHERE program_day_id = ?
            ");
            $unassignStmt->bindValue(1, $dayId, PDO::PARAM_INT);
            $unassignStmt->execute();

            // Step 2: Soft-delete the day record
            $deleteStmt = $this->db->prepare("
                UPDATE training_program_days 
                SET deleted_at = CURRENT_TIMESTAMP, updated_by = ? 
                WHERE id = ?
            ");
            $deleteStmt->bindValue(1, $currentAdminId ?: null, PDO::PARAM_INT);
            $deleteStmt->bindValue(2, $dayId, PDO::PARAM_INT);
            $deleteStmt->execute();

            $this->db->commit();

            try {
                AuditLogger::log(
                    'trainer_program_day.delete',
                    $currentAdminId,
                    'training_program_day',
                    $dayId,
                    [
                        'day_id' => $dayId,
                        'program_id' => $programId,
                        'trainer_id' => $trainerId
                    ]
                );
            } catch (\Throwable $e) {}

            Response::json(['success' => true]);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('TrainerProgramDayController@delete Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }
}
