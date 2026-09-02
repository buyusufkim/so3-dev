<?php
$content = file_get_contents('api/index.php');

$get_routes = <<<PHP
        '/api/public/trainers' => function() {
            (new \Controllers\PublicEventController())->index(); // dummy match string
PHP;
// We'll replace using regex to append to GET and POST arrays.
// Actually, I'll just use a small script to parse and insert.
