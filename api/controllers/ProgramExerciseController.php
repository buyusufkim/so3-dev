<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use Middleware\AuthMiddleware;
use Core\AuditLogger;

class ProgramExerciseController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function getJsonInput(): array {
        $contentType = isset($_SERVER['CONTENT_TYPE']) ? trim($_SERVER['CONTENT_TYPE']) : '';
        if (strpos(strtolower($contentType), 'application/json') !== 0) {
            Response::error('Yalnızca JSON kabul edilmektedir.', 'UNSUPPORTED_MEDIA_TYPE', 415);
        }

        $raw = file_get_contents('php://input');
        if ($raw === false || empty(trim((string)$raw))) {
            Response::error('Boş istek.', 'BAD_REQUEST', 400);
        }
        
        if (strlen($raw) > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
        }

        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Geçersiz JSON formatı.', 'BAD_REQUEST', 400);
        }
        
        if (!is_array($data)) {
            Response::error('JSON bir obje olmalıdır.', 'BAD_REQUEST', 400);
        }

        return $data;
    }

    private function validateProgramExists($programId) {
        $stmt = $this->db->prepare("SELECT id FROM training_programs WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$programId]);
        if (!$stmt->fetchColumn()) {
            if ($this->db->inTransaction()) { $this->db->rollBack(); }
            Response::error("Program bulunamadı.", 'NOT_FOUND', 404);
        }
    }

    public function index($programId) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $programId = (int)$programId;
        
        try {
            $this->validateProgramExists($programId);

            $stmt = $this->db->prepare("
                SELECT id, program_id, exercise_name, sets, repetitions, duration_seconds, rest_seconds, instructions, sort_order, created_at, updated_at
                FROM program_exercises 
                WHERE program_id = ?
                ORDER BY sort_order ASC, id ASC
            ");
            $stmt->execute([$programId]);
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
            error_log('ProgramExerciseController@index Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function create($programId) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $programId = (int)$programId;
        $val = $this->getJsonInput();

        $allowedFields = ['exercise_name', 'sets', 'repetitions', 'duration_seconds', 'rest_seconds', 'instructions', 'sort_order'];
        foreach (array_keys($val) as $key) {
            if (!in_array($key, $allowedFields, true)) {
                Response::error("Geçersiz alan: $key", 'VALIDATION_ERROR', 422);
            }
        }

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
            if (!is_int($sets) || $sets < 0 || $sets > 65535) {
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
            if (!is_int($duration_seconds) || $duration_seconds < 0 || $duration_seconds > 4294967295) {
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
        if (!is_int($sort_order) || $sort_order < 0) {
            Response::error("sort_order geçerli bir pozitif tam sayı olmalıdır.", 'VALIDATION_ERROR', 422);
        }

        try {
            $this->db->beginTransaction();
            $this->validateProgramExists($programId);

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
            
            $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;
            try {
                AuditLogger::log(
                    'program_exercise.create',
                    $currentAdminId,
                    'program_exercise',
                    $id,
                    [
                        'exercise_id' => $id,
                        'program_id' => $programId
                    ]
                );
            } catch (\Throwable $e) {}

            Response::json(['id' => $id, 'program_id' => $programId], 201);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('ProgramExerciseController@create Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function update($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $id = (int)$id;
        $val = $this->getJsonInput();

        if (empty($val)) {
            Response::error("Güncellenecek alan bulunamadı.", 'VALIDATION_ERROR', 422);
        }

        $allowedFields = ['exercise_name', 'sets', 'repetitions', 'duration_seconds', 'rest_seconds', 'instructions', 'sort_order'];
        foreach (array_keys($val) as $key) {
            if (!in_array($key, $allowedFields, true)) {
                Response::error("Geçersiz alan: $key", 'VALIDATION_ERROR', 422);
            }
        }

        try {
            $this->db->beginTransaction();
            
            $stmt = $this->db->prepare("SELECT program_id FROM program_exercises WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $programId = $stmt->fetchColumn();

            if (!$programId) {
                if ($this->db->inTransaction()) { $this->db->rollBack(); }
                Response::error("Egzersiz bulunamadı.", 'NOT_FOUND', 404);
            }
            
            $programId = (int)$programId;
            $this->validateProgramExists($programId);

            $updates = [];
            $params = [];
            $changedFields = [];

            if (array_key_exists('exercise_name', $val)) {
                if (!is_string($val['exercise_name'])) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("exercise_name metin olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                $val['exercise_name'] = trim($val['exercise_name']);
                $len = mb_strlen($val['exercise_name'], 'UTF-8');
                if ($len < 1 || $len > 160) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("exercise_name 1-160 karakter arasında olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                $updates[] = "exercise_name = ?";
                $params[] = $val['exercise_name'];
                $changedFields[] = 'exercise_name';
            }

            if (array_key_exists('sets', $val)) {
                $sets = $val['sets'];
                if ($sets !== null && (!is_int($sets) || $sets < 0 || $sets > 65535)) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("sets geçersiz.", 'VALIDATION_ERROR', 422);
                }
                $updates[] = "sets = ?";
                $params[] = $sets;
                $changedFields[] = 'sets';
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
                $updates[] = "repetitions = ?";
                $params[] = $repetitions;
                $changedFields[] = 'repetitions';
            }

            if (array_key_exists('duration_seconds', $val)) {
                $duration_seconds = $val['duration_seconds'];
                if ($duration_seconds !== null && (!is_int($duration_seconds) || $duration_seconds < 0 || $duration_seconds > 4294967295)) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("duration_seconds geçersiz.", 'VALIDATION_ERROR', 422);
                }
                $updates[] = "duration_seconds = ?";
                $params[] = $duration_seconds;
                $changedFields[] = 'duration_seconds';
            }

            if (array_key_exists('rest_seconds', $val)) {
                $rest_seconds = $val['rest_seconds'];
                if ($rest_seconds !== null && (!is_int($rest_seconds) || $rest_seconds < 0 || $rest_seconds > 65535)) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("rest_seconds geçersiz.", 'VALIDATION_ERROR', 422);
                }
                $updates[] = "rest_seconds = ?";
                $params[] = $rest_seconds;
                $changedFields[] = 'rest_seconds';
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
                $updates[] = "instructions = ?";
                $params[] = $instructions;
                $changedFields[] = 'instructions';
            }

            if (array_key_exists('sort_order', $val)) {
                $sort_order = $val['sort_order'];
                if (!is_int($sort_order) || $sort_order < 0) {
                    if ($this->db->inTransaction()) { $this->db->rollBack(); }
                    Response::error("sort_order geçerli bir pozitif tam sayı olmalıdır.", 'VALIDATION_ERROR', 422);
                }
                $updates[] = "sort_order = ?";
                $params[] = $sort_order;
                $changedFields[] = 'sort_order';
            }

            if (!empty($updates)) {
                $sql = "UPDATE program_exercises SET " . implode(", ", $updates) . " WHERE id = ?";
                $params[] = $id;
                $stmt = $this->db->prepare($sql);
                $stmt->execute($params);
            }

            $this->db->commit();

            $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;
            try {
                AuditLogger::log(
                    'program_exercise.update',
                    $currentAdminId,
                    'program_exercise',
                    $id,
                    [
                        'exercise_id' => $id,
                        'program_id' => $programId,
                        'changed_fields' => $changedFields
                    ]
                );
            } catch (\Throwable $e) {}

            Response::json(['success' => true]);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('ProgramExerciseController@update Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }

    public function delete($id) {
        AuthMiddleware::hasRole(['super_admin', 'admin']);
        $id = (int)$id;

        try {
            $this->db->beginTransaction();
            
            $stmt = $this->db->prepare("SELECT program_id FROM program_exercises WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $programId = $stmt->fetchColumn();

            if (!$programId) {
                if ($this->db->inTransaction()) { $this->db->rollBack(); }
                Response::error("Egzersiz bulunamadı.", 'NOT_FOUND', 404);
            }
            
            $programId = (int)$programId;
            $this->validateProgramExists($programId);

            $stmt = $this->db->prepare("DELETE FROM program_exercises WHERE id = ? AND program_id = ?");
            $stmt->execute([$id, $programId]);

            if ($stmt->rowCount() !== 1) {
                if ($this->db->inTransaction()) { $this->db->rollBack(); }
                throw new \RuntimeException("Delete update count mismatch.");
            }

            $this->db->commit();

            $currentAdminId = isset($_SESSION['admin_id']) ? (int)$_SESSION['admin_id'] : null;
            try {
                AuditLogger::log(
                    'program_exercise.delete',
                    $currentAdminId,
                    'program_exercise',
                    $id,
                    [
                        'exercise_id' => $id,
                        'program_id' => $programId
                    ]
                );
            } catch (\Throwable $e) {}

            Response::json(['success' => true]);
        } catch (\Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('ProgramExerciseController@delete Exception: ' . $e->getMessage());
            Response::error('Sunucu hatası oluştu.', 'INTERNAL_ERROR', 500);
        }
    }
}
