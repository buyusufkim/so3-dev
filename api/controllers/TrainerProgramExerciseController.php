<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\AuthMiddleware;
use Core\AuditLogger;
use PDO;

class TrainerProgramExerciseController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function getTrainerProfileId(): int {
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
        $stmt->bindValue(1, $adminId, \PDO::PARAM_INT);
        $stmt->execute();
        $trainer = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$trainer) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }
        return (int)$trainer['id'];
    }

    private function getTrainerProfileIdForUpdate(): int {
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
        $stmt->bindValue(1, $adminId, \PDO::PARAM_INT);
        $stmt->execute();
        $trainer = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$trainer) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            Response::error('Bağlı ve aktif bir eğitmen profili bulunamadı.', 'TRAINER_PROFILE_NOT_LINKED', 403);
        }
        return (int)$trainer['id'];
    }

    private function getJsonPayload(): array {
        $contentType = $_SERVER["CONTENT_TYPE"] ?? '';
        if (strcasecmp(trim(explode(';', $contentType)[0]), 'application/json') !== 0) {
            Response::error('Yalnızca JSON kabul edilmektedir.', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        $raw = file_get_contents('php://input');
        if ($raw === false) {
            Response::error('Boş istek.', 'BAD_REQUEST', 400);
        }
        
        if (strlen($raw) > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }
        
        if (trim($raw) === '') {
            Response::error('Boş istek.', 'BAD_REQUEST', 400);
        }

        $isObj = json_decode($raw, false);
        if (json_last_error() !== JSON_ERROR_NONE || !is_object($isObj)) {
            Response::error('JSON bir obje olmalıdır.', 'BAD_REQUEST', 400);
        }

        $data = json_decode($raw, true);

        $allowlist = ['exercise_name', 'sets', 'repetitions', 'duration_seconds', 'rest_seconds', 'instructions', 'sort_order'];
        foreach (array_keys($data) as $key) {
            if (!in_array($key, $allowlist, true)) {
                Response::error("Geçersiz alan: $key", 'VALIDATION_ERROR', 422);
            }
        }
        return $data;
    }

    

    public function index($programId) {
        AuthMiddleware::hasRole(['trainer']);
        $trainerId = $this->getTrainerProfileId();
        $programId = (int)$programId;

        try {
            // Ownership validation
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
            $stmt->bindValue(1, $programId, \PDO::PARAM_INT);
            $stmt->bindValue(2, $trainerId, \PDO::PARAM_INT);
            $stmt->bindValue(3, $trainerId, \PDO::PARAM_INT);
            $stmt->execute();
            if (!$stmt->fetch()) {
                Response::error('Program bulunamadı.', 'NOT_FOUND', 404);
            }

            $stmt = $this->db->prepare("
                SELECT pe.id, pe.program_id, pe.exercise_name, pe.sets, pe.repetitions, 
                       pe.duration_seconds, pe.rest_seconds, pe.instructions, pe.sort_order, 
                       pe.created_at, pe.updated_at
                FROM program_exercises pe
                JOIN training_programs tp ON pe.program_id = tp.id
                JOIN members m ON tp.member_id = m.id
                WHERE pe.program_id = ?
                  AND tp.trainer_id = ?
                  AND tp.deleted_at IS NULL
                  AND m.trainer_id = ?
                  AND m.deleted_at IS NULL
                ORDER BY pe.sort_order ASC, pe.id ASC
            ");
            
            $stmt->bindValue(1, $programId, \PDO::PARAM_INT);
            $stmt->bindValue(2, $trainerId, \PDO::PARAM_INT);
            $stmt->bindValue(3, $trainerId, \PDO::PARAM_INT);
            $stmt->execute();
            
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $items = [];
            foreach ($results as $row) {
                $items[] = [
                    'id' => (int)$row['id'],
                    'program_id' => (int)$row['program_id'],
                    'exercise_name' => $row['exercise_name'],
                    'sets' => $row['sets'] !== null ? (int)$row['sets'] : null,
                    'repetitions' => $row['repetitions'],
                    'duration_seconds' => $row['duration_seconds'] !== null ? (int)$row['duration_seconds'] : null,
                    'rest_seconds' => $row['rest_seconds'] !== null ? (int)$row['rest_seconds'] : null,
                    'instructions' => $row['instructions'],
                    'sort_order' => (int)$row['sort_order'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at']
                ];
            }

            Response::json($items);
        } catch (\Throwable $e) {
            error_log('TrainerProgramExerciseController@index Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function create($programId) {
        AuthMiddleware::hasRole(['trainer']);
        $programId = (int)$programId;
        $val = $this->getJsonPayload();

        if (!array_key_exists('exercise_name', $val) || !is_string($val['exercise_name'])) {
            Response::error("exercise_name zorunludur ve metin olmalıdır.", 'VALIDATION_ERROR', 422);
        }
        $val['exercise_name'] = trim($val['exercise_name']);
        $len = mb_strlen($val['exercise_name'], 'UTF-8');
        if ($len < 1 || $len > 160) {
            Response::error("exercise_name 1-160 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
        }

        $sets = array_key_exists('sets', $val) ? $val['sets'] : null;
        if ($sets !== null) {
            if (!is_int($sets) || $sets < 1 || $sets > 65535) {
                Response::error("sets geçersiz.", 'VALIDATION_ERROR', 422);
            }
        }

        $repetitions = array_key_exists('repetitions', $val) ? $val['repetitions'] : null;
        if ($repetitions !== null) {
            if (!is_string($repetitions)) {
                Response::error("repetitions metin olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            if (mb_strlen($repetitions, 'UTF-8') > 40) {
                Response::error("repetitions çok uzun.", 'VALIDATION_ERROR', 422);
            }
        }

        $duration_seconds = array_key_exists('duration_seconds', $val) ? $val['duration_seconds'] : null;
        if ($duration_seconds !== null) {
            if (!is_int($duration_seconds) || $duration_seconds < 1 || $duration_seconds > 4294967295) {
                Response::error("duration_seconds geçersiz.", 'VALIDATION_ERROR', 422);
            }
        }

        $rest_seconds = array_key_exists('rest_seconds', $val) ? $val['rest_seconds'] : null;
        if ($rest_seconds !== null) {
            if (!is_int($rest_seconds) || $rest_seconds < 0 || $rest_seconds > 65535) {
                Response::error("rest_seconds geçersiz.", 'VALIDATION_ERROR', 422);
            }
        }

        $instructions = array_key_exists('instructions', $val) ? $val['instructions'] : null;
        if ($instructions !== null) {
            if (!is_string($instructions)) {
                Response::error("instructions metin olmalıdır.", 'VALIDATION_ERROR', 422);
            }
            if (mb_strlen($instructions, 'UTF-8') > 1000) {
                Response::error("instructions çok uzun.", 'VALIDATION_ERROR', 422);
            }
        }

        $sort_order = array_key_exists('sort_order', $val) ? $val['sort_order'] : 0;
        if (!is_int($sort_order) || $sort_order < 0 || $sort_order > 2147483647) {
            Response::error("sort_order 0 veya daha büyük tam sayı olmalıdır.", 'VALIDATION_ERROR', 422);
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
            $stmt->bindValue(1, $programId, \PDO::PARAM_INT);
            $stmt->bindValue(2, $trainerId, \PDO::PARAM_INT);
            $stmt->bindValue(3, $trainerId, \PDO::PARAM_INT);
            $stmt->execute();
            $program = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$program) {
                if ($this->db->inTransaction()) { $this->db->rollBack(); }
                Response::error("Program bulunamadı.", 'NOT_FOUND', 404);
            }

            $stmt = $this->db->prepare("
                INSERT INTO program_exercises 
                (program_id, exercise_name, sets, repetitions, duration_seconds, rest_seconds, instructions, sort_order) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $programId, 
                $val['exercise_name'], 
                $sets, 
                $repetitions, 
                $duration_seconds, 
                $rest_seconds, 
                $instructions, 
                $sort_order
            ]);

            $id = (int)$this->db->lastInsertId();
            $this->db->commit();
            
            $currentAdminId = (int)($_SESSION['admin_id'] ?? 0);
            try {
                AuditLogger::log(
                    'trainer_program_exercise.create',
                    $currentAdminId,
                    'program_exercise',
                    $id,
                    [
                        'exercise_id' => $id,
                        'program_id' => $programId,
                        'trainer_id' => $trainerId
                    ]
                );
            } catch (\Throwable $e) {}

            Response::json(['id' => $id, 'program_id' => $programId], 201);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('TrainerProgramExerciseController@create Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function update($id) {
        AuthMiddleware::hasRole(['trainer']);
        $id = (int)$id;
        $val = $this->getJsonPayload();
        
        if (empty($val)) {
            Response::error("Güncellenecek alan bulunamadı.", 'VALIDATION_ERROR', 422);
        }

        try {
            $this->db->beginTransaction();
            
            $trainerId = $this->getTrainerProfileIdForUpdate();
            
            $stmt = $this->db->prepare("
                SELECT pe.id, pe.program_id, pe.exercise_name, pe.sets, pe.repetitions, 
                       pe.duration_seconds, pe.rest_seconds, pe.instructions, pe.sort_order
                FROM program_exercises pe
                JOIN training_programs tp ON pe.program_id = tp.id
                JOIN members m ON tp.member_id = m.id
                WHERE pe.id = ? 
                  AND tp.trainer_id = ? 
                  AND tp.deleted_at IS NULL
                  AND m.trainer_id = ? 
                  AND m.deleted_at IS NULL
                FOR UPDATE
            ");
            $stmt->bindValue(1, $id, \PDO::PARAM_INT);
            $stmt->bindValue(2, $trainerId, \PDO::PARAM_INT);
            $stmt->bindValue(3, $trainerId, \PDO::PARAM_INT);
            $stmt->execute();
            $currentExercise = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$currentExercise) {
                if ($this->db->inTransaction()) { $this->db->rollBack(); }
                Response::error("Egzersiz bulunamadı.", 'NOT_FOUND', 404);
            }
            
            $programId = (int)$currentExercise['program_id'];

            $curr_exercise_name = $currentExercise['exercise_name'];
            $curr_sets = $currentExercise['sets'] !== null ? (int)$currentExercise['sets'] : null;
            $curr_repetitions = $currentExercise['repetitions'];
            $curr_duration = $currentExercise['duration_seconds'] !== null ? (int)$currentExercise['duration_seconds'] : null;
            $curr_rest = $currentExercise['rest_seconds'] !== null ? (int)$currentExercise['rest_seconds'] : null;
            $curr_instructions = $currentExercise['instructions'];
            $curr_sort = (int)$currentExercise['sort_order'];

            $updates = [];
            $params = [];
            $changedFields = [];

            if (array_key_exists('exercise_name', $val)) {
                if (!is_string($val['exercise_name'])) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("exercise_name metin olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                $trimmedName = trim($val['exercise_name']);
                $len = mb_strlen($trimmedName, 'UTF-8');
                if ($len < 1 || $len > 160) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("exercise_name 1-160 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                if ($trimmedName !== $curr_exercise_name) {
                    $updates[] = "exercise_name = ?";
                    $params[] = $trimmedName;
                    $changedFields[] = 'exercise_name';
                }
            }

            if (array_key_exists('sets', $val)) {
                $sets = $val['sets'];
                if ($sets !== null && (!is_int($sets) || $sets < 1 || $sets > 65535)) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("sets geçersiz.", 'VALIDATION_ERROR', 422);
                }
                if ($sets !== $curr_sets) {
                    $updates[] = "sets = ?";
                    $params[] = $sets;
                    $changedFields[] = 'sets';
                }
            }

            if (array_key_exists('repetitions', $val)) {
                $repetitions = $val['repetitions'];
                if ($repetitions !== null) {
                    if (!is_string($repetitions)) {
                        if ($this->db->inTransaction()) { $this->db->rollBack(); }
                        Response::error("repetitions metin olmalıdır.", 'VALIDATION_ERROR', 422);
                    }
                    if (mb_strlen($repetitions, 'UTF-8') > 40) {
                        if ($this->db->inTransaction()) { $this->db->rollBack(); }
                        Response::error("repetitions çok uzun.", 'VALIDATION_ERROR', 422);
                    }
                }
                if ($repetitions !== $curr_repetitions) {
                    $updates[] = "repetitions = ?";
                    $params[] = $repetitions;
                    $changedFields[] = 'repetitions';
                }
            }

            if (array_key_exists('duration_seconds', $val)) {
                $duration_seconds = $val['duration_seconds'];
                if ($duration_seconds !== null && (!is_int($duration_seconds) || $duration_seconds < 1 || $duration_seconds > 4294967295)) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("duration_seconds geçersiz.", 'VALIDATION_ERROR', 422);
                }
                if ($duration_seconds !== $curr_duration) {
                    $updates[] = "duration_seconds = ?";
                    $params[] = $duration_seconds;
                    $changedFields[] = 'duration_seconds';
                }
            }

            if (array_key_exists('rest_seconds', $val)) {
                $rest_seconds = $val['rest_seconds'];
                if ($rest_seconds !== null && (!is_int($rest_seconds) || $rest_seconds < 0 || $rest_seconds > 65535)) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("rest_seconds geçersiz.", 'VALIDATION_ERROR', 422);
                }
                if ($rest_seconds !== $curr_rest) {
                    $updates[] = "rest_seconds = ?";
                    $params[] = $rest_seconds;
                    $changedFields[] = 'rest_seconds';
                }
            }

            if (array_key_exists('instructions', $val)) {
                $instructions = $val['instructions'];
                if ($instructions !== null) {
                    if (!is_string($instructions)) {
                        if ($this->db->inTransaction()) { $this->db->rollBack(); }
                        Response::error("instructions metin olmalıdır.", 'VALIDATION_ERROR', 422);
                    }
                    if (mb_strlen($instructions, 'UTF-8') > 1000) {
                        if ($this->db->inTransaction()) { $this->db->rollBack(); }
                        Response::error("instructions çok uzun.", 'VALIDATION_ERROR', 422);
                    }
                }
                if ($instructions !== $curr_instructions) {
                    $updates[] = "instructions = ?";
                    $params[] = $instructions;
                    $changedFields[] = 'instructions';
                }
            }

            if (array_key_exists('sort_order', $val)) {
                $sort_order = $val['sort_order'];
                if (!is_int($sort_order) || $sort_order < 0 || $sort_order > 2147483647) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("sort_order 0 veya daha büyük tam sayı olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                if ($sort_order !== $curr_sort) {
                    $updates[] = "sort_order = ?";
                    $params[] = $sort_order;
                    $changedFields[] = 'sort_order';
                }
            }

            if (empty($updates)) {
                $this->db->commit();
                Response::json(['success' => true]);
            }

            $sql = "UPDATE program_exercises SET " . implode(", ", $updates) . " WHERE id = ? AND program_id = ?";
            $params[] = $id;
            $params[] = $programId;
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            if ($stmt->rowCount() !== 1) {
                if ($this->db->inTransaction()) { $this->db->rollBack(); }
                Response::error("Güncelleme işlemi başarısız.", 'INTERNAL_ERROR', 500);
            }

            $this->db->commit();

            $currentAdminId = (int)($_SESSION['admin_id'] ?? 0);
            try {
                AuditLogger::log(
                    'trainer_program_exercise.update',
                    $currentAdminId,
                    'program_exercise',
                    $id,
                    [
                        'exercise_id' => $id,
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
            error_log('TrainerProgramExerciseController@update Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function delete($id) {
        AuthMiddleware::hasRole(['trainer']);
        $id = (int)$id;

        try {
            $this->db->beginTransaction();
            
            $trainerId = $this->getTrainerProfileIdForUpdate();
            
            $stmt = $this->db->prepare("
                SELECT pe.id, pe.program_id 
                FROM program_exercises pe
                JOIN training_programs tp ON pe.program_id = tp.id
                JOIN members m ON tp.member_id = m.id
                WHERE pe.id = ? 
                  AND tp.trainer_id = ? 
                  AND tp.deleted_at IS NULL
                  AND m.trainer_id = ? 
                  AND m.deleted_at IS NULL
                FOR UPDATE
            ");
            $stmt->bindValue(1, $id, \PDO::PARAM_INT);
            $stmt->bindValue(2, $trainerId, \PDO::PARAM_INT);
            $stmt->bindValue(3, $trainerId, \PDO::PARAM_INT);
            $stmt->execute();
            $currentExercise = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$currentExercise) {
                if ($this->db->inTransaction()) { $this->db->rollBack(); }
                Response::error("Egzersiz bulunamadı.", 'NOT_FOUND', 404);
            }

            $programId = (int)$currentExercise['program_id'];

            $stmt = $this->db->prepare("DELETE FROM program_exercises WHERE id = ? AND program_id = ?");
            $stmt->bindValue(1, $id, \PDO::PARAM_INT);
            $stmt->bindValue(2, $programId, \PDO::PARAM_INT);
            $stmt->execute();

            if ($stmt->rowCount() !== 1) {
                if ($this->db->inTransaction()) { $this->db->rollBack(); }
                Response::error("Silme işlemi başarısız.", 'INTERNAL_ERROR', 500);
            }

            $this->db->commit();

            $currentAdminId = (int)($_SESSION['admin_id'] ?? 0);
            try {
                AuditLogger::log(
                    'trainer_program_exercise.delete',
                    $currentAdminId,
                    'program_exercise',
                    $id,
                    [
                        'exercise_id' => $id,
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
            error_log('TrainerProgramExerciseController@delete Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }
}
