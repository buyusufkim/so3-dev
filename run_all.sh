#!/bin/bash
set -e
npm run verify:appointment-session-package-ledger
npm run verify:appointment-read-create
npm run verify:appointment-create-options
npm run verify:appointment-reschedule
npm run verify:appointment-cancel
npm run verify:appointment-terminalization
npm run verify:appointment-lifecycle
npm run verify:admin-dev-fallback-parity
npm run lint
npm run build
