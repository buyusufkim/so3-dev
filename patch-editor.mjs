import fs from 'fs';

let content = fs.readFileSync('src/admin/pages/members/AdminMemberEditor.tsx', 'utf8');

// Add parsedMemberId near the top of the component
content = content.replace("const isNew = !id;", "const isNew = !id;\n  const parsedMemberId = id && /^\\d+$/.test(id) ? parseInt(id, 10) : null;");

// Replace memberId={parseInt(id, 10)} for MemberPortalAccountPanel
content = content.replace(
  "{activeTab === 'portal-account' && id && (", 
  "{activeTab === 'portal-account' && parsedMemberId !== null && parsedMemberId > 0 && ("
);
content = content.replace("<MemberPortalAccountPanel memberId={parseInt(id, 10)} />", "<MemberPortalAccountPanel memberId={parsedMemberId} />");

fs.writeFileSync('src/admin/pages/members/AdminMemberEditor.tsx', content);
console.log("Editor patched");
