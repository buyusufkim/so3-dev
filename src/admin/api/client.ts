export class ApiError extends Error {
  status: number;
  code?: string;
  data?: unknown;

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export const apiClient = {
  csrfToken: null as string | null,

  async getCsrf() {
    if (this.csrfToken) return this.csrfToken;
    const res = await fetch('/api/auth/csrf');
    const data = await res.json();
    this.csrfToken = data.data.token;
    return this.csrfToken;
  },

  clearAuth() {
    this.csrfToken = null;
  },

  async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
      const token = await this.getCsrf();
      if (token) {
        headers['X-CSRF-Token'] = token;
      }
    }

    const config: RequestInit = {
      ...options,
      headers
    };

    const response = await fetch(endpoint, config);
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        this.clearAuth();
        // Trigger a custom event to notify layout/router
        window.dispatchEvent(new Event('so3_auth_expired'));
      }
      
      let msg = 'Bir hata oluştu.';
      let code: string | undefined;

      if (json.error) {
        if (typeof json.error === 'string') {
          msg = json.error;
        } else if (typeof json.error === 'object') {
          msg = json.error.message || msg;
          code = json.error.code;
        }
      } else if (json.data && json.data.error) {
        if (typeof json.data.error === 'string') {
          msg = json.data.error;
        } else if (typeof json.data.error === 'object') {
          msg = json.data.error.message || msg;
          code = json.data.error.code;
        }
      }

      throw new ApiError(msg, response.status, code, json);
    }

    return json.data;
  },

  get(endpoint: string, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint: string, body: any, options = {}) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body)
    });
  },

  patch(endpoint: string, body: any, options = {}) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : JSON.stringify(body)
    });
  },

  delete(endpoint: string, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
};
