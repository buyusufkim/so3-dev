import re

with open('src/features/marketing/events/EventArchive.tsx', 'r') as f:
    content = f.read()

# Replace imports
content = content.replace('import { EVENTS_DATA } from "./events.data";\n', '')
content = content.replace('import { EventCard, EventCardData } from "./EventCard";', 'import { EventCard, PublicEvent } from "./EventCard";')
content = content.replace('EventCardData', 'PublicEvent')
content = content.replace('events.data.length', 'events.items.length')

fetch_logic = """
        const res = await fetch('/api/public/events?limit=50');
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        if (data.data && data.data.items) {
          setEvents(data.data.items);
        } else {
          setEvents([]);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          import('./events.data').then(m => setEvents(m.EVENTS_DATA as unknown as PublicEvent[]));
        } else {
          setEvents([]);
        }
      } finally {
"""

content = re.sub(
    r"        const res = await fetch\('/api/public/events\?limit=50'\);.*?finally \{",
    fetch_logic,
    content,
    flags=re.DOTALL
)

with open('src/features/marketing/events/EventArchive.tsx', 'w') as f:
    f.write(content)
