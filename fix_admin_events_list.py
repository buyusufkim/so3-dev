import re

with open('src/admin/pages/events/AdminEventsList.tsx', 'r') as f:
    content = f.read()

# Add states
states_addition = """  const [category, setCategory] = useState("");
  const [featured, setFeatured] = useState("");
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);

  useEffect(() => {
    apiClient.get('/api/admin/event-categories').then(res => setCategories(res.data)).catch(console.error);
  }, []);
"""
content = content.replace('  const [deleted, setDeleted] = useState("false");', '  const [deleted, setDeleted] = useState("false");\n' + states_addition)

# Update fetchEvents
content = content.replace(
    'const res = await apiClient.get(`/api/admin/events?page=${page}&limit=20&search=${encodeURIComponent(search)}&status=${status}&deleted=${deleted}`);',
    'const res = await apiClient.get(`/api/admin/events?page=${page}&limit=20&search=${encodeURIComponent(search)}&status=${status}&deleted=${deleted}&category=${category}&featured=${featured}`);'
)

# Update useEffect dependencies
content = content.replace(
    '  }, [page, search, status, deleted]);',
    '  }, [page, search, status, deleted, category, featured]);'
)

# Add filters to UI
filters_ui = """          <select 
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 appearance-none min-w-[120px]"
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select 
            value={featured}
            onChange={(e) => { setFeatured(e.target.value); setPage(1); }}
            className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 appearance-none min-w-[120px]"
          >
            <option value="">Tüm Vitrin</option>
            <option value="1">Vitrinde</option>
            <option value="0">Vitrinde Değil</option>
          </select>
"""
content = content.replace(
    """          <select 
            value={status}""",
    filters_ui + """          <select 
            value={status}"""
)

# Add "Son Güncelleme" column header
content = content.replace(
    '<th className="px-6 py-4 font-medium">Tarih</th>',
    '<th className="px-6 py-4 font-medium">Tarih</th>\n                <th className="px-6 py-4 font-medium">Son Güncelleme</th>'
)

# Add "Son Güncelleme" column cell
col_cell = """                    <td className="px-6 py-4 text-white/70">
                      {event.updated_at ? new Date(event.updated_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>"""

content = content.replace(
    """                    <td className="px-6 py-4 text-white/70">
                      {event.event_date ? new Date(event.event_date).toLocaleDateString('tr-TR') : '-'}
                    </td>""",
    """                    <td className="px-6 py-4 text-white/70">
                      {event.event_date ? new Date(event.event_date).toLocaleDateString('tr-TR') : '-'}
                    </td>\n""" + col_cell
)

# Update colSpan
content = content.replace('colSpan={6}', 'colSpan={7}')

with open('src/admin/pages/events/AdminEventsList.tsx', 'w') as f:
    f.write(content)
