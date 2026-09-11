<?php

namespace Middleware;

use Core\Response;
use Core\Database;

class MemberAuthMiddleware
{
    public static function handle()
    {
        if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
            Response::error('Oturum gerekli.', 'UNAUTHORIZED', 401);
        }

        if (!isset($_SESSION['auth_realm']) || $_SESSION['auth_realm'] !== 'member') {
            self::destroySessionAndDeny();
        }

        $accountId = $_SESSION['member_account_id'] ?? 0;
        $memberId = $_SESSION['member_id'] ?? 0;

        if ($accountId <= 0 || $memberId <= 0) {
            self::destroySessionAndDeny();
        }

        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare("
            SELECT ma.status as account_status, ma.auth_version, m.status as member_status, m.deleted_at
            FROM member_accounts ma
            JOIN members m ON ma.member_id = m.id
            WHERE ma.id = :account_id AND ma.member_id = :member_id
        ");
        $stmt->execute([':account_id' => $accountId, ':member_id' => $memberId]);
        $identity = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$identity) {
            self::destroySessionAndDeny();
        }

        if ($identity['account_status'] !== 'active' || $identity['member_status'] !== 'active' || $identity['deleted_at'] !== null) {
            self::destroySessionAndDeny();
        }

        if ((int)$identity['auth_version'] !== ($_SESSION['member_auth_version'] ?? 0)) {
            self::destroySessionAndDeny();
        }
    }

    private static function destroySessionAndDeny()
    {
        \Core\Session::destroy();
        Response::error('Oturum geçersiz.', 'UNAUTHORIZED', 401);
    }
}
