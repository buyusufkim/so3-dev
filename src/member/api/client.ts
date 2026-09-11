import {
  MemberAuthIdentity,
  validateMemberAuthIdentity,
  MemberOverview,
  validateMemberOverview,
  MemberSessionPackage,
  validateSessionPackages,
  MemberAppointmentsData,
  validateAppointments,
  MemberTrainingProgram,
  validateTrainingPrograms
} from './validators';

export class MemberApiError extends Error {
  status: number;
  code: string;
  data?: unknown;

  constructor(message: string, status: number, code: string, data?: unknown) {
    super(message);
    this.name = 'MemberApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

let csrfTokenCache: string | null = null;

async function fetchCsrfToken(): Promise<string> {
  if (csrfTokenCache) return csrfTokenCache;

  const res = await fetch('/api/member-auth/csrf');
  if (!res.ok) {
    throw new MemberApiError('Güvenlik jetonu alınamadı.', res.status, 'CSRF_FAILED');
  }
  const data = await res.json();
  if (!data || typeof data.csrf_token !== 'string') {
    throw new MemberApiError('Geçersiz güvenlik jetonu.', 500, 'CSRF_INVALID');
  }
  
  csrfTokenCache = data.csrf_token;
  return data.csrf_token;
}

export function clearMemberCsrfCache() {
  csrfTokenCache = null;
}

function handle401() {
  clearMemberCsrfCache();
  window.dispatchEvent(new Event('so3_member_auth_expired'));
}

async function request(endpoint: string, options: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.method && options.method !== 'GET' && options.method !== 'HEAD') {
    headers.set('Content-Type', 'application/json');
    const csrfToken = await fetchCsrfToken();
    headers.set('X-CSRF-Token', csrfToken);
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers
    });

    if (res.status === 401) {
      handle401();
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      if (!res.ok) {
        throw new MemberApiError('Bir hata oluştu.', res.status, 'UNKNOWN_ERROR');
      }
      return null; // Empty response OK for some endpoints (like logout) if ok
    }

    if (!res.ok) {
      const d = data as Record<string, unknown>;
      const errorObj = d.error as Record<string, unknown> | undefined;
      const message = typeof errorObj?.message === 'string' ? errorObj.message : 'Bir hata oluştu.';
      const code = typeof errorObj?.code === 'string' ? errorObj.code : 'UNKNOWN_ERROR';
      const details = errorObj?.details;
      throw new MemberApiError(message, res.status, code, details);
    }

    return data;
  } catch (err) {
    if (err instanceof MemberApiError) throw err;
    throw new MemberApiError('Bağlantı hatası.', 0, 'NETWORK_ERROR');
  }
}

export const memberApiClient = {
  async login(username: string, password: string): Promise<unknown> {
    const data = await request('/api/member-auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    clearMemberCsrfCache();
    return data;
  },

  async me(): Promise<MemberAuthIdentity> {
    const data = await request('/api/member-auth/me');
    return validateMemberAuthIdentity(data);
  },

  async logout(): Promise<void> {
    await request('/api/member-auth/logout', { method: 'POST' });
    clearMemberCsrfCache();
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request('/api/member-auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    });
    clearMemberCsrfCache();
  },

  async getOverview(): Promise<MemberOverview> {
    const data = await request('/api/member/overview');
    return validateMemberOverview(data);
  },

  async getSessionPackages(): Promise<MemberSessionPackage[]> {
    const data = await request('/api/member/session-packages');
    return validateSessionPackages(data);
  },

  async getAppointments(): Promise<MemberAppointmentsData> {
    const data = await request('/api/member/appointments');
    return validateAppointments(data);
  },

  async getTrainingPrograms(): Promise<MemberTrainingProgram[]> {
    const data = await request('/api/member/training-program');
    return validateTrainingPrograms(data);
  }
};
