import re

with open('src/features/marketing/events/EventRelated.tsx', 'r') as f:
    content = f.read()

# Replace imports
content = content.replace('import { getRelatedEvents } from "./events.data";\n', '')
content = content.replace('import { EventCard, EventCardData } from "./EventCard";', 'import { EventCard, PublicEvent } from "./EventCard";')
content = content.replace('EventCardData', 'PublicEvent')

fetch_logic = """
    async function fetchRelated() {
      try {
        const res = await fetch('/api/public/events?limit=10');
        if (!res.ok) throw new Error('API Error');
        const json = await res.json();
        if (json.data && json.data.items) {
          const filtered = json.data.items
            .filter((e: any) => e.slug !== currentSlug)
            .slice(0, 3);
          setRelatedEvents(filtered);
        } else {
          setRelatedEvents([]);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          import('./events.data').then(m => {
             setRelatedEvents(m.getRelatedEvents(currentSlug, 3) as unknown as PublicEvent[]);
          }).catch(() => setRelatedEvents([]));
        } else {
          setRelatedEvents([]);
        }
      }
    }
"""

content = re.sub(
    r'    async function fetchRelated\(\) \{.*?    \}',
    fetch_logic.strip(),
    content,
    flags=re.DOTALL
)

with open('src/features/marketing/events/EventRelated.tsx', 'w') as f:
    f.write(content)
