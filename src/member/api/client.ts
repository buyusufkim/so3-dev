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
  validateTrainingPrograms,
  validateMemberLoginResponse,
  MemberLoginResponse,
  isRecord
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

function unwrapSuccessEnvelope(json: unknown): unknown {
  if (!isRecord(json)) throw new MemberApiError('Geçersiz sunucu yanıtı.', 500, 'INVALID_RESPONSE');
  if (!('data' in json)) throw new MemberApiError('Geçersiz sunucu yanıtı.', 500, 'INVALID_RESPONSE');
  return json.data;
}

async function fetchCsrfToken(signal?: AbortSignal): Promise<string> {
  if (csrfTokenCache) return csrfTokenCache;

  const res = await fetch('/api/member-auth/csrf', { signal });
  if (!res.ok) {
    throw new MemberApiError('Güvenlik jetonu alınamadı.', res.status, 'CSRF_FAILED');
  }

  const json = await res.json();
  const data = unwrapSuccessEnvelope(json);

  if (!isRecord(data) || typeof data.csrf_token !== 'string' || !data.csrf_token.trim()) {
    throw new MemberApiError('Geçersiz güvenlik jetonu.', 500, 'CSRF_INVALID');
  }
  
  csrfTokenCache = data.csrf_token.trim();
  return csrfTokenCache;
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
    const csrfToken = await fetchCsrfToken(options.signal ?? undefined);
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

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      if (!res.ok) {
        throw new MemberApiError('Bir hata oluştu.', res.status, 'UNKNOWN_ERROR');
      }
      return null;
    }

    if (!res.ok) {
      if (isRecord(json) && isRecord(json.error)) {
        const errorObj = json.error;
        const message = typeof errorObj.message === 'string' ? errorObj.message : 'Bir hata oluştu.';
        const code = typeof errorObj.code === 'string' ? errorObj.code : 'UNKNOWN_ERROR';
        const details = errorObj.details;
        throw new MemberApiError(message, res.status, code, details);
      }
      throw new MemberApiError('Bir hata oluştu.', res.status, 'UNKNOWN_ERROR');
    }

    return unwrapSuccessEnvelope(json);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (err instanceof MemberApiError) throw err;
    throw new MemberApiError('Bağlantı hatası.', 0, 'NETWORK_ERROR');
  }
}

export const memberApiClient = {
  async login(username: string, password: string, signal?: AbortSignal): Promise<MemberLoginResponse> {
    const data = await request('/api/member-auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      signal
    });
    clearMemberCsrfCache();
    return validateMemberLoginResponse(data);
  },

  async me(signal?: AbortSignal): Promise<MemberAuthIdentity> {
    const data = await request('/api/member-auth/me', { signal });
    return validateMemberAuthIdentity(data);
  },

  async logout(signal?: AbortSignal): Promise<void> {
    const data = await request('/api/member-auth/logout', { method: 'POST', signal });
    clearMemberCsrfCache();
    if (!isRecord(data) || data.success !== true) {
      throw new MemberApiError('Geçersiz sunucu yanıtı.', 500, 'INVALID_RESPONSE');
    }
  },

  async changePassword(currentPassword: string, newPassword: string, signal?: AbortSignal): Promise<void> {
    const data = await request('/api/member-auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      signal
    });
    clearMemberCsrfCache();
    if (!isRecord(data) || data.success !== true) {
      throw new MemberApiError('Geçersiz sunucu yanıtı.', 500, 'INVALID_RESPONSE');
    }
  },

  async getOverview(signal?: AbortSignal): Promise<MemberOverview> {
    const data = await request('/api/member/overview', { signal });
    return validateMemberOverview(data);
  },

  async getSessionPackages(signal?: AbortSignal): Promise<MemberSessionPackage[]> {
    const data = await request('/api/member/session-packages', { signal });
    return validateSessionPackages(data);
  },

  async getAppointments(signal?: AbortSignal): Promise<MemberAppointmentsData> {
    const data = await request('/api/member/appointments', { signal });
    return validateAppointments(data);
  },

  async getTrainingPrograms(signal?: AbortSignal): Promise<MemberTrainingProgram[]> {
    const data = await request('/api/member/training-program', { signal });
    return validateTrainingPrograms(data);
  }
};
