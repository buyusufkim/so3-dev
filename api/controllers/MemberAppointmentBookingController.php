<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\MemberAuthMiddleware;
use PDO;
use DateTime;
use DateTimeZone;
use Throwable;

class MemberAppointmentBookingController
{
    private PDO $db;
    private int $memberId = 0;
    private int $accountId = 0;

    private const SLOT_DURATION_MINUTES = 60;
    private const SLOT_STEP_MINUTES = 60;
    private const MINIMUM_NOTICE_MINUTES = 120;
    private const BOOKING_HORIZON_DAYS = 14;
    private const TIMEZONE = 'Europe/Istanbul';

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    private function rejectQueryParams(): void
    {
        if (!empty($_GET)) {
            Response::error('Query parameters are not allowed.', 'VALIDATION_ERROR', 422);
        }
    }

    private function guard(): void
    {
        MemberAuthMiddleware::handle();

        $this->memberId = (int)($_SESSION['member_id'] ?? 0);
        $this->accountId = (int)($_SESSION['member_account_id'] ?? 0);

        if ($this->memberId <= 0 || $this->accountId <= 0) {
            Response::error('Unauthorized access.', 'UNAUTHORIZED', 401);
        }

        $this->rejectQueryParams();

        $stmt = $this->db->prepare("SELECT must_change_password FROM member_accounts WHERE id = ?");
        $stmt->execute([$this->accountId]);
        $account = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$account) {
            Response::error('Unauthorized access.', 'UNAUTHORIZED', 401);
        }

