import fs from 'fs';
import path from 'path';

function checkInvariant(name, test) {
    try {
        test();
        console.log(`✅ PASS: ${name}`);
    } catch (e) {
        console.error(`❌ FAIL: ${name}`);
        console.error(e);
        process.exit(1);
    }
}

console.log("👉 Repository Hygiene");
checkInvariant("No temporary artifacts in root", () => {
    const files = fs.readdirSync('.');
    const forbidden = [
        /^patch.*\.js$/,
        /^patch.*\.mjs$/,
        /^patch.*\.php$/,
        /^tmp.*\.js$/,
        /^tmp.*\.mjs$/,
        /^tmp.*\.php$/,
        /\.tmp$/,
        /\.fixed$/,
        /^add-.*\.php$/
    ];
    const found = files.filter(f => forbidden.some(regex => regex.test(f)));
    if (found.length > 0) {
        throw new Error(`Temporary artifacts found: ${found.join(', ')}`);
    }
});

console.log("👉 Verifying F.19D.1 Trainer Mobile Member Workspace");

const listSrc = fs.readFileSync('src/admin/pages/trainer-members/TrainerMembersList.tsx', 'utf8');
const detailSrc = fs.readFileSync('src/admin/pages/trainer-members/TrainerMemberDetail.tsx', 'utf8');
const navSrc = fs.readFileSync('src/admin/components/TrainerMemberWorkspaceNav.tsx', 'utf8');
const routesSrc = fs.readFileSync('src/routes/index.tsx', 'utf8');

checkInvariant("Canonical Route Invariants", () => {
    if (!routesSrc.includes('path: "my-members"')) throw new Error("Missing /admin/my-members route");
    if (!routesSrc.includes('path: "my-members/:id"')) throw new Error("Missing /admin/my-members/:id route");
    if (!routesSrc.includes('path: "my-members/:memberId/progress"')) throw new Error("Missing progress route");
    if (!routesSrc.includes('path: "my-members/:memberId/training-programs"')) throw new Error("Missing programs route");
});

checkInvariant("API Invariants", () => {
    if (!listSrc.includes("apiClient.get(`/api/trainer/members?${params.toString()}`)")) {
        throw new Error("Missing list GET /api/trainer/members call");
    }
    if (!detailSrc.includes("apiClient.get(`/api/trainer/members/${id}`)")) {
        throw new Error("Missing detail GET /api/trainer/members/:id call");
    }
    const combined = listSrc + detailSrc + navSrc;
    if (combined.match(/apiClient\.get\([\s\S]+?apiClient\.get\([\s\S]+?apiClient\.get\(/)) {
        throw new Error("New unexpected GET calls found");
    }
});

checkInvariant("No Business Mutations", () => {
    const combined = listSrc + detailSrc + navSrc;
    if (combined.includes('apiClient.post') || combined.includes('apiClient.patch') || combined.includes('apiClient.delete')) {
        throw new Error("Mutations found in view-only phase!");
    }
});

checkInvariant("Mobile Card Invariant & Desktop Table", () => {
    if (!listSrc.includes('lg:hidden')) throw new Error("Missing lg:hidden for mobile list");
    if (!listSrc.includes('hidden lg:block') && !listSrc.includes('lg:table') && !listSrc.match(/<div[^>]*hidden lg:block[^>]*>[\s\S]*?<table/)) {
        throw new Error("Missing hidden lg:block wrapper for desktop table");
    }
    if (!listSrc.includes('<table')) throw new Error("Desktop table removed!");
    
    // Check mobile card mapping
    const mobileSection = listSrc.split('lg:hidden')[1];
    if (!mobileSection.includes('items.map(')) throw new Error("Mobile section doesn't map items");
    if (!mobileSection.includes('item.first_name') || !mobileSection.includes('item.last_name')) throw new Error("Missing name in mobile card");
    if (!mobileSection.includes('item.phone')) throw new Error("Missing phone in mobile card");
    if (!mobileSection.includes('item.status')) throw new Error("Missing status in mobile card");
    if (!mobileSection.includes('item.created_at')) throw new Error("Missing created_at in mobile card");
});

checkInvariant("Search/Filter/Pagination Contract", () => {
    if (!listSrc.includes('const [page, setPage] = useState(1);')) throw new Error("Missing page state");
    if (!listSrc.includes('const [perPage] = useState(20);')) throw new Error("Missing perPage 20 contract");
    if (!listSrc.includes('const [q, setQ] = useState("");')) throw new Error("Missing q state");
    if (!listSrc.includes('const [debouncedQ, setDebouncedQ] = useState("");')) throw new Error("Missing debouncedQ state");
    if (!listSrc.includes('status, setStatus')) throw new Error("Missing status state");
});

checkInvariant("Workspace Nav exact destinations", () => {
    if (!navSrc.includes('to: `/admin/my-members/${memberId}`')) throw new Error("Missing base detail destination");
    if (!navSrc.includes('to: `/admin/my-members/${memberId}/progress`')) throw new Error("Missing progress destination");
    if (!navSrc.includes('to: `/admin/my-members/${memberId}/training-programs`')) throw new Error("Missing programs destination");
});

checkInvariant("Mobile Workspace Nav Grid & Accessibility", () => {
    if (!navSrc.includes('grid-cols-3')) throw new Error("Missing grid-cols-3 for nav base layout");
    if (!navSrc.includes('aria-label="Üye Çalışma Alanı Navigasyonu"')) throw new Error("Missing nav aria-label");
    if (!navSrc.includes('aria-current={isActive ? "page" : undefined}')) throw new Error("Missing aria-current");
});

checkInvariant("Touch Targets", () => {
    if (!listSrc.match(/min-h-\[44px\]/)) throw new Error("Missing touch target for list inputs/buttons");
    if (!navSrc.match(/min-h-\[44px\]/)) throw new Error("Missing touch target for nav links");
});

checkInvariant("Successful Member Detail Mobile Presentation", () => {
    const parts = detailSrc.split('if (error || !member)');
    if (parts.length < 2) throw new Error("Could not find error/member branch to isolate successful render");
    const successSrc = parts[1];

    if (!successSrc.match(/<h1[^>]*>[^<]*\{member\.first_name\}\s+\{member\.last_name\}[^<]*<\/h1>/)) {
        throw new Error("Missing member name as h1 in successful render");
    }
    
    const backLinkRegex = /<Link[^>]+to="\/admin\/my-members"[^>]*>/;
    const backLinkMatch = successSrc.match(backLinkRegex);
    if (!backLinkMatch) throw new Error("Missing successful back link");
    
    if (!backLinkMatch[0].includes('aria-label="Üye listesine dön"')) {
        throw new Error("Missing aria-label on successful back link");
    }
    if (!backLinkMatch[0].includes('min-w-10') || !backLinkMatch[0].includes('min-h-10')) {
        throw new Error("Successful back link is not touch safe");
    }

    if (!successSrc.includes('space-y-4 lg:space-y-6')) throw new Error("Missing successful root compact mobile spacing");
    if (!successSrc.includes('p-4 lg:p-6')) throw new Error("Missing successful cards p-4 + desktop spacing");
    if (!successSrc.includes('grid-cols-1 sm:grid-cols-2')) throw new Error("Missing membership grid base grid-cols-1 + responsive two-column");
    if (!successSrc.includes('<TrainerMemberWorkspaceNav memberId={member.id} active="member" />')) {
        throw new Error("TrainerMemberWorkspaceNav active member missing or changed in successful render");
    }
});

console.log("✅ All F.19D.1 Mobile Member Workspace checks passed!");
