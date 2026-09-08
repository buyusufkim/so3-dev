const fs = require('fs');

const path = 'api/controllers/AdminController.php';
let content = fs.readFileSync(path, 'utf8');

// The original operationalDashboard logic to replace
const startIdx = content.indexOf('public function operationalDashboard()');
let endContent = content.substring(startIdx);

const replacement = `public function operationalDashboard()
    {
        \\Middleware\\AuthMiddleware::hasRole(['super_admin', 'admin']);

        try {
            $db = \\Core\\Database::getInstance()->getConnection();
        } catch (\\Exception $e) {
            \\Core\\Response::error('Veritabanı bağlantısı kurulamadı', 'DB_ERROR', 503);
            return;
        }

        try {
            $tz = new \\DateTimeZone('Europe/Istanbul');
            $startOfDay = new \\DateTime('today', $tz);
            $endOfDay = new \\DateTime('tomorrow', $tz);

            $startStr = $startOfDay->format('Y-m-d H:i:s');
            $endStr = $endOfDay->format('Y-m-d H:i:s');

            $stmt1 = $db->query("SELECT COUNT(*) FROM members WHERE status = 'active' AND deleted_at IS NULL");
            if (!$stmt1) throw new \\Exception("Query failed");
            $activeMembers = (int)$stmt1->fetchColumn();

            $stmt2 = $db->query("SELECT COUNT(*) FROM member_visits WHERE checked_out_at IS NULL");
            if (!$stmt2) throw new \\Exception("Query failed");
            $currentOccupancy = (int)$stmt2->fetchColumn();

            $stmt3 = $db->prepare("SELECT COUNT(*) FROM member_visits WHERE checked_in_at >= ? AND checked_in_at < ?");
            if (!$stmt3->execute([$startStr, $endStr])) throw new \\Exception("Query failed");
            $visitsToday = (int)$stmt3->fetchColumn();

            $stmt4 = $db->prepare("SELECT COUNT(*) FROM membership_renewals WHERE created_at >= ? AND created_at < ?");
            if (!$stmt4->execute([$startStr, $endStr])) throw new \\Exception("Query failed");
            $renewalsToday = (int)$stmt4->fetchColumn();

            $stmt5 = $db->prepare("
                SELECT 
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_count,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
                    SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show_count,
                    COUNT(*) as total_count
                FROM appointments 
                WHERE starts_at >= ? AND starts_at < ?
            ");
            if (!$stmt5->execute([$startStr, $endStr])) throw new \\Exception("Query failed");
            
            $row = $stmt5->fetch(\\PDO::FETCH_ASSOC);
            if (!$row) throw new \\Exception("Query failed");

            $appointmentsToday = [
                'total' => (int)($row['total_count'] ?? 0),
                'scheduled' => (int)($row['scheduled_count'] ?? 0),
                'completed' => (int)($row['completed_count'] ?? 0),
                'cancelled' => (int)($row['cancelled_count'] ?? 0),
                'no_show' => (int)($row['no_show_count'] ?? 0),
            ];

            \\Core\\Response::json([
                'metrics' => [
                    'active_members' => $activeMembers,
                    'current_occupancy' => $currentOccupancy,
                    'visits_today' => $visitsToday,
                    'renewals_today' => $renewalsToday,
                    'appointments_today' => $appointmentsToday,
                ]
            ]);
        } catch (\\Exception $e) {
            \\Core\\Response::error('Operasyonel veriler alınamadı: ' . $e->getMessage(), 'METRICS_FETCH_ERROR', 500);
        }
    }
}
`;

content = content.substring(0, startIdx) + replacement;

fs.writeFileSync(path, content);
