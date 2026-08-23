export async function adminApiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  // If not DEV, always use native fetch directly
  if (!import.meta.env.DEV) {
    return fetch(endpoint, options);
  }

  let res: Response | null = null;
  let needsFallback = false;

  try {
    res = await fetch(endpoint, options);
    // Vite SPA fallback returns 200 with HTML instead of JSON for non-existent backend routes
    const contentType = res.headers.get('content-type') || '';
    if (res.status === 404 || res.status === 502 || res.status === 503) {
      needsFallback = true;
    } else if (contentType.includes('text/html')) {
      needsFallback = true;
    } else {
      // It's a real JSON response (even if 401, 403, 422, etc.), return it
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
                     endpoint.startsWith('/api/admin/trainers') ||
                     endpoint.startsWith('/api/admin/dashboard') ||
                     endpoint.startsWith('/api/trainer/members');
                     
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
