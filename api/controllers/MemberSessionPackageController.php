<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Core\AuditLogger;
use Middleware\AuthMiddleware;

class MemberSessionPackageController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function index($memberId)
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);

        // Validate member
        $stmt = $this->db->prepare("SELECT id FROM members WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':id' => $memberId]);
        if (!$stmt->fetch()) {
            Response::error('Member not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->db->prepare("
            SELECT 
                msp.id, msp.uuid, msp.session_package_id, msp.package_name_snapshot as package_name,
                msp.total_sessions, msp.valid_from, msp.valid_until, msp.status as stored_status,
                msp.created_at, msp.cancelled_at, msp.cancellation_reason,
                COALESCE(SUM(mspl.delta), 0) as ledger_delta
            FROM member_session_packages msp
            LEFT JOIN member_session_package_ledger mspl ON mspl.member_session_package_id = msp.id
            WHERE msp.member_id = :member_id
            GROUP BY msp.id
            ORDER BY msp.created_at DESC
        ");
        $stmt->execute([':member_id' => $memberId]);
        $packages = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $today = date('Y-m-d');

        foreach ($packages as &$pkg) {
            $pkg['id'] = (int)$pkg['id'];
            $pkg['session_package_id'] = $pkg['session_package_id'] !== null ? (int)$pkg['session_package_id'] : null;
            $pkg['total_sessions'] = (int)$pkg['total_sessions'];
            
            $delta = (int)$pkg['ledger_delta'];
            unset($pkg['ledger_delta']);
            
            $pkg['remaining_sessions'] = $pkg['total_sessions'] + $delta;
        }

        $reservedStmt = $this->db->prepare("
            SELECT member_session_package_id, COUNT(*) as reserved
            FROM appointments
            WHERE status = 'scheduled' AND member_session_package_id IN (
                SELECT id FROM member_session_packages WHERE member_id = :member_id
            )
            GROUP BY member_session_package_id
        ");
        $reservedStmt->execute([':member_id' => $memberId]);
        $reservedData = $reservedStmt->fetchAll(\PDO::FETCH_KEY_PAIR);

        foreach ($packages as &$pkg) {
            $pkg['reserved_sessions'] = isset($reservedData[$pkg['id']]) ? (int)$reservedData[$pkg['id']] : 0;

            $storedStatus = $pkg['stored_status'];
            $effectiveStatus = 'active';

            if ($storedStatus === 'cancelled') {
                $effectiveStatus = 'cancelled';
            } elseif ($pkg['valid_until'] !== null && $pkg['valid_until'] < $today) {
                $effectiveStatus = 'expired';
            } elseif ($pkg['remaining_sessions'] <= 0) {
                $effectiveStatus = 'exhausted';
            }

            $pkg['effective_status'] = $effectiveStatus;
        }

        Response::json($packages);
    }

    public function assign($memberId)
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $_SESSION['admin_id'];

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !is_array($input)) {
            Response::error('Invalid JSON payload', 'INVALID_JSON', 422);
        }

        // Strict allowlist
        $allowed = ['session_package_id', 'valid_from'];
        foreach (array_keys($input) as $key) {
            if (!in_array($key, $allowed)) {
                Response::error("Unknown field: $key", 'UNKNOWN_FIELD', 422);
            }
        }

        
        if (!isset($input['session_package_id']) || !is_int($input['session_package_id']) || $input['session_package_id'] <= 0) {
            Response::error('session_package_id must be a positive integer', 'VALIDATION_ERROR', 422);
        }
        
        if (!isset($input['valid_from']) || !is_string($input['valid_from'])) {
            Response::error('valid_from must be a string', 'VALIDATION_ERROR', 422);
        }

        // Strict date validation
        $d = \DateTime::createFromFormat('Y-m-d', $input['valid_from']);
        if (!$d || $d->format('Y-m-d') !== $input['valid_from']) {
            Response::error('valid_from must be a valid calendar date YYYY-MM-DD', 'VALIDATION_ERROR', 422);
        }


        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT id FROM members WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute([':id' => $memberId]);
            if (!$stmt->fetch()) {
                throw new \Exception('Member not found', 404);
            }

            $stmt = $this->db->prepare("SELECT name, session_count, validity_days, status FROM session_packages WHERE id = :id FOR UPDATE");
            $stmt->execute([':id' => $input['session_package_id']]);
            $package = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$package) {
                throw new \Exception('Session package not found', 404);
            }

            if ($package['status'] !== 'active') {
                throw new \Exception('Session package is inactive', 400);
            }

            $validUntil = null;
            if ($package['validity_days'] !== null) {
                $validUntil = date('Y-m-d', strtotime($input['valid_from'] . ' + ' . ($package['validity_days'] - 1) . ' days'));
            }

            $uuid = $this->generateUuid();

            $insertStmt = $this->db->prepare("
                INSERT INTO member_session_packages 
                (uuid, member_id, session_package_id, package_name_snapshot, total_sessions, valid_from, valid_until, status, assigned_by)
                VALUES (:uuid, :member_id, :session_package_id, :package_name, :total_sessions, :valid_from, :valid_until, 'active', :assigned_by)
            ");
            $insertStmt->execute([
                ':uuid' => $uuid,
                ':member_id' => $memberId,
                ':session_package_id' => $input['session_package_id'],
                ':package_name' => $package['name'],
                ':total_sessions' => $package['session_count'],
                ':valid_from' => $input['valid_from'],
                ':valid_until' => $validUntil,
                ':assigned_by' => $adminId
            ]);

            $newId = (int)$this->db->lastInsertId();

            AuditLogger::log('member_session_package.assign', $adminId, 'member_session_package', $newId, [
                'member_id' => $memberId,
                'session_package_id' => $input['session_package_id'],
                'total_sessions' => (int)$package['session_count'],
                'valid_from' => $input['valid_from'],
                'valid_until' => $validUntil
            ]);

            $this->db->commit();

            $this->returnMemberPackage($newId, 201);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if ($e->getCode() === 404) {
                Response::error($e->getMessage(), 'NOT_FOUND', 404);
            } elseif ($e->getCode() === 400) {
                Response::error($e->getMessage(), 'VALIDATION_ERROR', 400);
            } else {
                Response::error('An unexpected error occurred', 'SERVER_ERROR', 500);
            }
        }
    }

    public function cancel($id)
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $adminId = $_SESSION['admin_id'];

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !is_array($input)) {
            Response::error('Invalid JSON payload', 'INVALID_JSON', 422);
        }

        // Strict allowlist
        foreach (array_keys($input) as $key) {
            if ($key !== 'reason') {
                Response::error("Unknown field: $key", 'UNKNOWN_FIELD', 422);
            }
        }

        
        if (!isset($input['reason']) || !is_string($input['reason'])) {
            Response::error('Reason is required and must be a string', 'VALIDATION_ERROR', 422);
        }
        
        $reason = trim($input['reason']);
        if (mb_strlen($reason, 'UTF-8') < 1 || mb_strlen($reason, 'UTF-8') > 255) {
            Response::error('Reason must be between 1 and 255 characters', 'VALIDATION_ERROR', 422);
        }


        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("SELECT * FROM member_session_packages WHERE id = :id FOR UPDATE");
            $stmt->execute([':id' => $id]);
            $package = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$package) {
                throw new \Exception('Member session package not found', 404);
            }

            if ($package['status'] === 'cancelled') {
                throw new \Exception('Package is already cancelled', 409);
            }

            $schStmt = $this->db->prepare("SELECT id FROM appointments WHERE member_session_package_id = :id AND status = 'scheduled'");
            $schStmt->execute([':id' => $id]);
            $scheduledAppts = $schStmt->fetchAll(\PDO::FETCH_ASSOC);
            
            if (!empty($scheduledAppts)) {
                foreach ($scheduledAppts as $sappt) {
                    $chkStmt = $this->db->prepare("
                        SELECT 
                            SUM(CASE WHEN entry_type = 'reserve' THEN 1 ELSE 0 END) as res_count,
                            SUM(CASE WHEN entry_type = 'release' THEN 1 ELSE 0 END) as rel_count
                        FROM member_session_package_ledger
                        WHERE member_session_package_id = :pid AND appointment_id = :aid
                    ");
                    $chkStmt->execute([':pid' => $id, ':aid' => $sappt['id']]);
                    $chk = $chkStmt->fetch(\PDO::FETCH_ASSOC);
                    if ((int)$chk['res_count'] !== 1 || (int)$chk['rel_count'] !== 0) {
                        throw new \Exception('SESSION_PACKAGE_LEDGER_INCONSISTENT', 409);
                    }
                }
                throw new \Exception('PACKAGE_HAS_ACTIVE_RESERVATIONS', 409);
            }

            $updateStmt = $this->db->prepare("
                UPDATE member_session_packages 
                SET status = 'cancelled', cancelled_by = :cancelled_by, cancelled_at = NOW(), cancellation_reason = :reason
                WHERE id = :id
            ");
            $updateStmt->execute([
                ':cancelled_by' => $adminId,
                ':reason' => $reason,
                ':id' => $id
            ]);

            AuditLogger::log('member_session_package.cancel', $adminId, 'member_session_package', $id, [
                'reason' => $reason
            ]);

            $this->db->commit();
            $this->returnMemberPackage($id);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if ($e->getCode() === 404) {
                Response::error($e->getMessage(), 'NOT_FOUND', 404);
            } elseif ($e->getCode() === 409) {
                Response::error($e->getMessage(), $e->getMessage() === 'PACKAGE_HAS_ACTIVE_RESERVATIONS' ? 'PACKAGE_HAS_ACTIVE_RESERVATIONS' : 'CONFLICT', 409);
            } else {
                Response::error('An unexpected error occurred', 'SERVER_ERROR', 500);
            }
        }
    }
    
    public function ledger($id)
    {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        
        $chk = $this->db->prepare("SELECT id FROM member_session_packages WHERE id = :id");
        $chk->execute([':id' => $id]);
        if (!$chk->fetch()) {
            Response::error('Member session package not found', 'NOT_FOUND', 404);
        }

        $stmt = $this->db->prepare("
            SELECT mspl.id, mspl.uuid, mspl.appointment_id, mspl.entry_type, mspl.delta, mspl.reason, mspl.created_at, a.display_name as created_by_name
            FROM member_session_package_ledger mspl
            JOIN admins a ON a.id = mspl.created_by
            WHERE mspl.member_session_package_id = :id
            ORDER BY mspl.created_at DESC, mspl.id DESC
        ");
        $stmt->execute([':id' => $id]);
        $ledger = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        foreach ($ledger as &$l) {
            $l['id'] = (int)$l['id'];
            $l['appointment_id'] = $l['appointment_id'] !== null ? (int)$l['appointment_id'] : null;
            $l['delta'] = (int)$l['delta'];
        }
        
        Response::json($ledger);
    }

    private function returnMemberPackage($id, $statusCode = 200)
    {
        $stmt = $this->db->prepare("
            SELECT 
                msp.id, msp.uuid, msp.session_package_id, msp.package_name_snapshot as package_name,
                msp.total_sessions, msp.valid_from, msp.valid_until, msp.status as stored_status,
                msp.created_at, msp.cancelled_at, msp.cancellation_reason,
                COALESCE(SUM(mspl.delta), 0) as ledger_delta
            FROM member_session_packages msp
            LEFT JOIN member_session_package_ledger mspl ON mspl.member_session_package_id = msp.id
            WHERE msp.id = :id
            GROUP BY msp.id
        ");
        $stmt->execute([':id' => $id]);
        $pkg = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($pkg) {
            $pkg['id'] = (int)$pkg['id'];
            $pkg['session_package_id'] = $pkg['session_package_id'] !== null ? (int)$pkg['session_package_id'] : null;
            $pkg['total_sessions'] = (int)$pkg['total_sessions'];
            
            $delta = (int)$pkg['ledger_delta'];
            unset($pkg['ledger_delta']);
            
            $pkg['remaining_sessions'] = $pkg['total_sessions'] + $delta;
            
            $resStmt = $this->db->prepare("
                SELECT COUNT(*) as reserved
                FROM appointments 
                WHERE member_session_package_id = :id AND status = 'scheduled'
            ");
            $resStmt->execute([':id' => $id]);
            $resData = $resStmt->fetch(\PDO::FETCH_ASSOC);
            $pkg['reserved_sessions'] = (int)$resData['reserved'];

            $storedStatus = $pkg['stored_status'];
            $effectiveStatus = 'active';
            $today = date('Y-m-d');

            if ($storedStatus === 'cancelled') {
                $effectiveStatus = 'cancelled';
            } elseif ($pkg['valid_until'] !== null && $pkg['valid_until'] < $today) {
                $effectiveStatus = 'expired';
            } elseif ($pkg['remaining_sessions'] <= 0) {
                $effectiveStatus = 'exhausted';
            }

            $pkg['effective_status'] = $effectiveStatus;
        }

        Response::json($pkg, $statusCode);
    }

    private function generateUuid() {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
