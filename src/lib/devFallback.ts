// THIS ADAPTER EXISTS ONLY FOR AI STUDIO / VITE DEVELOPMENT PREVIEW
// IT NEVER RUNS IN PRODUCTION.
// IT INTERCEPTS FAILED PUBLIC API REQUESTS AND PROVIDES FIXTURE DATA

export async function publicApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
  
  try {
    const response = await fetch(input, init);
    if (response.ok || !import.meta.env.DEV) {
      return response;
    }
    return handleDevFallback(url, response);
  } catch (error) {
    if (!import.meta.env.DEV) {
      throw error;
    }
    return handleDevFallback(url, null, error);
  }
}

async function handleDevFallback(url: string, originalResponse: Response | null, error?: unknown): Promise<Response> {
    try {
        const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
        const path = urlObj.pathname;
        
        if (!path.startsWith('/api/public/')) {
            if (originalResponse) return originalResponse;
            throw error || new Error('Network error');
        }
        
        console.warn(`[DEV FALLBACK] Intercepted failed public API request: ${path}. Using fixture data.`);
        
        // Hide import from static analysis
        const fixturePath = './devFixtures.ts';
        const module = await import(/* @vite-ignore */ fixturePath);
        const FIXTURES = module.FIXTURES;
        
        let data: unknown = null;
        
        if (path === '/api/public/homepage') {
            data = FIXTURES.HOMEPAGE_ORDER;
        } else if (path === '/api/public/homepage/content') {
            data = FIXTURES.HOMEPAGE_CONTENT;
        } else if (path === '/api/public/site-settings') {
            data = FIXTURES.SITE_SETTINGS;
        } else if (path === '/api/public/branches') {
            data = FIXTURES.BRANCHES;
        } else if (path === '/api/public/trainers') {
            data = FIXTURES.TRAINERS;
        } else if (path === '/api/public/events') {
            let filteredEvents = [...FIXTURES.EVENTS];
            const featured = urlObj.searchParams.get('featured');
            if (featured === '1') {
                filteredEvents = filteredEvents.filter((e: { is_featured: boolean; featured_order: number | null }) => e.is_featured);
                filteredEvents.sort((a, b) => (a.featured_order || 999) - (b.featured_order || 999));
            }
            
            const limit = urlObj.searchParams.get('limit');
            if (limit) {
                filteredEvents = filteredEvents.slice(0, parseInt(limit, 10));
            }
            data = filteredEvents;
        } else if (path === '/api/public/event-categories') {
            data = FIXTURES.EVENT_CATEGORIES;
        } else if (path.startsWith('/api/public/events/')) {
            const slug = path.split('/').pop();
            const event = FIXTURES.EVENTS.find((e: { slug: string }) => e.slug === slug);
            if (event) {
                data = event;
            } else {
                return new Response(JSON.stringify({ error: 'Not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } else {
            if (originalResponse) return originalResponse;
            throw error || new Error('Network error');
        }
        
        return new Response(JSON.stringify({ data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        if (originalResponse) return originalResponse;
        throw error || new Error('Network error');
    }
}
