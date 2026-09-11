<?php
$file = 'api/controllers/MemberPortalController.php';
$content = file_get_contents($file);

$measurementMethod = <<<'METHOD'
    public function getMeasurements()
    {
        $this->guard();

        $stmt = $this->db->prepare("
            SELECT mm.id, mm.uuid, mm.measured_at, mm.weight_kg, mm.body_fat_percent, mm.chest_cm, mm.waist_cm, mm.hip_cm, mm.arm_cm, mm.thigh_cm, mm.trainer_id,
                   t.uuid as trainer_uuid, t.name as trainer_name, t.role_title as trainer_role, t.deleted_at as trainer_deleted_at
            FROM member_measurements mm
            LEFT JOIN trainers t ON mm.trainer_id = t.id
            WHERE mm.member_id = :member_id AND mm.deleted_at IS NULL
            ORDER BY mm.measured_at DESC, mm.id DESC
            LIMIT 100
        ");
        $stmt->execute([':member_id' => $this->memberId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $items = [];
        foreach ($rows as $row) {
            $trainer = null;
            if ($row['trainer_id'] && $row['trainer_deleted_at'] === null) {
                $trainer = [
                    'id' => (int)$row['trainer_id'],
                    'uuid' => $row['trainer_uuid'],
                    'name' => $row['trainer_name'],
                    'role_title' => $row['trainer_role']
                ];
            }

            $items[] = [
                'id' => (int)$row['id'],
                'uuid' => $row['uuid'],
                'measured_at' => $row['measured_at'],
                'weight_kg' => $row['weight_kg'] !== null ? (float)$row['weight_kg'] : null,
                'body_fat_percent' => $row['body_fat_percent'] !== null ? (float)$row['body_fat_percent'] : null,
                'chest_cm' => $row['chest_cm'] !== null ? (float)$row['chest_cm'] : null,
                'waist_cm' => $row['waist_cm'] !== null ? (float)$row['waist_cm'] : null,
                'hip_cm' => $row['hip_cm'] !== null ? (float)$row['hip_cm'] : null,
                'arm_cm' => $row['arm_cm'] !== null ? (float)$row['arm_cm'] : null,
                'thigh_cm' => $row['thigh_cm'] !== null ? (float)$row['thigh_cm'] : null,
                'trainer' => $trainer
            ];
        }

        Response::json(['items' => $items]);
    }
}
METHOD;

$content = preg_replace('/\}\s*$/', "\n" . $measurementMethod, $content);
file_put_contents($file, $content);
echo "Added getMeasurements method\n";
