import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalInvariants = 0;
let passedInvariants = 0;
let failedInvariants = 0;

function checkInvariant(name, fn) {
    totalInvariants++;
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        passedInvariants++;
    } catch (e) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Reason: ${e.message}`);
        failedInvariants++;
    }
}

// Check Backend
const memberControllerPath = path.resolve(rootDir, 'api/controllers/MemberController.php');
const memberSource = fs.readFileSync(memberControllerPath, 'utf8');

checkInvariant("MemberController has getVisits", () => {
    if (!memberSource.includes("public function getVisits")) {
        throw new Error("Missing getVisits in MemberController");
    }
});

checkInvariant("MemberController has getRenewals", () => {
    if (!memberSource.includes("public function getRenewals")) {
        throw new Error("Missing getRenewals in MemberController");
    }
});

checkInvariant("getVisits query is member scoped", () => {
    if (!memberSource.match(/SELECT.*?FROM member_visits.*?WHERE mv\.member_id = \?/s)) {
        throw new Error("Missing member_id scope in getVisits");
    }
});

checkInvariant("getRenewals query is member scoped", () => {
    if (!memberSource.match(/SELECT.*?FROM membership_renewals.*?WHERE mr\.member_id = \?/s)) {
        throw new Error("Missing member_id scope in getRenewals");
    }
});

checkInvariant("Role protection exists for new endpoints", () => {
    const visitsBlock = memberSource.substring(memberSource.indexOf("public function getVisits"));
    const renewalsBlock = memberSource.substring(memberSource.indexOf("public function getRenewals"));
    if (!visitsBlock.includes("AuthMiddleware::hasRole(['super_admin', 'admin'])")) {
        throw new Error("Missing AuthMiddleware for getVisits");
    }
    if (!renewalsBlock.includes("AuthMiddleware::hasRole(['super_admin', 'admin'])")) {
        throw new Error("Missing AuthMiddleware for getRenewals");
    }
});

// Check Router
const indexPath = path.resolve(rootDir, 'api/index.php');
const indexSource = fs.readFileSync(indexPath, 'utf8');

checkInvariant("Router contains new history endpoints", () => {
    if (!indexSource.includes("/api/admin/members/([1-9]\\d*)/visits")) {
        throw new Error("Missing visits route");
    }
    if (!indexSource.includes("/api/admin/members/([1-9]\\d*)/renewals")) {
        throw new Error("Missing renewals route");
    }
});

// Check Frontend
const adminMemberEditorPath = path.resolve(rootDir, 'src/admin/pages/members/AdminMemberEditor.tsx');
const adminMemberEditorSource = fs.readFileSync(adminMemberEditorPath, 'utf8');

checkInvariant("AdminMemberEditor has activeTab state", () => {
    if (!adminMemberEditorSource.includes("const [activeTab, setActiveTab] = useState")) {
        throw new Error("Missing activeTab state");
    }
});

checkInvariant("AdminMemberEditor imports panels", () => {
    if (!adminMemberEditorSource.includes("MemberVisitsPanel") || !adminMemberEditorSource.includes("MemberRenewalsPanel")) {
        throw new Error("Missing panel imports or usage");
    }
});

const visitsPanelPath = path.resolve(rootDir, 'src/admin/pages/members/MemberVisitsPanel.tsx');
const renewalsPanelPath = path.resolve(rootDir, 'src/admin/pages/members/MemberRenewalsPanel.tsx');

checkInvariant("Panels handle loading and error states", () => {
    const visitsPanelSource = fs.readFileSync(visitsPanelPath, 'utf8');
    const renewalsPanelSource = fs.readFileSync(renewalsPanelPath, 'utf8');
    
    if (!visitsPanelSource.includes("if (loading)") || !visitsPanelSource.includes("if (error)")) {
        throw new Error("Missing loading/error handling in visits panel");
    }
    if (!renewalsPanelSource.includes("if (loading)") || !renewalsPanelSource.includes("if (error)")) {
        throw new Error("Missing loading/error handling in renewals panel");
    }
});

console.log("---------------------------------------------------------");
console.log(`Total Invariants: ${totalInvariants}`);
console.log(`Passed: ${passedInvariants}`);
console.log(`Failed: ${failedInvariants}`);
console.log("---------------------------------------------------------");

if (failedInvariants !== 0 || passedInvariants !== totalInvariants) {
    console.error(`❌ Member Operational History Verifier FAILED.`);
    process.exit(1);
} else {
    console.log(`✅ Member Operational History Verifier PASSED.`);
    process.exit(0);
}