        if ((int)$account['must_change_password'] === 1) {
            Response::error('Password change required before proceeding.', 'PASSWORD_CHANGE_REQUIRED', 403);
        }
    }

    public function getBookingOptions(): void
    {
        $this->guard();

        $mStmt = $this->db->prepare("
            SELECT id, status, membership_start_date, membership_end_date, trainer_id, deleted_at
            FROM members
            WHERE id = ? AND deleted_at IS NULL AND status = 'active'
        ");
        $mStmt->execute([$this->memberId]);
        $member = $mStmt->fetch(PDO::FETCH_ASSOC);

        if (!$member) {
            Response::error('Member not found or inactive.', 'NOT_FOUND', 404);
        }

        $startDate = $member['membership_start_date'];
        $endDate = $member['membership_end_date'];

        // If only one membership date is null, return 409 inconsistent
        if (($startDate === null && $endDate !== null) || ($startDate !== null && $endDate === null)) {
            Response::error('Member membership date range is inconsistent.', 'MEMBER_MEMBERSHIP_DATA_INCONSISTENT', 409);
        }

        $trainerId = $member['trainer_id'] !== null ? (int)$member['trainer_id'] : 0;

        // Assigned trainer only: self-service v1 uses exact members.trainer_id
        if ($trainerId <= 0) {
            Response::json([
                'timezone' => self::TIMEZONE,
                'booking_state' => 'TRAINER_NOT_ASSIGNED',
                'policy' => [
                    'slot_duration_minutes' => self::SLOT_DURATION_MINUTES,
                    'slot_step_minutes' => self::SLOT_STEP_MINUTES,
                    'minimum_notice_minutes' => self::MINIMUM_NOTICE_MINUTES,
                    'booking_horizon_days' => self::BOOKING_HORIZON_DAYS,
                ],
                'trainer' => null,
                'days' => []
            ]);
        }

        $tStmt = $this->db->prepare("
            SELECT id, name, is_active, deleted_at 
            FROM trainers 
            WHERE id = ?
        ");
        $tStmt->execute([$trainerId]);
        $trainer = $tStmt->fetch(PDO::FETCH_ASSOC);

        if (!$trainer || $trainer['deleted_at'] !== null || (int)$trainer['is_active'] !== 1) {
            Response::json([
                'timezone' => self::TIMEZONE,
                'booking_state' => 'TRAINER_UNAVAILABLE',
                'policy' => [
                    'slot_duration_minutes' => self::SLOT_DURATION_MINUTES,
                    'slot_step_minutes' => self::SLOT_STEP_MINUTES,
                    'minimum_notice_minutes' => self::MINIMUM_NOTICE_MINUTES,
                    'booking_horizon_days' => self::BOOKING_HORIZON_DAYS,
                ],
                'trainer' => null,
                'days' => []
            ]);
        }

        $trainerInfo = [
            'id' => (int)$trainer['id'],
            'name' => (string)$trainer['name']
        ];

        // If both membership dates are null, return MEMBERSHIP_NOT_SET
        if ($startDate === null && $endDate === null) {
            Response::json([
                'timezone' => self::TIMEZONE,
                'booking_state' => 'MEMBERSHIP_NOT_SET',
                'policy' => [
                    'slot_duration_minutes' => self::SLOT_DURATION_MINUTES,
                    'slot_step_minutes' => self::SLOT_STEP_MINUTES,
                    'minimum_notice_minutes' => self::MINIMUM_NOTICE_MINUTES,
                    'booking_horizon_days' => self::BOOKING_HORIZON_DAYS,
                ],
                'trainer' => $trainerInfo,
                'days' => []
            ]);
        }

        // --- READY STATE: Compute 14-day projection ---
        $tz = new DateTimeZone(self::TIMEZONE);
        $businessNow = new DateTime('now', $tz);
        $minimumBookableAt = (clone $businessNow)->modify('+' . self::MINIMUM_NOTICE_MINUTES . ' minutes');

        $calendarDates = [];
        for ($i = 0; $i < self::BOOKING_HORIZON_DAYS; $i++) {
            $cur = (clone $businessNow)->modify("+$i days");
            $calendarDates[] = $cur->format('Y-m-d');
        }

        $firstDate = $calendarDates[0];
        $lastDate = $calendarDates[count($calendarDates) - 1];
        $rangeStartStr = $firstDate . ' 00:00:00';
        $rangeEndStr = $lastDate . ' 23:59:59';

        // 1. Ledger integrity check for member's active packages with scheduled appointments
        $chkStmt = $this->db->prepare("
            SELECT a.id as appointment_id, a.member_session_package_id,
                   COALESCE(SUM(CASE WHEN l.entry_type = 'reserve' THEN 1 ELSE 0 END), 0) as res_count,
                   COALESCE(SUM(CASE WHEN l.entry_type = 'release' THEN 1 ELSE 0 END), 0) as rel_count
            FROM appointments a
            JOIN member_session_packages msp ON a.member_session_package_id = msp.id
            LEFT JOIN member_session_package_ledger l 
              ON l.member_session_package_id = a.member_session_package_id 
             AND l.appointment_id = a.id
            WHERE msp.member_id = ?
              AND msp.status = 'active'
              AND a.status = 'scheduled'
            GROUP BY a.id, a.member_session_package_id
        ");
        $chkStmt->execute([$this->memberId]);
        $ledgerIntegrityRows = $chkStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($ledgerIntegrityRows as $chk) {
            if ((int)$chk['res_count'] !== 1 || (int)$chk['rel_count'] !== 0) {
                Response::error('Session package ledger is inconsistent.', 'SESSION_PACKAGE_LEDGER_INCONSISTENT', 409);
            }
        }

        // 2. Fetch member active packages and compute balances
        $pkgStmt = $this->db->prepare("
            SELECT msp.id, msp.package_name_snapshot as package_name, msp.total_sessions, msp.valid_from, msp.valid_until,
                   COALESCE((SELECT SUM(delta) FROM member_session_package_ledger WHERE member_session_package_id = msp.id), 0) as used_delta
            FROM member_session_packages msp
            WHERE msp.member_id = ?
              AND msp.status = 'active'
        ");
        $pkgStmt->execute([$this->memberId]);
        $rawPackages = $pkgStmt->fetchAll(PDO::FETCH_ASSOC);

        $activePackagesWithRemaining = [];
        foreach ($rawPackages as $p) {
            $remaining = (int)$p['total_sessions'] + (int)$p['used_delta'];
            if ($remaining > 0) {
                $activePackagesWithRemaining[] = [
                    'id' => (int)$p['id'],
                    'package_name' => $p['package_name'],
                    'remaining_sessions' => $remaining,
                    'valid_from' => $p['valid_from'],
                    'valid_until' => $p['valid_until']
                ];
            }
        }

        // 3. Fetch trainer's weekly availability windows
        $wStmt = $this->db->prepare("
            SELECT day_of_week, start_time, end_time
            FROM trainer_availability_windows
            WHERE trainer_id = ?
            ORDER BY day_of_week ASC, start_time ASC, end_time ASC
        ");
        $wStmt->execute([$trainerId]);
        $weeklyWindows = $wStmt->fetchAll(PDO::FETCH_ASSOC);

        $windowsByDay = [];
        for ($d = 1; $d <= 7; $d++) {
            $windowsByDay[$d] = [];
        }
        foreach ($weeklyWindows as $w) {
            $windowsByDay[(int)$w['day_of_week']][] = [
                'start_time' => substr($w['start_time'], 0, 5),
                'end_time' => substr($w['end_time'], 0, 5)
            ];
        }

        // 4. Fetch trainer's unavailability blocks overlapping the 14-day projection range
        // Note: Do not select reason for member privacy
        $bStmt = $this->db->prepare("
            SELECT starts_at, ends_at
            FROM trainer_unavailability_blocks
            WHERE trainer_id = ?
              AND starts_at < ?
              AND ends_at > ?
            ORDER BY starts_at ASC, ends_at ASC
        ");
        $bStmt->execute([$trainerId, $rangeEndStr, $rangeStartStr]);
        $unavailabilityBlocks = $bStmt->fetchAll(PDO::FETCH_ASSOC);

        // 5. Fetch existing scheduled appointments for conflicts (trainer OR member)
        // Note: Do not select other member info or admin info
        $cStmt = $this->db->prepare("
            SELECT starts_at, ends_at
            FROM appointments
            WHERE status = 'scheduled'
              AND (trainer_id = ? OR member_id = ?)
              AND starts_at < ?
              AND ends_at > ?
            ORDER BY starts_at ASC, ends_at ASC
        ");
        $cStmt->execute([$trainerId, $this->memberId, $rangeEndStr, $rangeStartStr]);
        $conflicts = $cStmt->fetchAll(PDO::FETCH_ASSOC);

        // 6. Day-by-day projection
        $days = [];
        foreach ($calendarDates as $dateStr) {
            // Check membership validity for date
            $isMembershipActive = ($dateStr >= $startDate && $dateStr <= $endDate);
            if (!$isMembershipActive) {
                $days[] = [
                    'date' => $dateStr,
                    'state' => 'MEMBERSHIP_INACTIVE',
                    'slots' => [],
                    'eligible_packages' => []
                ];
                continue;
            }

            // Find eligible packages for this date
            $eligiblePackagesForDate = [];
            foreach ($activePackagesWithRemaining as $pkg) {
                if ($pkg['valid_from'] <= $dateStr && ($pkg['valid_until'] === null || $pkg['valid_until'] >= $dateStr)) {
                    $eligiblePackagesForDate[] = [
                        'id' => $pkg['id'],
                        'package_name' => $pkg['package_name'],
                        'remaining_sessions' => $pkg['remaining_sessions'],
                        'valid_until' => $pkg['valid_until']
                    ];
                }
            }

            // Deterministic package sorting: valid_until ASC (non-null first), then id ASC
            usort($eligiblePackagesForDate, function ($a, $b) {
                if ($a['valid_until'] !== null && $b['valid_until'] !== null) {
                    if ($a['valid_until'] !== $b['valid_until']) {
                        return strcmp($a['valid_until'], $b['valid_until']);
                    }
                } elseif ($a['valid_until'] !== null) {
                    return -1;
                } elseif ($b['valid_until'] !== null) {
                    return 1;
                }
                return $a['id'] - $b['id'];
            });

            // ISO weekday: 1 (Monday) .. 7 (Sunday)
            $dayOfWeek = (int)(new DateTime($dateStr, $tz))->format('N');
            $dayWindows = $windowsByDay[$dayOfWeek] ?? [];

            if (empty($dayWindows)) {
                $days[] = [
                    'date' => $dateStr,
                    'state' => 'NO_WORKING_HOURS',
                    'slots' => [],
                    'eligible_packages' => $eligiblePackagesForDate
                ];
                continue;
            }

            if (empty($eligiblePackagesForDate)) {
                $days[] = [
                    'date' => $dateStr,
                    'state' => 'NO_ELIGIBLE_PACKAGE',
                    'slots' => [],
                    'eligible_packages' => []
                ];
                continue;
            }

            // Generate candidate slots for each weekly window
            $bookableSlots = [];
            foreach ($dayWindows as $win) {
                $sParts = explode(':', $win['start_time']);
                $startMinutes = (int)$sParts[0] * 60 + (int)$sParts[1];

                $eParts = explode(':', $win['end_time']);
                $endMinutes = (int)$eParts[0] * 60 + (int)$eParts[1];

                for ($cur = $startMinutes; $cur + self::SLOT_DURATION_MINUTES <= $endMinutes; $cur += self::SLOT_STEP_MINUTES) {
                    $slotStartH = intdiv($cur, 60);
                    $slotStartM = $cur % 60;
                    $slotEndTotal = $cur + self::SLOT_DURATION_MINUTES;
                    $slotEndH = intdiv($slotEndTotal, 60);
                    $slotEndM = $slotEndTotal % 60;

                    if ($slotEndTotal > 1440) {
                        continue;
                    }

                    $slotStartStr = sprintf('%s %02d:%02d:00', $dateStr, $slotStartH, $slotStartM);
                    $slotEndStr = sprintf('%s %02d:%02d:00', $dateStr, $slotEndH, $slotEndM);

                    // Minimum notice check
                    $slotStartDt = new DateTime($slotStartStr, $tz);
                    if ($slotStartDt < $minimumBookableAt) {
                        continue;
                    }

                    // Unavailability blocks overlap check
                    $isBlocked = false;
                    foreach ($unavailabilityBlocks as $ub) {
                        if ($ub['starts_at'] < $slotEndStr && $ub['ends_at'] > $slotStartStr) {
                            $isBlocked = true;
                            break;
                        }
                    }
                    if ($isBlocked) {
                        continue;
                    }

                    // Existing scheduled appointments conflict check (trainer or member)
                    $isConflicted = false;
                    foreach ($conflicts as $appt) {
                        if ($appt['starts_at'] < $slotEndStr && $appt['ends_at'] > $slotStartStr) {
                            $isConflicted = true;
                            break;
                        }
                    }
                    if ($isConflicted) {
                        continue;
                    }

                    $bookableSlots[] = [
                        'starts_at' => $slotStartStr,
                        'ends_at' => $slotEndStr
                    ];
                }
            }

            // Sort slots chronologically
            usort($bookableSlots, function ($a, $b) {
                if ($a['starts_at'] !== $b['starts_at']) {
                    return strcmp($a['starts_at'], $b['starts_at']);
                }
                return strcmp($a['ends_at'], $b['ends_at']);
            });

            if (empty($bookableSlots)) {
                $days[] = [
                    'date' => $dateStr,
                    'state' => 'FULLY_BOOKED',
                    'slots' => [],
                    'eligible_packages' => $eligiblePackagesForDate
                ];
            } else {
                $days[] = [
                    'date' => $dateStr,
                    'state' => 'BOOKABLE',
                    'slots' => $bookableSlots,
                    'eligible_packages' => $eligiblePackagesForDate
                ];
            }
        }

        Response::json([
            'timezone' => self::TIMEZONE,
            'booking_state' => 'READY',
            'policy' => [
                'slot_duration_minutes' => self::SLOT_DURATION_MINUTES,
                'slot_step_minutes' => self::SLOT_STEP_MINUTES,
                'minimum_notice_minutes' => self::MINIMUM_NOTICE_MINUTES,
                'booking_horizon_days' => self::BOOKING_HORIZON_DAYS,
            ],
            'trainer' => $trainerInfo,
            'days' => $days
        ]);
    }

    private function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    public function createAppointment(): void
    {
        $this->guard();

        // 1. Content-Type validation (strict application/json prefix)
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') !== 0) {
            Response::error('Content-Type must be application/json.', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        // 2. Payload size validation (project-standard 16KB limit)
        if (isset($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > 16384) {
            Response::error('Payload too large.', 'PAYLOAD_TOO_LARGE', 413);
        }

        $raw = file_get_contents('php://input');
        if (strlen($raw) > 16384) {
            Response::error('Payload too large.', 'PAYLOAD_TOO_LARGE', 413);
        }

        // 3. JSON parse validation
        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            Response::error('Malformed JSON payload.', 'INVALID_JSON', 400);
        }

        // 4. Strict payload keys (only member_session_package_id and starts_at)
        $dataKeys = array_keys($data);
        sort($dataKeys);
        if ($dataKeys !== ['member_session_package_id', 'starts_at']) {
            Response::error('Exact payload keys required: member_session_package_id, starts_at.', 'VALIDATION_ERROR', 422);
        }

        // 5. Validate member_session_package_id
        if (!is_int($data['member_session_package_id']) || $data['member_session_package_id'] <= 0) {
            Response::error('Invalid member_session_package_id.', 'VALIDATION_ERROR', 422);
        }
        $packageId = (int)$data['member_session_package_id'];

        // 6. Validate starts_at format (YYYY-MM-DD HH:mm:ss, Europe/Istanbul, exact 00 seconds)
        if (!is_string($data['starts_at'])) {
            Response::error('starts_at must be a string.', 'VALIDATION_ERROR', 422);
        }
        $startsAtStr = trim($data['starts_at']);
        $tz = new DateTimeZone(self::TIMEZONE);
        $startsDt = DateTime::createFromFormat('Y-m-d H:i:s', $startsAtStr, $tz);
        if (!$startsDt || $startsDt->format('Y-m-d H:i:s') !== $startsAtStr || $startsDt->format('s') !== '00') {
            Response::error('Invalid starts_at format. Expected YYYY-MM-DD HH:mm:ss with 00 seconds.', 'VALIDATION_ERROR', 422);
        }

        // 7. Server authority derives ends_at (exact 60 minutes)
        $endsDt = (clone $startsDt)->modify('+' . self::SLOT_DURATION_MINUTES . ' minutes');
        $endsAtStr = $endsDt->format('Y-m-d H:i:s');
        $dateStr = $startsDt->format('Y-m-d');

        if ($startsDt->format('Y-m-d') !== $endsDt->format('Y-m-d')) {
            Response::error('Appointment must start and end on the same calendar day (Europe/Istanbul).', 'VALIDATION_ERROR', 422);
        }

        // 8. Server-side booking policy pre-checks (cheap fail-fast before transaction)
        $businessNow = new DateTime('now', $tz);
        $todayStr = $businessNow->format('Y-m-d');
        $horizonEndStr = (clone $businessNow)->modify('+' . (self::BOOKING_HORIZON_DAYS - 1) . ' days')->format('Y-m-d');

        if ($dateStr < $todayStr || $dateStr > $horizonEndStr) {
            Response::error('Appointment date is outside the 14-day booking horizon.', 'BOOKING_SLOT_UNAVAILABLE', 409);
        }

        $minimumBookableAt = (clone $businessNow)->modify('+' . self::MINIMUM_NOTICE_MINUTES . ' minutes');
        if ($startsDt < $minimumBookableAt) {
            Response::error('Appointment does not satisfy minimum notice period of 120 minutes.', 'BOOKING_SLOT_UNAVAILABLE', 409);
        }

        try {
            $this->db->beginTransaction();

            // STEP 1: Lock member account FOR UPDATE & revalidate session identity under lock
            $accStmt = $this->db->prepare("
                SELECT id, member_id, status, auth_version, must_change_password
                FROM member_accounts
                WHERE id = ?
                FOR UPDATE
            ");
            $accStmt->execute([$this->accountId]);
            $account = $accStmt->fetch(PDO::FETCH_ASSOC);

            $sessionAuthVersion = (int)($_SESSION['member_auth_version'] ?? 0);

            if (
                !$account ||
                (int)$account['member_id'] !== $this->memberId ||
                $account['status'] !== 'active' ||
                $sessionAuthVersion <= 0 ||
                (int)$account['auth_version'] !== $sessionAuthVersion
            ) {
                $this->db->rollBack();
                Response::error('Unauthorized access.', 'UNAUTHORIZED', 401);
            }

            if ((int)$account['must_change_password'] !== 0) {
                $this->db->rollBack();
                Response::error('Password change required before proceeding.', 'PASSWORD_CHANGE_REQUIRED', 403);
            }

            // STEP 2: Lock member profile FOR UPDATE
            $memStmt = $this->db->prepare("
                SELECT id, status, membership_start_date, membership_end_date, trainer_id, deleted_at
                FROM members
                WHERE id = ?
                FOR UPDATE
            ");
            $memStmt->execute([$this->memberId]);
            $member = $memStmt->fetch(PDO::FETCH_ASSOC);

            if (!$member || $member['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error('Member not found or deleted.', 'NOT_FOUND', 404);
            }

            if ($member['status'] !== 'active') {
                $this->db->rollBack();
                Response::error('Member is not active.', 'MEMBER_INELIGIBLE', 409);
            }

            $startDate = $member['membership_start_date'];
            $endDate = $member['membership_end_date'];

            if (($startDate === null && $endDate !== null) || ($startDate !== null && $endDate === null)) {
                $this->db->rollBack();
                Response::error('Member membership date range is inconsistent.', 'MEMBER_MEMBERSHIP_DATA_INCONSISTENT', 409);
            }

            if ($startDate === null && $endDate === null) {
                $this->db->rollBack();
                Response::error('Member has no active membership range.', 'MEMBER_INELIGIBLE', 409);
            }

            if ($dateStr < $startDate || $dateStr > $endDate) {
                $this->db->rollBack();
                Response::error('Appointment date is outside member membership date range.', 'MEMBER_INELIGIBLE', 409);
            }

            $trainerId = (int)($member['trainer_id'] ?? 0);
            if ($trainerId <= 0) {
                $this->db->rollBack();
                Response::error('No trainer assigned to this member.', 'TRAINER_NOT_ASSIGNED', 409);
            }

            // STEP 3: Lock assigned trainer profile FOR UPDATE (trainer is the concurrency mutex)
            $trStmt = $this->db->prepare("
                SELECT id, name, is_active, deleted_at
                FROM trainers
                WHERE id = ?
                FOR UPDATE
            ");
            $trStmt->execute([$trainerId]);
            $trainer = $trStmt->fetch(PDO::FETCH_ASSOC);

            if (!$trainer || $trainer['deleted_at'] !== null) {
                $this->db->rollBack();
                Response::error('Assigned trainer not found or deleted.', 'NOT_FOUND', 404);
            }

            if ((int)$trainer['is_active'] !== 1) {
                $this->db->rollBack();
                Response::error('Assigned trainer is inactive.', 'TRAINER_INELIGIBLE', 409);
            }

            // STEP 4: Authoritative locked booking policy recomputation
            $businessNowLocked = new DateTime('now', $tz);
            $todayLocked = $businessNowLocked->format('Y-m-d');
            $lastBookableDateLocked = (clone $businessNowLocked)->modify('+' . (self::BOOKING_HORIZON_DAYS - 1) . ' days')->format('Y-m-d');
            $minimumBookableAtLocked = (clone $businessNowLocked)->modify('+' . self::MINIMUM_NOTICE_MINUTES . ' minutes');

            if ($dateStr < $todayLocked || $dateStr > $lastBookableDateLocked) {
                $this->db->rollBack();
                Response::error('Appointment date is outside the 14-day booking horizon.', 'BOOKING_SLOT_UNAVAILABLE', 409);
            }

            if ($startsDt < $minimumBookableAtLocked) {
                $this->db->rollBack();
                Response::error('Appointment does not satisfy minimum notice period of 120 minutes.', 'BOOKING_SLOT_UNAVAILABLE', 409);
            }

            // STEP 5: Validate trainer weekly availability window & slot alignment
            $dayOfWeek = (int)$startsDt->format('N');
            $wStmt = $this->db->prepare("
                SELECT start_time, end_time
                FROM trainer_availability_windows
                WHERE trainer_id = ? AND day_of_week = ?
                ORDER BY start_time ASC
            ");
            $wStmt->execute([$trainerId, $dayOfWeek]);
            $windows = $wStmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($windows)) {
                $this->db->rollBack();
                Response::error('Trainer has no working hours on this day.', 'BOOKING_SLOT_UNAVAILABLE', 409);
            }

            $slotMatched = false;
            foreach ($windows as $win) {
                $sParts = explode(':', $win['start_time']);
                $startMinutes = (int)$sParts[0] * 60 + (int)$sParts[1];
                $eParts = explode(':', $win['end_time']);
                $endMinutes = (int)$eParts[0] * 60 + (int)$eParts[1];

                for ($cur = $startMinutes; $cur + self::SLOT_DURATION_MINUTES <= $endMinutes; $cur += self::SLOT_STEP_MINUTES) {
                    $slotStartH = intdiv($cur, 60);
                    $slotStartM = $cur % 60;
                    $slotEndTotal = $cur + self::SLOT_DURATION_MINUTES;
                    $slotEndH = intdiv($slotEndTotal, 60);
                    $slotEndM = $slotEndTotal % 60;

                    if ($slotEndTotal > 1440) {
                        continue;
                    }

                    $candidateStart = sprintf('%s %02d:%02d:00', $dateStr, $slotStartH, $slotStartM);
                    $candidateEnd = sprintf('%s %02d:%02d:00', $dateStr, $slotEndH, $slotEndM);

                    if ($candidateStart === $startsAtStr && $candidateEnd === $endsAtStr) {
                        $slotMatched = true;
                        break 2;
                    }
                }
            }

            if (!$slotMatched) {
                $this->db->rollBack();
                Response::error('Selected time is not a valid bookable working hours slot.', 'BOOKING_SLOT_UNAVAILABLE', 409);
            }

            // STEP 6: Validate trainer unavailability blocks
            $unavailStmt = $this->db->prepare("
                SELECT id
                FROM trainer_unavailability_blocks
                WHERE trainer_id = ?
                  AND starts_at < ?
                  AND ends_at > ?
            ");
            $unavailStmt->execute([$trainerId, $endsAtStr, $startsAtStr]);
            if ($unavailStmt->fetch()) {
                $this->db->rollBack();
                Response::error('Trainer is unavailable at the selected time.', 'BOOKING_SLOT_UNAVAILABLE', 409);
            }

            // STEP 7: Validate trainer conflict (scheduled appointments overlapping, FOR UPDATE)
            $tConfStmt = $this->db->prepare("
                SELECT id
                FROM appointments
                WHERE trainer_id = ?
                  AND status = 'scheduled'
                  AND starts_at < ?
                  AND ends_at > ?
                FOR UPDATE
            ");
            $tConfStmt->execute([$trainerId, $endsAtStr, $startsAtStr]);
            if ($tConfStmt->fetch()) {
                $this->db->rollBack();
                Response::error('Trainer is already booked for this time.', 'TRAINER_CONFLICT', 409);
            }

            // STEP 8: Validate member conflict (scheduled appointments overlapping, FOR UPDATE)
            $mConfStmt = $this->db->prepare("
                SELECT id
                FROM appointments
                WHERE member_id = ?
                  AND status = 'scheduled'
                  AND starts_at < ?
                  AND ends_at > ?
                FOR UPDATE
            ");
            $mConfStmt->execute([$this->memberId, $endsAtStr, $startsAtStr]);
            if ($mConfStmt->fetch()) {
                $this->db->rollBack();
                Response::error('Member already has an appointment scheduled at this time.', 'MEMBER_CONFLICT', 409);
            }

            // STEP 9: Lock session package FOR UPDATE (canonical lock order: after conflict locks)
            $pkgStmt = $this->db->prepare("
                SELECT id, member_id, session_package_id, total_sessions, valid_from, valid_until, status
                FROM member_session_packages
                WHERE id = ?
                FOR UPDATE
            ");
            $pkgStmt->execute([$packageId]);
            $pkg = $pkgStmt->fetch(PDO::FETCH_ASSOC);

            if (!$pkg || (int)$pkg['member_id'] !== $this->memberId) {
                $this->db->rollBack();
                Response::error('Session package is ineligible.', 'SESSION_PACKAGE_INELIGIBLE', 409);
            }

            if ($pkg['status'] !== 'active') {
                $this->db->rollBack();
                Response::error('Session package is not active.', 'SESSION_PACKAGE_INELIGIBLE', 409);
            }

            if ($pkg['valid_from'] > $dateStr || ($pkg['valid_until'] !== null && $pkg['valid_until'] < $dateStr)) {
                $this->db->rollBack();
                Response::error('Appointment date is outside session package validity window.', 'SESSION_PACKAGE_INELIGIBLE', 409);
            }

            // Fail-closed ledger integrity check for member's active packages with scheduled appointments
            $chkStmt = $this->db->prepare("
                SELECT a.id as appointment_id,
                       COALESCE(SUM(CASE WHEN l.entry_type = 'reserve' THEN 1 ELSE 0 END), 0) as res_count,
                       COALESCE(SUM(CASE WHEN l.entry_type = 'release' THEN 1 ELSE 0 END), 0) as rel_count
                FROM appointments a
                LEFT JOIN member_session_package_ledger l 
                  ON l.member_session_package_id = a.member_session_package_id 
                 AND l.appointment_id = a.id
                WHERE a.member_session_package_id = ?
                  AND a.status = 'scheduled'
                GROUP BY a.id
            ");
            $chkStmt->execute([$packageId]);
            $pkgLedgerRows = $chkStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($pkgLedgerRows as $chk) {
                if ((int)$chk['res_count'] !== 1 || (int)$chk['rel_count'] !== 0) {
                    $this->db->rollBack();
                    Response::error('Session package ledger is inconsistent.', 'SESSION_PACKAGE_LEDGER_INCONSISTENT', 409);
                }
            }

            // Check remaining session balance
            $ledgerBalStmt = $this->db->prepare("
                SELECT COALESCE(SUM(delta), 0) as used_delta
                FROM member_session_package_ledger
                WHERE member_session_package_id = ?
            ");
            $ledgerBalStmt->execute([$packageId]);
            $ledgerBal = $ledgerBalStmt->fetch(PDO::FETCH_ASSOC);

            $remaining = (int)$pkg['total_sessions'] + (int)$ledgerBal['used_delta'];
            if ($remaining <= 0) {
                $this->db->rollBack();
                Response::error('Session package is exhausted.', 'SESSION_PACKAGE_EXHAUSTED', 409);
            }

            // STEP 10: Atomic insert into appointments with member account creator attribution
            $apptUuid = $this->generateUuid();
            $insApptStmt = $this->db->prepare("
                INSERT INTO appointments (
                    uuid, member_id, trainer_id, member_session_package_id,
                    starts_at, ends_at, status, created_by, created_by_member_account_id
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, 'scheduled', NULL, ?
                )
            ");
            $insApptStmt->bindValue(1, $apptUuid, PDO::PARAM_STR);
            $insApptStmt->bindValue(2, $this->memberId, PDO::PARAM_INT);
            $insApptStmt->bindValue(3, $trainerId, PDO::PARAM_INT);
            $insApptStmt->bindValue(4, $packageId, PDO::PARAM_INT);
            $insApptStmt->bindValue(5, $startsAtStr, PDO::PARAM_STR);
            $insApptStmt->bindValue(6, $endsAtStr, PDO::PARAM_STR);
            $insApptStmt->bindValue(7, $this->accountId, PDO::PARAM_INT);
            $insApptStmt->execute();

            $appointmentId = (int)$this->db->lastInsertId();

            // STEP 11: Atomic insert into member_session_package_ledger (reserve -1) with member account creator attribution
            $ledgerUuid = $this->generateUuid();
            $insLedgerStmt = $this->db->prepare("
                INSERT INTO member_session_package_ledger (
                    uuid, member_session_package_id, appointment_id,
                    entry_type, delta, created_by, created_by_member_account_id
                ) VALUES (
                    ?, ?, ?,
                    'reserve', -1, NULL, ?
                )
            ");
            $insLedgerStmt->bindValue(1, $ledgerUuid, PDO::PARAM_STR);
            $insLedgerStmt->bindValue(2, $packageId, PDO::PARAM_INT);
            $insLedgerStmt->bindValue(3, $appointmentId, PDO::PARAM_INT);
            $insLedgerStmt->bindValue(4, $this->accountId, PDO::PARAM_INT);
            $insLedgerStmt->execute();

            // Retrieve persisted appointment
            $fetchStmt = $this->db->prepare("
                SELECT id, uuid, member_id, trainer_id, member_session_package_id, starts_at, ends_at, status
                FROM appointments
                WHERE id = ?
            ");
            $fetchStmt->execute([$appointmentId]);
            $persisted = $fetchStmt->fetch(PDO::FETCH_ASSOC);

            if (!$persisted) {
                $this->db->rollBack();
                Response::error('Failed to retrieve persisted appointment.', 'INTERNAL_ERROR', 500);
            }

            $this->db->commit();

            Response::json([
                'appointment' => [
                    'id' => (int)$persisted['id'],
                    'uuid' => $persisted['uuid'],
                    'member_id' => (int)$persisted['member_id'],
                    'trainer_id' => (int)$persisted['trainer_id'],
                    'member_session_package_id' => (int)$persisted['member_session_package_id'],
                    'starts_at' => $persisted['starts_at'],
                    'ends_at' => $persisted['ends_at'],
                    'status' => $persisted['status']
                ]
            ], 201);

        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log("Member Appointment Create Error: " . $e->getMessage());
            Response::error('An unexpected error occurred.', 'INTERNAL_ERROR', 500);
        }
    }
}
