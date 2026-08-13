import re

with open('src/admin/components/MediaPicker.tsx', 'r') as f:
    content = f.read()

# Props update
content = content.replace(
    "  mode?: 'image' | 'video' | 'all';",
    "  mode?: 'image' | 'video' | 'all';\n  selectedIds?: number[];"
)
content = content.replace(
    "export function MediaPicker({ open, onClose, onSelect, mode = 'all' }: MediaPickerProps) {",
    "export function MediaPicker({ open, onClose, onSelect, mode = 'all', selectedIds = [] }: MediaPickerProps) {"
)

# Add selectedType state
content = content.replace(
    "  const [totalPages, setTotalPages] = useState(1);",
    "  const [totalPages, setTotalPages] = useState(1);\n  const [selectedType, setSelectedType] = useState('');"
)

# Update fetchAssets
content = content.replace(
    "      if (mode !== 'all') typeParam = `&type=${mode}`;",
    "      if (mode !== 'all') { typeParam = `&type=${mode}`; } else if (selectedType) { typeParam = `&type=${selectedType}`; }"
)

# Update useEffect
content = content.replace(
    "  }, [open, search, mode]);",
    "  }, [open, search, mode, selectedType]);"
)

# UI update for filter
filter_ui = """
        <div className="p-4 border-b border-white/5 flex gap-4 bg-[#1a1a1a]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text" 
              placeholder="Dosya adı, başlık..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-black/20 border border-white/10 rounded pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>
          {mode === 'all' && (
            <select 
              value={selectedType}
              onChange={e => { setSelectedType(e.target.value); setPage(1); }}
              className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 appearance-none min-w-[120px]"
            >
              <option value="">Tümü</option>
              <option value="image">Görseller</option>
              <option value="video">Videolar</option>
            </select>
          )}
        </div>
"""

content = re.sub(r'        <div className="p-4 border-b border-white/5 flex gap-4 bg-\[#1a1a1a\]">.*?</div>\n        </div>', filter_ui, content, flags=re.DOTALL)

# Add selected state check
content = content.replace(
    'key={asset.id}',
    'key={asset.id}'
)
content = content.replace(
    'onClick={() => onSelect(asset)}',
    'onClick={() => !selectedIds.includes(asset.id) && onSelect(asset)}'
)
content = content.replace(
    'className="group relative aspect-square bg-[#121212] border border-white/10 rounded overflow-hidden cursor-pointer hover:border-white/40 transition-colors"',
    'className={`group relative aspect-square bg-[#121212] border rounded overflow-hidden transition-colors ${selectedIds.includes(asset.id) ? "border-green-500 cursor-default" : "border-white/10 cursor-pointer hover:border-white/40"}`}'
)
content = content.replace(
    '<span className="bg-black/80 text-white text-xs px-3 py-1.5 rounded font-medium backdrop-blur-sm border border-white/10 shadow-xl">Seç</span>',
    '{selectedIds.includes(asset.id) ? <span className="bg-green-500 text-white text-xs px-3 py-1.5 rounded font-medium shadow-xl flex items-center gap-1">Seçildi</span> : <span className="bg-black/80 text-white text-xs px-3 py-1.5 rounded font-medium backdrop-blur-sm border border-white/10 shadow-xl">Seç</span>}'
)


with open('src/admin/components/MediaPicker.tsx', 'w') as f:
    f.write(content)
