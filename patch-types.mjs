import fs from 'fs';

const content = fs.readFileSync('src/admin/pages/members/memberPortalAccountTypes.ts', 'utf8');

const isValidDateTimeCode = `
function isValidDateTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\\d{4})-(\\d{2})-(\\d{2}) (\\d{2}):(\\d{2}):(\\d{2})$/);
  if (!match) return false;
  
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const hour = parseInt(match[4], 10);
  const minute = parseInt(match[5], 10);
  const second = parseInt(match[6], 10);
  
  if (month < 1 || month > 12) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;
  
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let maxDays = daysInMonth[month - 1];
  
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeap) maxDays = 29;
  }
  
  if (day < 1 || day > maxDays) return false;
  return true;
}
`;

const replacedContent = content
  .replace("function isRecord(value: unknown): value is Record<string, unknown> {", isValidDateTimeCode + "\nfunction isRecord(value: unknown): value is Record<string, unknown> {")
  .replace("if (account.last_login_at !== null && typeof account.last_login_at !== 'string') throw new Error(\"Invalid last_login_at\");", "if (account.last_login_at !== null && !isValidDateTime(account.last_login_at)) throw new Error(\"Invalid last_login_at\");")
  .replace("if (account.password_changed_at !== null && typeof account.password_changed_at !== 'string') throw new Error(\"Invalid password_changed_at\");", "if (account.password_changed_at !== null && !isValidDateTime(account.password_changed_at)) throw new Error(\"Invalid password_changed_at\");")
  .replace("if (typeof account.created_at !== 'string') throw new Error(\"Invalid created_at\");", "if (!isValidDateTime(account.created_at)) throw new Error(\"Invalid created_at\");");

fs.writeFileSync('src/admin/pages/members/memberPortalAccountTypes.ts', replacedContent);
console.log("Types patched");
