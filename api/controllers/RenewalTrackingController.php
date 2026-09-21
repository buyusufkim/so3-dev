<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use DateTimeImmutable;
use DateTimeZone;
use PDO;

class RenewalTrackingController
{
    public function index()
    {
        // 1. Strict query parameter allowlist
        $allowedKeys = ['bucket', 'window_days', 'page', 'per_page'];
        $requestKeys = array_keys($_GET);
        $extraKeys = array_diff($requestKeys, $allowedKeys);

        if (!empty($extraKeys)) {
            Response::error('Geçersiz sorgu parametresi.', 'VALIDATION_ERROR', 422);
            return;
        }

        // 2. Validate bucket
        $bucket = $_GET['bucket'] ?? 'all';
        if (!is_string($bucket) || !in_array($bucket, ['all', 'expired', 'today', 'upcoming'], true)) {
            Response::error('Geçersiz bucket parametresi.', 'VALIDATION_ERROR', 422);
            return;
        }

        // 3. Validate window_days (default 14, 1..90 canonical integer)
        $windowDays = 14;
        if (isset($_GET['window_days'])) {
            $rawWindow = $_GET['window_days'];
            if (!is_string($rawWindow) || !preg_match('/^[1-9]\d*$/', $rawWindow)) {
                Response::error('window_days pozitif bir tam sayı olmalıdır.', 'VALIDATION_ERROR', 422);
                return;
            }
            $windowDays = (int)$rawWindow;
            if ($windowDays < 1 || $windowDays > 90) {
                Response::error('window_days 1 ile 90 arasında olmalıdır.', 'VALIDATION_ERROR', 422);
                return;
            }
        }

        // 4. Validate page (default 1, >= 1 canonical integer)
        $page = 1;
        if (isset($_GET['page'])) {
            $rawPage = $_GET['page'];
            if (!is_string($rawPage) || !preg_match('/^[1-9]\d*$/', $rawPage)) {
                Response::error('page pozitif bir tam sayı olmalıdır.', 'VALIDATION_ERROR', 422);
                return;
            }
            $page = (int)$rawPage;
        }

        // 5. Validate per_page (default 20, 1..100 canonical integer)
        $perPage = 20;
        if (isset($_GET['per_page'])) {
            $rawPerPage = $_GET['per_page'];
            if (!is_string($rawPerPage) || !preg_match('/^[1-9]\d*$/', $rawPerPage)) {
                Response::error('per_page pozitif bir tam sayı olmalıdır.', 'VALIDATION_ERROR', 422);
                return;
            }
            $perPage = (int)$rawPerPage;
            if ($perPage < 1 || $perPage > 100) {
                Response::error('per_page 1 ile 100 arasında olmalıdır.', 'VALIDATION_ERROR', 422);
                return;
            }
        }

        // 6. Timezone and canonical business dates
        $tz = new DateTimeZone('Europe/Istanbul');
        $todayObj = new DateTimeImmutable('now', $tz);
        $today = $todayObj->format('Y-m-d');
        $todayMidnight = $todayObj->setTime(0, 0, 0);

        $futureBoundaryObj = $todayObj->modify("+{$windowDays} days");
        $futureBoundary = $futureBoundaryObj->format('Y-m-d');

        try {
            $db = Database::getInstance()->getConnection();

            // 7. Non-page-local summary query covering entire candidate scope
            // Scope: members.deleted_at IS NULL AND members.status = 'active' AND members.membership_end_date IS NOT NULL
            $summarySql = "SELECT 
                COUNT(CASE WHEN m.membership_end_date < :today_s1 THEN 1 END) AS expired_count,
                COUNT(CASE WHEN m.membership_end_date = :today_s2 THEN 1 END) AS today_count,
                COUNT(CASE WHEN m.membership_end_date > :today_s3 AND m.membership_end_date <= :future_boundary_s THEN 1 END) AS upcoming_count
            FROM members m
            WHERE m.deleted_at IS NULL
            AND m.status = 'active'
            AND m.membership_end_date IS NOT NULL";

            $summaryStmt = $db->prepare($summarySql);
            $summaryStmt->bindValue(':today_s1', $today, PDO::PARAM_STR);
            $summaryStmt->bindValue(':today_s2', $today, PDO::PARAM_STR);
            $summaryStmt->bindValue(':today_s3', $today, PDO::PARAM_STR);
            $summaryStmt->bindValue(':future_boundary_s', $futureBoundary, PDO::PARAM_STR);
            $summaryStmt->execute();

            $summaryRow = $summaryStmt->fetch(PDO::FETCH_ASSOC);

            $expiredCount = (int)($summaryRow['expired_count'] ?? 0);
            $todayCount = (int)($summaryRow['today_count'] ?? 0);
            $upcomingCount = (int)($summaryRow['upcoming_count'] ?? 0);
            $totalCount = $expiredCount + $todayCount + $upcomingCount;

            $summary = [
                'expired' => $expiredCount,
                'today' => $todayCount,
                'upcoming' => $upcomingCount,
                'total' => $totalCount,
            ];

            // 8. Pagination total based on the selected bucket
            $paginationTotal = match ($bucket) {
                'expired' => $expiredCount,
                'today' => $todayCount,
                'upcoming' => $upcomingCount,
                'all' => $totalCount,
            };

            $lastPage = $paginationTotal > 0 ? (int)ceil($paginationTotal / $perPage) : 1;
            $offset = ($page - 1) * $perPage;

            // 9. Build items query with deterministic ordering
            $whereClause = "m.deleted_at IS NULL AND m.status = 'active' AND m.membership_end_date IS NOT NULL";
            $bindings = [];

            if ($bucket === 'expired') {
                $whereClause .= " AND m.membership_end_date < :today_b";
                $bindings[':today_b'] = [$today, PDO::PARAM_STR];
                $orderBy = "ORDER BY m.membership_end_date DESC, m.id ASC";
            } elseif ($bucket === 'today') {
                $whereClause .= " AND m.membership_end_date = :today_b";
                $bindings[':today_b'] = [$today, PDO::PARAM_STR];
                $orderBy = "ORDER BY m.id ASC";
            } elseif ($bucket === 'upcoming') {
                $whereClause .= " AND m.membership_end_date > :today_b AND m.membership_end_date <= :future_boundary_b";
                $bindings[':today_b'] = [$today, PDO::PARAM_STR];
                $bindings[':future_boundary_b'] = [$futureBoundary, PDO::PARAM_STR];
                $orderBy = "ORDER BY m.membership_end_date ASC, m.id ASC";
            } else { // 'all'
                $whereClause .= " AND m.membership_end_date <= :future_boundary_b";
                $bindings[':future_boundary_b'] = [$futureBoundary, PDO::PARAM_STR];
                $bindings[':today_o1'] = [$today, PDO::PARAM_STR];
                $bindings[':today_o2'] = [$today, PDO::PARAM_STR];
                $bindings[':today_o3'] = [$today, PDO::PARAM_STR];
                $bindings[':today_o4'] = [$today, PDO::PARAM_STR];
                // Priority: 1: today, 2: upcoming nearest-first, 3: expired most-recent-first
                $orderBy = "ORDER BY 
                    CASE 
                        WHEN m.membership_end_date = :today_o1 THEN 1
                        WHEN m.membership_end_date > :today_o2 THEN 2
                        ELSE 3
                    END ASC,
                    CASE 
                        WHEN m.membership_end_date > :today_o3 THEN m.membership_end_date 
                    END ASC,
                    CASE 
                        WHEN m.membership_end_date < :today_o4 THEN m.membership_end_date 
                    END DESC,
                    m.id ASC";
            }

            $itemsSql = "SELECT 
                m.id, 
                m.uuid, 
                m.first_name, 
                m.last_name, 
                m.phone, 
                m.membership_start_date, 
                m.membership_end_date 
            FROM members m 
            WHERE {$whereClause} 
            {$orderBy} 
            LIMIT :limit OFFSET :offset";

            $itemsStmt = $db->prepare($itemsSql);
            foreach ($bindings as $key => [$val, $type]) {
                $itemsStmt->bindValue($key, $val, $type);
            }
            $itemsStmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
            $itemsStmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $itemsStmt->execute();

            $rows = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

            $items = [];
            foreach ($rows as $row) {
                $endDateObj = new DateTimeImmutable($row['membership_end_date'], $tz);
                $endMidnight = $endDateObj->setTime(0, 0, 0);
                $diff = $todayMidnight->diff($endMidnight);
                $daysUntilExpiry = (int)$diff->format('%r%a');

                if ($daysUntilExpiry < 0) {
                    $renewalState = 'expired';
                } elseif ($daysUntilExpiry === 0) {
                    $renewalState = 'today';
                } else {
                    $renewalState = 'upcoming';
                }

                $items[] = [
                    'id' => (int)$row['id'],
                    'uuid' => (string)$row['uuid'],
                    'first_name' => (string)$row['first_name'],
                    'last_name' => (string)$row['last_name'],
                    'phone' => (string)$row['phone'],
                    'membership_start_date' => $row['membership_start_date'] !== null ? (string)$row['membership_start_date'] : null,
                    'membership_end_date' => (string)$row['membership_end_date'],
                    'renewal_state' => $renewalState,
                    'days_until_expiry' => $daysUntilExpiry
                ];
            }

            Response::json([
                'as_of_date' => $today,
                'window_days' => $windowDays,
                'bucket' => $bucket,
                'summary' => $summary,
                'items' => $items,
                'pagination' => [
                    'total' => $paginationTotal,
                    'page' => $page,
                    'per_page' => $perPage,
                    'last_page' => $lastPage
                ]
            ]);
        } catch (\Exception $e) {
            error_log("RenewalTrackingController index error: " . $e->getMessage());
            Response::error('Üyelik yenileme takibi verileri alınırken bir hata oluştu.', 'INTERNAL_ERROR', 500);
        }
    }
}
