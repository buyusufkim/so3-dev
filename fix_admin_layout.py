import re

with open('src/admin/layouts/AdminLayout.tsx', 'r') as f:
    content = f.read()

# Replace Etkinlikler link
content = content.replace(
    '<span className="flex items-center px-2 py-2 text-sm text-white/30 cursor-not-allowed">Etkinlikler</span>',
    ''
)

content = content.replace(
    '<Link to="/admin/media" className="flex items-center px-2 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white rounded transition">Medya</Link>',
    '<Link to="/admin/events" className="flex items-center px-2 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white rounded transition">Etkinlikler</Link>\n              <Link to="/admin/media" className="flex items-center px-2 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white rounded transition">Medya</Link>'
)

with open('src/admin/layouts/AdminLayout.tsx', 'w') as f:
    f.write(content)
