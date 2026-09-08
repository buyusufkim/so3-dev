const fs = require('fs');
const file = 'api/controllers/AdminController.php';
let content = fs.readFileSync(file, 'utf8');

const operationalMethod = `
    public function operationalDashboard()
    {
        \\Middleware\\AuthMiddleware::hasRole(['super_admin', 'admin']);

        $dbStatus = 'unavailable';
        try {
            $db = \\Core\\Database::getInstance()->getConnection();
            $stmt = $db->query("SELECT 1");
            if ($stmt && (int)$stmt->fetchColumn() === 1) {
                $dbStatus = 'connected';
            }
        } catch (\\Exception $e) {
            $dbStatus = 'unavailable';
        }

        $activeMembers = 0;
        $currentOccupancy = 0;
        $visitsToday = 0;
        $renewalsToday = 0;
        $appointmentsToday = [
            'total' => 0,
            'scheduled' => 0,
            'completed' => 0,
            'cancelled' => 0,
            'no_show' => 0
        ];

        if ($dbStatus === 'connected') {
            $tz = new \\DateTimeZone('Europe/Istanbul');
            $startOfDay = new \\DateTime('today', $tz);
            $endOfDay = new \\DateTime('tomorrow', $tz);

            $startStr = $startOfDay->format('Y-m-d H:i:s');
            $endStr = $endOfDay->format('Y-m-d H:i:s');

            try {
                $stmt = $db->query("SELECT COUNT(*) FROM members WHERE status = 'active' AND deleted_at IS NULL");
                if ($stmt) $activeMembers = (int)$stmt->fetchColumn();
            } catch (\\Exception $e) {}

            try {
                $stmt = $db->query("SELECT COUNT(*) FROM member_visits WHERE checked_out_at IS NULL");
                if ($stmt) $currentOccupancy = (int)$stmt->fetchColumn();
            } catch (\\Exception $e) {}

            try {
                $stmt = $db->prepare("SELECT COUNT(*) FROM member_visits WHERE checked_in_at >= ? AND checked_in_at < ?");
                $stmt->execute([$startStr, $endStr]);
                $visitsToday = (int)$stmt->fetchColumn();
            } catch (\\Exception $e) {}

            try {
                $stmt = $db->prepare("SELECT COUNT(*) FROM membership_renewals WHERE created_at >= ? AND created_at < ?");
                $stmt->execute([$startStr, $endStr]);
                $renewalsToday = (int)$stmt->fetchColumn();
            } catch (\\Exception $e) {}

            try {
                $stmt = $db->prepare("
                    SELECT 
                        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_count,
                        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
                        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show_count,
                        COUNT(*) as total_count
                    FROM appointments 
                    WHERE starts_at >= ? AND starts_at < ?
                ");
                $stmt->execute([$startStr, $endStr]);
                $row = $stmt->fetch(\\PDO::FETCH_ASSOC);
                if ($row) {
                    $appointmentsToday = [
                        'total' => (int)($row['total_count'] ?? 0),
                        'scheduled' => (int)($row['scheduled_count'] ?? 0),
                        'completed' => (int)($row['completed_count'] ?? 0),
                        'cancelled' => (int)($row['cancelled_count'] ?? 0),
                        'no_show' => (int)($row['no_show_count'] ?? 0),
                    ];
                }
            } catch (\\Exception $e) {}
        }

        \\Core\\Response::json([
            'metrics' => [
                'active_members' => $activeMembers,
                'current_occupancy' => $currentOccupancy,
                'visits_today' => $visitsToday,
                'renewals_today' => $renewalsToday,
                'appointments_today' => $appointmentsToday,
            ]
        ]);
    }
`;

const pos = content.lastIndexOf('}');
if (pos !== -1) {
    content = content.substring(0, pos) + operationalMethod + "\\n}\\n";
    fs.writeFileSync(file, content);
}
