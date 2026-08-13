import re

with open('src/pages/public/EventDetailPage.tsx', 'r') as f:
    content = f.read()

# Fix imports
content = content.replace('import { getEventBySlug } from "../../features/marketing/events/events.data";\n', '')

# Fix fetch logic
fetch_logic = """
    async function fetchEventDetail() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/events/${slug}`);
        if (!res.ok) {
          if (res.status === 404) {
            setNotFound(true);
            return;
          }
          throw new Error("API Error");
        }
        const json = await res.json();
        setEvent(json.data);
        setNotFound(false);
      } catch (err) {
        if (import.meta.env.DEV) {
          import('../../features/marketing/events/events.data').then(m => {
            const staticFallback = slug ? m.getEventBySlug(slug) : undefined;
            if (staticFallback) {
              setEvent(staticFallback);
              setNotFound(false);
            } else {
              setNotFound(true);
            }
          }).catch(() => setNotFound(true));
        } else {
          setEvent(null);
        }
      } finally {
        setLoading(false);
      }
    }
"""

content = re.sub(
    r'    async function fetchEventDetail\(\) \{.*?    \}',
    fetch_logic.strip(),
    content,
    flags=re.DOTALL
)

# Update SEO and cover
content = content.replace('const coverImg = event.cover_url || event.coverImage;', 'const coverImg = event.cover?.url || event.cover_url;')

# Add safety fallback message for null event if not 404
content = content.replace(
    '  if (notFound || !event) {',
    '  if (notFound) {'
)
content = content.replace(
    """  const seoTitle = event.seo_title || `${event.title} | SO3 Personal Training`;""",
    """  if (!event) {
    return (
      <main className="w-full flex items-center justify-center min-h-screen bg-[#0A0A0A] text-white">
        <div className="text-red-400 font-medium">Etkinlik yüklenemedi.</div>
      </main>
    );
  }

  const seoTitle = event.seo_title || `${event.title} | SO3 Personal Training`;"""
)

with open('src/pages/public/EventDetailPage.tsx', 'w') as f:
    f.write(content)
