import { FIXTURES } from './devFixtures';

// THIS ADAPTER EXISTS ONLY FOR AI STUDIO / VITE DEVELOPMENT PREVIEW
// IT NEVER RUNS IN PRODUCTION.
// IT INTERCEPTS FAILED PUBLIC API REQUESTS AND PROVIDES FIXTURE DATA

export function initDevFallback() {
  if (!import.meta.env.DEV) {
    return;
  }

  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
    
    try {
      const response = await originalFetch(input, init);
      if (response.ok) {
        return response;
      }
      
      return handleDevFallback(url, response);
    } catch (error) {
      return handleDevFallback(url, null, error);
    }
  };

  // Gracefully handle missing images without breaking layout or using base64
  window.addEventListener('error', function(e) {
    if (e.target instanceof HTMLImageElement) {
        if (!e.target.dataset.fallbackApplied) {
            e.target.dataset.fallbackApplied = 'true';
            // Simple transparent SVG to prevent broken image icon without base64
            e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>';
        }
    }
  }, true);
}

function handleDevFallback(url: string, originalResponse: Response | null, error?: any): Response {
    try {
        const urlObj = new URL(url, window.location.origin);
        const path = urlObj.pathname;
        
        if (!path.startsWith('/api/public/')) {
            if (originalResponse) return originalResponse;
            throw error || new Error('Network error');
        }
        
        console.warn(`[DEV FALLBACK] Intercepted failed public API request: ${path}. Using fixture data.`);
        
        let data: any = null;
        
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
                filteredEvents = filteredEvents.filter(e => e.is_featured);
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
            const event = FIXTURES.EVENTS.find(e => e.slug === slug);
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
