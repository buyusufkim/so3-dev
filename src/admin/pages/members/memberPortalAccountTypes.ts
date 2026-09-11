export type MemberPortalAccountMember = {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
  status: "active" | "inactive";
};

export type MemberPortalAccount = {
  id: number;
  uuid: string;
  member_id: number;
  username: string;
  status: "active" | "inactive";
  must_change_password: boolean;
  last_login_at: string | null;
  password_changed_at: string | null;
  created_at: string;
};

export type MemberPortalAccountResponse = {
  member: MemberPortalAccountMember;
  account: MemberPortalAccount | null;
};


function isValidDateTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateMemberPortalAccountResponse(data: unknown): MemberPortalAccountResponse {
  if (!isRecord(data)) throw new Error("Invalid response");

  const member = data.member;
  if (!isRecord(member)) throw new Error("Invalid member");

  if (typeof member.id !== 'number' || !Number.isInteger(member.id) || member.id <= 0) throw new Error("Invalid member id");
  if (typeof member.uuid !== 'string' || !member.uuid.trim()) throw new Error("Invalid member uuid");
  if (typeof member.first_name !== 'string' || !member.first_name.trim()) throw new Error("Invalid first_name");
  if (typeof member.last_name !== 'string' || !member.last_name.trim()) throw new Error("Invalid last_name");
  if (member.status !== 'active' && member.status !== 'inactive') throw new Error("Invalid member status");

  const account = data.account;
  if (account !== null) {
    if (!isRecord(account)) throw new Error("Invalid account");
    if (typeof account.id !== 'number' || !Number.isInteger(account.id) || account.id <= 0) throw new Error("Invalid account id");
    if (typeof account.uuid !== 'string' || !account.uuid.trim()) throw new Error("Invalid account uuid");
    if (account.member_id !== member.id) throw new Error("Account member_id mismatch");
    if (typeof account.username !== 'string' || !account.username.trim()) throw new Error("Invalid username");
    if (account.status !== 'active' && account.status !== 'inactive') throw new Error("Invalid account status");
    if (typeof account.must_change_password !== 'boolean') throw new Error("Invalid must_change_password");

    if (account.last_login_at !== null && !isValidDateTime(account.last_login_at)) throw new Error("Invalid last_login_at");
    if (account.password_changed_at !== null && !isValidDateTime(account.password_changed_at)) throw new Error("Invalid password_changed_at");
    if (!isValidDateTime(account.created_at)) throw new Error("Invalid created_at");
  }

  const mappedAccount = account === null ? null : {
    id: account.id as number,
    uuid: account.uuid as string,
    member_id: account.member_id as number,
    username: account.username as string,
    status: account.status as "active" | "inactive",
    must_change_password: account.must_change_password as boolean,
    last_login_at: account.last_login_at as string | null,
    password_changed_at: account.password_changed_at as string | null,
    created_at: account.created_at as string,
  };

  return {
    member: {
      id: member.id as number,
      uuid: member.uuid as string,
      first_name: member.first_name as string,
      last_name: member.last_name as string,
      status: member.status as "active" | "inactive",
    },
    account: mappedAccount
  };
}

export type MemberPortalMutationResponse = {
  success: true;
};

export function validateMemberPortalMutationResponse(data: unknown): MemberPortalMutationResponse {
  if (!isRecord(data)) throw new Error("Invalid response");
  if (data.success !== true) throw new Error("Not successful");
  return { success: true };
}
