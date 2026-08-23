<?php
require_once __DIR__ . '/bootstrap.php';

use Core\Response;
use Controllers\AuthController;
use Controllers\AdminController;
use Middleware\AuthMiddleware;
use Middleware\CsrfMiddleware;

// Security Headers
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');

// Disable caching for API responses
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Handle preflight OPTIONS
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Global CSRF check for mutations
if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    CsrfMiddleware::handle();
}

// Admin namespace role firewall
if (strpos($requestUri, '/api/admin/') === 0) {
    AuthMiddleware::hasRole(['super_admin', 'admin', 'editor']);
}

$routes = [
    'GET' => [
        '/api/health' => function() {
            Response::json(['ok' => true]);
        },
        '/api/auth/csrf' => [AuthController::class, 'getCsrf'],
        '/api/auth/me' => [AuthController::class, 'me'],
        '/api/admin/dashboard' => function() {
            AuthMiddleware::handle();
            (new AdminController())->dashboard();
        },
        '/api/admin/media' => function() {
            AuthMiddleware::handle();
            (new \Controllers\MediaController())->index();
        },
        '/api/admin/event-categories' => function() {
            AuthMiddleware::handle();
            (new \Controllers\EventCategoryController())->index();
        },
        '/api/admin/events' => function() {
            AuthMiddleware::handle();
            (new \Controllers\EventController())->index();
        },
        '/api/admin/branches' => function() {
            AuthMiddleware::handle();
            (new \Controllers\BranchController())->getAdminList();
        },
        '/api/admin/trainers' => function() {
            AuthMiddleware::handle();
            (new \Controllers\TrainerController())->index();
        },
        '/api/admin/trainer-accounts' => function() {
            AuthMiddleware::handle();
            (new \Controllers\TrainerAccountController())->index();
        },
        '/api/admin/members' => function() {
            AuthMiddleware::handle();
            (new \Controllers\MemberController())->index();
        },
        '/api/admin/site-settings' => function() {
            AuthMiddleware::handle();
            (new \Controllers\SiteSettingsController())->index();
        },
        '/api/public/event-categories' => function() {
            (new \Controllers\PublicEventController())->categories();
        },
        '/api/public/events' => function() {
            (new \Controllers\PublicEventController())->index();
        },
        '/api/public/site-settings' => function() {
            (new \Controllers\SiteSettingsController())->publicIndex();
        },
        '/api/public/branches' => function() {
            (new \Controllers\BranchController())->publicIndex();
        },
        '/api/public/homepage' => function() {
            (new \Controllers\PublicHomepageController())->index();
        },
        '/api/public/homepage/content' => function() {
            (new \Controllers\PublicHomepageController())->content();
        },
        '/api/public/trainers' => function() {
            (new \Controllers\TrainerController())->publicIndex();
        }
    ],
    'POST' => [
        '/api/auth/login' => [AuthController::class, 'login'],
        '/api/auth/logout' => function() {
            AuthMiddleware::handle();
            (new AuthController())->logout();
        },
        '/api/admin/media' => function() {
            AuthMiddleware::handle();
            (new \Controllers\MediaController())->store();
        },
        '/api/admin/event-categories' => function() {
            AuthMiddleware::handle();
            (new \Controllers\EventCategoryController())->create();
        },
        '/api/admin/events' => function() {
            AuthMiddleware::handle();
            (new \Controllers\EventController())->create();
        },
        '/api/admin/branches' => function() {
            AuthMiddleware::handle();
            (new \Controllers\BranchController())->create();
        },
        '/api/admin/trainers' => function() {
            AuthMiddleware::handle();
            (new \Controllers\TrainerController())->create();
        },
        '/api/admin/trainer-accounts' => function() {
            AuthMiddleware::handle();
            (new \Controllers\TrainerAccountController())->create();
        },
        '/api/admin/members' => function() {
            AuthMiddleware::handle();
            (new \Controllers\MemberController())->create();
        }
    ]
];

$matched = false;

