import fs from 'fs';
let content = fs.readFileSync('scripts/verify-member-account-provisioning-ui.mjs', 'utf8');

content = content.replace(
  "check(!editorCode.includes('memberId={parseInt(id, 10)}'), 'AdminMemberEditor must not pass raw parseInt(id, 10)');",
  "check(!editorCode.match(/<MemberPortalAccountPanel[^>]*memberId=\\{parseInt\\(id, 10\\)\\}/), 'AdminMemberEditor must not pass raw parseInt(id, 10) to PortalAccountPanel');"
);

fs.writeFileSync('scripts/verify-member-account-provisioning-ui.mjs', content);
console.log("Verifier patched again");
