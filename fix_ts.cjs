const fs = require('fs');

let ame = fs.readFileSync('src/admin/pages/members/AdminMemberEditor.tsx', 'utf8');
ame = ame.replace(
  /const \[activeTab, setActiveTab\] = useState\<"info" \| "visits" \| "renewals"\>\("info"\);/,
  'const [activeTab, setActiveTab] = useState<"info" | "visits" | "renewals" | "session-packages">("info");'
);
fs.writeFileSync('src/admin/pages/members/AdminMemberEditor.tsx', ame);

let msp = fs.readFileSync('src/admin/pages/members/MemberSessionPackagesPanel.tsx', 'utf8');
msp = msp.replace(
  /let typeLabel = entry.entry_type;/,
  'let typeLabel: string = entry.entry_type;'
);
fs.writeFileSync('src/admin/pages/members/MemberSessionPackagesPanel.tsx', msp);

let sp = fs.readFileSync('src/admin/pages/session-packages/SessionPackagesPage.tsx', 'utf8');
sp = sp.replace(
  /formData\.validity_days === null \|\| formData\.validity_days === ""/,
  'formData.validity_days === null || formData.validity_days === "" as unknown as number'
);
fs.writeFileSync('src/admin/pages/session-packages/SessionPackagesPage.tsx', sp);
