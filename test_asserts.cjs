const { execSync } = require('child_process');
const fs = require('fs');

const origIndexSrc = fs.readFileSync('api/index.php', 'utf8');
const origControllerSrc = fs.readFileSync('api/controllers/AppointmentController.php', 'utf8');
const origMigration35 = fs.readFileSync('database/migrations/035_create_appointments.sql', 'utf8');

// copy all verify functions here
