<?php

require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../middleware/MemberAuthMiddleware.php';

class MemberPortalController
{
    private $db;
    private $memberId;
    private $accountId;

    public function __construct()
    {
        $this->db = \Database::getInstance();
    }

    private function guard()
    {
        \MemberAuthMiddleware::handle();
        $this->memberId = $_SESSION['member_id'];
        $this->accountId = $_SESSION['member_account_id'];

        $stmt = $this->db->prepare("SELECT must_change_password FROM member_accounts WHERE id = :id");
        $stmt->execute([':id' => $this->accountId]);
        $account = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($account && $account['must_change_password'] == 1) {
            \Response::error('Devam etmek için önce şifrenizi değiştirmeniz gerekiyor.', 'PASSWORD_CHANGE_REQUIRED', 403);
        }
    }

    public function getOverview()
    {
        $this->guard();

        $stmt = $this->db->prepare("SELECT id, uuid, first_name, last_name, phone, email, trainer_id FROM members WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':id' => $this->memberId]);
        $member = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$member) {
            \Response::error('Üye bulunamadı.', 'UNAUTHORIZED', 401);
        }

        $trainerId = $member['trainer_id'];
        unset($member['trainer_id']);

        $stmt = $this->db->prepare("SELECT start_date, end_date FROM memberships WHERE member_id = :id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1");
        $stmt->execute([':id' => $this->memberId]);
        $membershipData = $stmt->fetch(\PDO::FETCH_ASSOC);

        $membership = [
            'start_date' => null,
            'end_date' => null,
            'status' => 'not_set'
        ];

        if ($membershipData) {
            $membership['start_date'] = $membershipData['start_date'];
            $membership['end_date'] = $membershipData['end_date'];

            $tz = new \DateTimeZone('Europe/Istanbul');
            $today = new \DateTime('now', $tz);
            $todayStr = $today->format('Y-m-d');
            
            if ($membership['start_date'] === null && $membership['end_date'] === null) {
                $membership['status'] = 'not_set';
            } elseif ($membership['start_date'] !== null && $membership['end_date'] !== null) {
                if ($membership['start_date'] > $todayStr) {
                    $membership['status'] = 'upcoming';
                } elseif ($membership['end_date'] < $todayStr) {
                    $membership['status'] = 'expired';
                } else {
                    $membership['status'] = 'active';
                }
            } else {
                 \Response::error('MEMBER_MEMBERSHIP_DATA_INCONSISTENT', 'MEMBER_MEMBERSHIP_DATA_INCONSISTENT', 409);
            }
        }

        $trainer = null;
        if ($trainerId) {
            $stmt = $this->db->prepare("SELECT id, uuid, first_name, last_name, role_title FROM trainers WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute([':id' => $trainerId]);
            $t = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($t) {
                $trainer = [
                    'id' => (int)$t['id'],
                    'uuid' => $t['uuid'],
                    'name' => trim($t['first_name'] . ' ' . $t['last_name']),
                    'role_title' => $t['role_title']
                ];
            }
        }

        // Return int casting for id
        $member['id'] = (int)$member['id'];

        \Response::json([
            'member' => $member,
            'membership' => $membership,
            'trainer' => $trainer
        ]);
    }

    public function getSessionPackages()
    {
        $this->guard();

        $stmt = $this->db->prepare("
            SELECT id, uuid, package_name_snapshot, total_sessions, status, valid_from, valid_until, created_at
            FROM member_session_packages 
            WHERE member_id = :id 
        ");
        $stmt->execute([':id' => $this->memberId]);
        $packages = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $items = [];
        $tz = new \DateTimeZone('Europe/Istanbul');
        $todayStr = (new \DateTime('now', $tz))->format('Y-m-d');

        foreach ($packages as $pkg) {
            $pkgId = $pkg['id'];
            
            $stmtLedger = $this->db->prepare("SELECT SUM(delta) as total_delta FROM member_session_package_ledger WHERE member_session_package_id = :pkgId");
            $stmtLedger->execute([':pkgId' => $pkgId]);
            $ledgerData = $stmtLedger->fetch(\PDO::FETCH_ASSOC);
            $totalDelta = $ledgerData['total_delta'] ? (int)$ledgerData['total_delta'] : 0;
            $remainingSessions = (int)$pkg['total_sessions'] + $totalDelta;

            $stmtReserved = $this->db->prepare("SELECT COUNT(*) as reserved FROM appointments WHERE member_session_package_id = :pkgId AND status = 'scheduled'");
            $stmtReserved->execute([':pkgId' => $pkgId]);
            $reservedSessions = (int)$stmtReserved->fetchColumn();

            $stmtCheckIntegrity = $this->db->prepare("
                SELECT a.id, 
                       (SELECT COUNT(*) FROM member_session_package_ledger l WHERE l.appointment_id = a.id AND l.entry_type = 'reserve') as reserve_cnt,
                       (SELECT COUNT(*) FROM member_session_package_ledger l WHERE l.appointment_id = a.id AND l.entry_type = 'release') as release_cnt
                FROM appointments a
                WHERE a.member_session_package_id = :pkgId AND a.status = 'scheduled'
            ");
            $stmtCheckIntegrity->execute([':pkgId' => $pkgId]);
            $integrityData = $stmtCheckIntegrity->fetchAll(\PDO::FETCH_ASSOC);
            foreach ($integrityData as $idata) {
                if ($idata['reserve_cnt'] != 1 || $idata['release_cnt'] != 0) {
                    \Response::error('SESSION_PACKAGE_LEDGER_INCONSISTENT', 'SESSION_PACKAGE_LEDGER_INCONSISTENT', 409);
                }
            }

            $storedStatus = $pkg['status'];
            $effectiveStatus = 'active';

            if ($storedStatus === 'cancelled') {
                $effectiveStatus = 'cancelled';
            } elseif ($pkg['valid_until'] !== null && $todayStr > $pkg['valid_until']) {
                $effectiveStatus = 'expired';
            } elseif ($remainingSessions <= 0) {
                $effectiveStatus = 'exhausted';
            }

            $items[] = [
                'id' => (int)$pkg['id'],
                'uuid' => $pkg['uuid'],
                'package_name' => $pkg['package_name_snapshot'],
                'total_sessions' => (int)$pkg['total_sessions'],
                'remaining_sessions' => $remainingSessions,
                'reserved_sessions' => $reservedSessions,
                'valid_from' => $pkg['valid_from'],
                'valid_until' => $pkg['valid_until'],
                'stored_status' => $storedStatus,
                'effective_status' => $effectiveStatus,
                'created_at' => $pkg['created_at']
            ];
        }

        usort($items, function($a, $b) {
            $statusOrder = ['active' => 1, 'expired' => 2, 'exhausted' => 3, 'cancelled' => 4];
            $orderA = $statusOrder[$a['effective_status']];
            $orderB = $statusOrder[$b['effective_status']];

            if ($orderA !== $orderB) return $orderA <=> $orderB;

            if ($a['valid_until'] !== $b['valid_until']) {
                if ($a['valid_until'] === null) return 1;
                if ($b['valid_until'] === null) return -1;
                return strcmp($a['valid_until'], $b['valid_until']);
            }

            if ($a['created_at'] !== $b['created_at']) {
                return strcmp($b['created_at'], $a['created_at']);
            }

            return $b['id'] <=> $a['id'];
        });

        $items = array_map(function($item) {
            unset($item['created_at']);
            return $item;
        }, $items);

        \Response::json(['items' => $items]);
    }

    public function getAppointments()
    {
        $this->guard();

        $tz = new \DateTimeZone('Europe/Istanbul');
        $businessNow = (new \DateTime('now', $tz))->format('Y-m-d H:i:s');

        $stmt = $this->db->prepare("
            SELECT a.id, a.uuid, a.starts_at, a.ends_at, a.status, a.cancellation_reason, a.trainer_id, a.member_session_package_id,
                   t.uuid as trainer_uuid, t.first_name as trainer_first, t.last_name as trainer_last, t.role_title as trainer_role,
                   msp.package_name_snapshot
            FROM appointments a
            LEFT JOIN trainers t ON a.trainer_id = t.id
            LEFT JOIN member_session_packages msp ON a.member_session_package_id = msp.id
            WHERE a.member_id = :id
        ");
        $stmt->execute([':id' => $this->memberId]);
        $all = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $upcoming = [];
        $recent = [];

        foreach ($all as $a) {
            $isUpcoming = ($a['status'] === 'scheduled' && $a['starts_at'] >= $businessNow);
            
            $trainer = null;
            if ($a['trainer_id']) {
                $trainer = [
                    'id' => (int)$a['trainer_id'],
                    'uuid' => $a['trainer_uuid'],
                    'name' => trim($a['trainer_first'] . ' ' . $a['trainer_last']),
                    'role_title' => $a['trainer_role']
                ];
            }

            $sessionPackage = null;
            if ($a['member_session_package_id']) {
                $sessionPackage = [
                    'id' => (int)$a['member_session_package_id'],
                    'package_name' => $a['package_name_snapshot']
                ];
            }

            $item = [
                'id' => (int)$a['id'],
                'uuid' => $a['uuid'],
                'starts_at' => $a['starts_at'],
                'ends_at' => $a['ends_at'],
                'status' => $a['status'],
                'cancellation_reason' => ($a['status'] === 'cancelled') ? $a['cancellation_reason'] : null,
                'trainer' => $trainer,
                'session_package' => $sessionPackage
            ];

            if ($isUpcoming) {
                $upcoming[] = $item;
            } else {
                $recent[] = $item;
            }
        }

        usort($upcoming, function($a, $b) {
            if ($a['starts_at'] !== $b['starts_at']) return strcmp($a['starts_at'], $b['starts_at']);
            return $a['id'] <=> $b['id'];
        });

        usort($recent, function($a, $b) {
            if ($a['starts_at'] !== $b['starts_at']) return strcmp($b['starts_at'], $a['starts_at']);
            return $b['id'] <=> $a['id'];
        });

        $upcoming = array_slice($upcoming, 0, 20);
        $recent = array_slice($recent, 0, 20);

        \Response::json([
            'upcoming' => $upcoming,
            'recent' => $recent
        ]);
    }

    public function getTrainingPrograms()
    {
        $this->guard();

        $stmt = $this->db->prepare("
            SELECT tp.id, tp.uuid, tp.title, tp.start_date, tp.end_date, tp.created_at, tp.trainer_id,
                   t.uuid as trainer_uuid, t.first_name as trainer_first, t.last_name as trainer_last, t.role_title as trainer_role
            FROM training_programs tp
            LEFT JOIN trainers t ON tp.trainer_id = t.id
            WHERE tp.member_id = :id AND tp.status = 'active' AND tp.deleted_at IS NULL
        ");
        $stmt->execute([':id' => $this->memberId]);
        $programs = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $items = [];
        foreach ($programs as $p) {
            $trainer = null;
            if ($p['trainer_id']) {
                $trainer = [
                    'id' => (int)$p['trainer_id'],
                    'uuid' => $p['trainer_uuid'],
                    'name' => trim($p['trainer_first'] . ' ' . $p['trainer_last']),
                    'role_title' => $p['trainer_role']
                ];
            }

            $stmtEx = $this->db->prepare("
                SELECT id, exercise_name, sets, repetitions, duration_seconds, rest_seconds, instructions, sort_order
                FROM program_exercises
                WHERE training_program_id = :pid
                ORDER BY sort_order ASC, id ASC
            ");
            $stmtEx->execute([':pid' => $p['id']]);
            $exercises = $stmtEx->fetchAll(\PDO::FETCH_ASSOC);
            
            $formattedEx = [];
            foreach ($exercises as $ex) {
                $formattedEx[] = [
                    'id' => (int)$ex['id'],
                    'exercise_name' => $ex['exercise_name'],
                    'sets' => $ex['sets'] !== null ? (int)$ex['sets'] : null,
                    'repetitions' => $ex['repetitions'] !== null ? (int)$ex['repetitions'] : null,
                    'duration_seconds' => $ex['duration_seconds'] !== null ? (int)$ex['duration_seconds'] : null,
                    'rest_seconds' => $ex['rest_seconds'] !== null ? (int)$ex['rest_seconds'] : null,
                    'instructions' => $ex['instructions'],
                    'sort_order' => (int)$ex['sort_order']
                ];
            }

            $items[] = [
                'id' => (int)$p['id'],
                'uuid' => $p['uuid'],
                'title' => $p['title'],
                'start_date' => $p['start_date'],
                'end_date' => $p['end_date'],
                'created_at' => $p['created_at'],
                'trainer' => $trainer,
                'exercises' => $formattedEx
            ];
        }

        usort($items, function($a, $b) {
            if ($a['start_date'] !== $b['start_date']) {
                if ($a['start_date'] === null) return 1;
                if ($b['start_date'] === null) return -1;
                return strcmp($b['start_date'], $a['start_date']);
            }
            if ($a['created_at'] !== $b['created_at']) {
                return strcmp($b['created_at'], $a['created_at']);
            }
            return $b['id'] <=> $a['id'];
        });

        $items = array_map(function($i) { unset($i['created_at']); return $i; }, $items);

        \Response::json(['items' => $items]);
    }
}