if (isset($routes[$method][$requestUri])) {
    $handler = $routes[$method][$requestUri];
    if (is_array($handler)) {
        $controller = new $handler[0]();
        $action = $handler[1];
        $controller->$action();
    } elseif (is_callable($handler)) {
        $handler();
    }
    $matched = true;
} else {
    // Dynamic matching for media endpoints
    if (preg_match('#^/api/admin/media/(\d+)$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        $id = (int)$matches[1];
        $controller = new \Controllers\MediaController();
        if ($method === 'GET') {
            $controller->show($id);
            $matched = true;
        } elseif ($method === 'PATCH') {
            $controller->update($id);
            $matched = true;
        } elseif ($method === 'DELETE') {
            $controller->destroy($id);
            $matched = true;
        }
    }
    
    if (preg_match('#^/api/admin/homepage/sections$#', $requestUri)) {
        AuthMiddleware::handle();
        $controller = new \Controllers\AdminHomepageController();
        if ($method === 'GET') {
            $controller->index();
            $matched = true;
        }
    }

    if (preg_match('#^/api/admin/homepage/sections/order$#', $requestUri)) {
        AuthMiddleware::handle();
        if ($method === 'PATCH') {
            (new \Controllers\AdminHomepageController())->reorder();
            $matched = true;
        }
    }

    if (preg_match('#^/api/admin/homepage/sections/([^/]+)/content$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        $controller = new \Controllers\AdminHomepageController();
        if ($method === 'GET') {
            $controller->getContent($matches[1]);
            $matched = true;
        } elseif ($method === 'PATCH') {
            $controller->updateContent($matches[1]);
            $matched = true;
        }
    }

    if (preg_match('#^/api/admin/homepage/sections/([^/]+)$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        if ($method === 'PATCH') {
            if ($matches[1] !== 'order') {
                (new \Controllers\AdminHomepageController())->update($matches[1]);
                $matched = true;
            }
        }
    }

    if (preg_match('#^/api/admin/media/(\d+)/restore$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        if ($method === 'POST') {
            (new \Controllers\MediaController())->restore((int)$matches[1]);
            $matched = true;
        }
    }

    if (preg_match('#^/api/admin/media/(\d+)/poster$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        if ($method === 'PATCH') {
            (new \Controllers\MediaController())->updateVideoPoster((int)$matches[1]);
            $matched = true;
        }
    }

    // Dynamic matching for event categories endpoints
    if (preg_match('#^/api/admin/event-categories/(\d+)$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        $id = (int)$matches[1];
        if ($method === 'PATCH') {
            (new \Controllers\EventCategoryController())->update($id);
            $matched = true;
        }
    }

    // Dynamic matching for admin events endpoints
    if (preg_match('#^/api/admin/events/(\d+)$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        $id = (int)$matches[1];
        $controller = new \Controllers\EventController();
        if ($method === 'GET') {
            $controller->show($id);
            $matched = true;
        } elseif ($method === 'PATCH') {
            $controller->update($id);
            $matched = true;
        } elseif ($method === 'DELETE') {
            $controller->destroy($id);
            $matched = true;
        }
    }

    if (preg_match('#^/api/admin/events/(\d+)/restore$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        if ($method === 'POST') {
            (new \Controllers\EventController())->restore((int)$matches[1]);
            $matched = true;
        }
    }

    if (preg_match('#^/api/admin/events/(\d+)/media$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        if ($method === 'POST') {
            (new \Controllers\EventController())->attachMedia((int)$matches[1]);
            $matched = true;
        }
    }

    if (preg_match('#^/api/admin/events/(\d+)/media/(\d+)$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        if ($method === 'DELETE') {
            (new \Controllers\EventController())->detachMedia((int)$matches[1], (int)$matches[2]);
            $matched = true;
        }
    }

    if (preg_match('#^/api/admin/events/(\d+)/media-order$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        if ($method === 'PATCH') {
            (new \Controllers\EventController())->reorderMedia((int)$matches[1]);
            $matched = true;
        }
    }

    // Dynamic matching for public events endpoints
    if (preg_match('#^/api/public/events/([^/]+)$#', $requestUri, $matches)) {
        if ($method === 'GET') {
            (new \Controllers\PublicEventController())->show($matches[1]);
            $matched = true;
        }
    }

    // Dynamic matching for branch admin endpoints
    if (preg_match('#^/api/admin/branches/order$#', $requestUri)) {
        AuthMiddleware::handle();
        if ($method === 'PATCH') {
            (new \Controllers\BranchController())->reorder();
            $matched = true;
        }
    }

    if (preg_match('#^/api/admin/branches/(\d+)$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        $id = (int)$matches[1];
        $controller = new \Controllers\BranchController();
        if ($method === 'GET') {
            $controller->getAdminDetail($id);
            $matched = true;
        } elseif ($method === 'PATCH') {
            $controller->update($id);
            $matched = true;
        } elseif ($method === 'DELETE') {
            $controller->delete($id);
            $matched = true;
        }
    }

    if (preg_match('#^/api/admin/trainers/order$#', $requestUri)) {
        AuthMiddleware::handle();
        if ($method === 'PATCH') {
            (new \Controllers\TrainerController())->reorder();
            $matched = true;
        }
    }

    if (preg_match('#^/api/admin/trainers/(\d+)$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        $id = (int)$matches[1];
        $controller = new \Controllers\TrainerController();
        if ($method === 'GET') {
            $controller->show($id);
            $matched = true;
        } elseif ($method === 'PATCH') {
            $controller->update($id);
            $matched = true;
        } elseif ($method === 'DELETE') {
            $controller->delete($id);
            $matched = true;
        }
    }

    // Dynamic matching for admin members endpoints
    if (preg_match('#^/api/admin/members/(\d+)$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        $id = (int)$matches[1];
        $controller = new \Controllers\MemberController();
        if ($method === 'GET') {
            $controller->show($id);
            $matched = true;
        } elseif ($method === 'PATCH') {
            $controller->update($id);
            $matched = true;
        } elseif ($method === 'DELETE') {
            $controller->delete($id);
            $matched = true;
        }
    }

    if (preg_match('#^/api/admin/members/(\d+)/restore$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        if ($method === 'POST') {
            (new \Controllers\MemberController())->restore((int)$matches[1]);
            $matched = true;
        }
    }

    // Dynamic matching for trainer members endpoints
    if (preg_match('#^/api/trainer/members$#', $requestUri)) {
        AuthMiddleware::hasRole(['trainer']);
        if ($method === 'GET') {
            (new \Controllers\TrainerMemberController())->index();
            $matched = true;
        }
    }
    if (preg_match('#^/api/trainer/members/(\d+)$#', $requestUri, $matches)) {
        AuthMiddleware::hasRole(['trainer']);
        $id = (int)$matches[1];
        if ($method === 'GET') {
            (new \Controllers\TrainerMemberController())->show($id);
            $matched = true;
        }
    }

    if (preg_match('#^/api/admin/site-settings/([^/]+)$#', $requestUri, $matches)) {
        AuthMiddleware::handle();
        $key = $matches[1];
        $controller = new \Controllers\SiteSettingsController();
        if ($method === 'GET') {
            $controller->show($key);
            $matched = true;
        } elseif ($method === 'PATCH') {
            $controller->update($key);
            $matched = true;
        }
    }
}

if (!$matched) {
    Response::error('Not Found', 'NOT_FOUND', 404);
}
