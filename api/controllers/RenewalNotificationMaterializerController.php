<?php

namespace Controllers;

use Core\Database;
use Core\Response;
use DateTimeImmutable;
use DateTimeZone;
use PDO;

class RenewalNotificationMaterializerController
{
    /**
     * Generate canonical RFC 4122 version 4 UUID.
     */
    private function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

        return vsprintf(
            '%s%s-%s-%s-%s-%s%s%s',
            str_split(bin2hex($data), 4)
        );
    }

    /**
     * Validate that POST request provides JSON Content-Type and an empty JSON object {}.
     * Rejects query parameters, invalid media types, oversized payloads, non-JSON or non-empty bodies.
     */
    private function validateEmptyJsonPayload(): void
    {
        if (!empty($_GET)) {
            Response::error('Query parameter kabul edilmez.', 'VALIDATION_ERROR', 422);
            return;
        }

        $contentType = isset($_SERVER['CONTENT_TYPE']) ? trim($_SERVER['CONTENT_TYPE']) : '';
        if (strpos(strtolower($contentType), 'application/json') !== 0) {
            Response::error('Yalnızca JSON kabul edilmektedir.', 'UNSUPPORTED_MEDIA_TYPE', 415);
            return;
        }

        $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
        if ($contentLength > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
            return;
        }

        $rawBody = trim(file_get_contents('php://input'));
        if ($rawBody === '') {
            Response::error('İstek gövdesi (body) boş bir JSON nesnesi {} olmalıdır.', 'VALIDATION_ERROR', 422);
            return;
        }

        if (strlen($rawBody) > 16384) {
            Response::error('İstek boyutu çok büyük.', 'PAYLOAD_TOO_LARGE', 413);
            return;
        }

        $decoded = json_decode($rawBody);
        if (json_last_error() !== JSON_ERROR_NONE) {
            Response::error('Geçersiz JSON formatı.', 'INVALID_JSON', 400);
            return;
        }

        if (!($decoded instanceof \stdClass)) {
            Response::error('İstek gövdesi (body) boş bir JSON nesnesi {} olmalıdır.', 'VALIDATION_ERROR', 422);
            return;
        }

        if (count(get_object_vars($decoded)) !== 0) {
            Response::error('İstek gövdesi (body) boş olmalıdır.', 'VALIDATION_ERROR', 422);
            return;
        }
    }

    /**
     * Format YYYY-MM-DD to DD.MM.YYYY string-safely without timezone drift.
     */
    private function formatDate(string $date): string
    {
        $parts = explode('-', $date);
        if (count($parts) === 3) {
            return "{$parts[2]}.{$parts[1]}.{$parts[0]}";
        }
        return $date;
    }

    /**
     * POST /api/reception/renewal-notifications/materialize
     * Explicit idempotent materialization of renewal notifications for active admin/reception recipients.
     */
    public function materialize()
    {
        $this->validateEmptyJsonPayload();

        // 1. Business time authority: Europe/Istanbul
        $tz = new DateTimeZone('Europe/Istanbul');
        $todayObj = new DateTimeImmutable('today', $tz);
        $today = $todayObj->format('Y-m-d');
        $windowDays = 14;
        $windowEndObj = $todayObj->modify("+{$windowDays} days");
        $windowEnd = $windowEndObj->format('Y-m-d');

        try {
            $db = Database::getInstance()->getConnection();

            // 2. Fetch candidate members in a single query
            // Scope: deleted_at IS NULL AND status = 'active' AND membership_end_date IS NOT NULL AND membership_end_date <= :window_end
            $memberStmt = $db->prepare("
                SELECT id, first_name, last_name, membership_end_date
                FROM members
                WHERE deleted_at IS NULL
                  AND status = 'active'
                  AND membership_end_date IS NOT NULL
                  AND membership_end_date <= :window_end
                ORDER BY membership_end_date ASC, id ASC
            ");
            $memberStmt->bindValue(':window_end', $windowEnd, PDO::PARAM_STR);
            $memberStmt->execute();
            $candidates = $memberStmt->fetchAll(PDO::FETCH_ASSOC);

            // 3. Fetch eligible recipients in a single query
            // Scope: status = 'active' AND role IN ('super_admin', 'admin', 'reception')
            $recipientStmt = $db->prepare("
                SELECT id
                FROM admins
                WHERE status = 'active'
                  AND role IN ('super_admin', 'admin', 'reception')
                ORDER BY id ASC
            ");
            $recipientStmt->execute();
            $recipients = $recipientStmt->fetchAll(PDO::FETCH_ASSOC);

            // 4. Classify candidates and prepare notifications
            $counts = [
                'expired' => 0,
                'today' => 0,
                'upcoming' => 0,
                'total' => count($candidates),
            ];

            $classifiedMembers = [];
            foreach ($candidates as $candidate) {
                $endDate = $candidate['membership_end_date'];
                if ($endDate < $today) {
                    $stage = 'expired';
                    $type = 'membership_renewal_expired';
                    $severity = 'critical';
                    $title = 'Üyelik süresi geçti';
                    $formattedDate = $this->formatDate($endDate);
                    $body = trim($candidate['first_name'] . ' ' . $candidate['last_name']) . " üyeliğinin bitiş tarihi {$formattedDate}.";
                    $counts['expired']++;
                } elseif ($endDate === $today) {
                    $stage = 'today';
                    $type = 'membership_renewal_today';
                    $severity = 'warning';
                    $title = 'Üyelik bugün sona eriyor';
                    $formattedDate = $this->formatDate($endDate);
                    $body = trim($candidate['first_name'] . ' ' . $candidate['last_name']) . " üyeliği bugün sona eriyor ({$formattedDate}).";
                    $counts['today']++;
                } else {
                    $stage = 'upcoming';
                    $type = 'membership_renewal_upcoming';
                    $severity = 'info';
                    $title = 'Üyelik süresi yaklaşıyor';
                    $formattedDate = $this->formatDate($endDate);
                    $body = trim($candidate['first_name'] . ' ' . $candidate['last_name']) . " üyeliği {$formattedDate} tarihinde sona erecek.";
                    $counts['upcoming']++;
                }

                $sourceKey = "membership-renewal:{$candidate['id']}:{$endDate}:{$stage}";

                $classifiedMembers[] = [
                    'member_id' => (int)$candidate['id'],
                    'source_key' => $sourceKey,
                    'type' => $type,
                    'severity' => $severity,
                    'title' => $title,
                    'body' => $body,
                ];
            }

            $recipientCount = count($recipients);
            $attemptedCount = count($classifiedMembers) * $recipientCount;
            $createdCount = 0;

            // 5. Batch insert in transaction with duplicate no-op strategy
            if ($attemptedCount > 0) {
                $db->beginTransaction();

                $insertStmt = $db->prepare("
                    INSERT INTO admin_notifications (
                        uuid,
                        recipient_admin_id,
                        source_key,
                        type,
                        severity,
                        title,
                        body,
                        entity_type,
                        entity_id,
                        action_path
                    ) VALUES (
                        :uuid,
                        :recipient_admin_id,
                        :source_key,
                        :type,
                        :severity,
                        :title,
                        :body,
                        :entity_type,
                        :entity_id,
                        :action_path
                    )
                    ON DUPLICATE KEY UPDATE id = id
                ");

                foreach ($classifiedMembers as $item) {
                    foreach ($recipients as $recipient) {
                        $uuid = $this->generateUuid();
                        $insertStmt->bindValue(':uuid', $uuid, PDO::PARAM_STR);
                        $insertStmt->bindValue(':recipient_admin_id', (int)$recipient['id'], PDO::PARAM_INT);
                        $insertStmt->bindValue(':source_key', $item['source_key'], PDO::PARAM_STR);
                        $insertStmt->bindValue(':type', $item['type'], PDO::PARAM_STR);
                        $insertStmt->bindValue(':severity', $item['severity'], PDO::PARAM_STR);
                        $insertStmt->bindValue(':title', $item['title'], PDO::PARAM_STR);
                        $insertStmt->bindValue(':body', $item['body'], PDO::PARAM_STR);
                        $insertStmt->bindValue(':entity_type', 'member', PDO::PARAM_STR);
                        $insertStmt->bindValue(':entity_id', $item['member_id'], PDO::PARAM_INT);
                        $insertStmt->bindValue(':action_path', '/admin/reception', PDO::PARAM_STR);
                        $insertStmt->execute();

                        // In MySQL PDO, rowCount() is 1 on insert, 0 on no-op duplicate update (id = id)
                        if ($insertStmt->rowCount() === 1) {
                            $createdCount++;
                        }
                    }
                }

                $db->commit();
            }

            $duplicateCount = $attemptedCount - $createdCount;

            Response::json([
                'as_of_date' => $today,
                'window_days' => $windowDays,
                'recipient_count' => $recipientCount,
                'candidates' => $counts,
                'attempted_count' => $attemptedCount,
                'created_count' => $createdCount,
                'duplicate_count' => $duplicateCount,
            ]);
        } catch (\Throwable $e) {
            if (isset($db) && $db->inTransaction()) {
                $db->rollBack();
            }
            error_log("RenewalNotificationMaterializerController materialize error: " . $e->getMessage());
            Response::error('Bildirimler oluşturulurken bir hata oluştu.', 'INTERNAL_ERROR', 500);
        }
    }
}
