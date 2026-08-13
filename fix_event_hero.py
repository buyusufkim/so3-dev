import re

with open('src/features/marketing/events/EventDetailHero.tsx', 'r') as f:
    content = f.read()

content = content.replace('import { SO3Event } from "./events.data";\n', '')
content = content.replace(
    'const cover = event.cover_url || event.coverImage;',
    'const cover = event.cover?.url || event.cover_url || event.coverImage;'
)
content = content.replace(
    "const category = event.category_name || event.categoryLabel || 'Etkinlik';",
    "const category = event.category?.name || event.category_name || 'Etkinlik';"
)
content = content.replace(
    'alt={event.title}',
    'alt={event.cover?.alt_text || event.title}'
)

with open('src/features/marketing/events/EventDetailHero.tsx', 'w') as f:
    f.write(content)
