const s = `
        '/api/reception/appointments' => function() {
            AuthMiddleware::handle();
            AuthMiddleware::hasRole(['super_admin', 'admin', 'reception']);
            require_once __DIR__ . '/controllers/AppointmentController.php';
            (new \Controllers\AppointmentController())->getReceptionAppointments();
        },
        '/api/reception/appointment-trainers' => function() {
            AuthMiddleware::handle();
            AuthMiddleware::hasRole(['super_admin', 'admin', 'reception']);
            require_once __DIR__ . '/controllers/AppointmentController.php';
            (new \Controllers\AppointmentController())->getReceptionAppointmentTrainers();
        },
`;

console.log(s.replace("'/api/reception/appointment-trainers' => function() {\n            AuthMiddleware::handle();", "'/api/reception/appointment-trainers' => function() {\n"));
