import re

with open('src/features/marketing/events/EventCard.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'export interface PublicEvent \{.*?\n\}', 
    '''export interface PublicEvent {
  slug: string;
  title: string;
  category_name?: string;
  cover_url?: string | null;
  cover_thumbnail_url?: string | null;
  cover_alt_text?: string | null;
  excerpt?: string | null;
  event_date?: string | null;
  location?: string | null;
}''', 
    content, 
    flags=re.DOTALL
)

with open('src/features/marketing/events/EventCard.tsx', 'w') as f:
    f.write(content)
