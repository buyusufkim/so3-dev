export async function adminApiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  // If not DEV, always use native fetch directly
  if (!import.meta.env.DEV) {
    return fetch(endpoint, options);
  }

  let res: Response | null = null;
  let needsFallback = false;

  try {
    res = await fetch(endpoint, options);
    const contentType = res.headers.get('content-type') || '';

    // If it is explicitly JSON, it is a real API response (even 404, 502, 503)
    if (contentType.includes('application/json')) {
      return res;
    }

    // Vite SPA fallback returns 200 with HTML instead of JSON for non-existent backend routes
    if (res.status === 404 || res.status === 502 || res.status === 503) {
      needsFallback = true;
    } else if (contentType.includes('text/html')) {
      needsFallback = true;
    } else {
      // It's a real response, return it
      return res;
    }
  } catch (e) {
    // Network error (e.g. backend down completely)
    needsFallback = true;
  }

  if (needsFallback) {
    // Only intercept specific admin / auth routes
    const isTarget = endpoint.startsWith('/api/auth/') ||
                     endpoint.startsWith('/api/admin/members') ||
                     endpoint.match(/^\/api\/admin\/member-measurements(?:\/|$)/) ||
                     endpoint.startsWith('/api/admin/trainers') ||
                     endpoint.startsWith('/api/admin/trainer-accounts') ||
                     endpoint.startsWith('/api/admin/dashboard') ||
                     endpoint.startsWith('/api/trainer/members') ||
                     endpoint.startsWith('/api/trainer/training-programs') ||
                     endpoint.startsWith('/api/trainer/program-exercises') ||
                     endpoint.startsWith('/api/admin/training-programs') ||
                     endpoint.startsWith('/api/admin/program-exercises');
                     
    if (isTarget) {
      const modulePath = "./adminDevFixtures.ts";
      // Dynamically import fixtures only when needed in DEV
      const { handleAdminFallback } = await import(/* @vite-ignore */ modulePath);
      return handleAdminFallback(endpoint, options || {});
    }
  }

  if (res) return res;
  throw new Error('Network error and no fallback available.');
}
