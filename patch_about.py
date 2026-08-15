with open('src/admin/pages/homepage/AboutEditor.tsx', 'r') as f:
    content = f.read()

# Replace one by one
content = content.replace(
'''<input type="text" maxLength={140} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.headline_primary || ''}''',
'''<input type="text" maxLength={120} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.headline_primary || ''}'''
)

content = content.replace(
'''<input type="text" maxLength={140} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.headline_emphasis || ''}''',
'''<input type="text" maxLength={120} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.headline_emphasis || ''}'''
)

content = content.replace(
'''<textarea rows={4} maxLength={600} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm resize-none"
                value={data.paragraph_primary || ''}''',
'''<textarea rows={4} maxLength={1200} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm resize-none"
                value={data.paragraph_primary || ''}'''
)

content = content.replace(
'''<textarea rows={4} maxLength={600} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm resize-none"
                value={data.paragraph_secondary || ''}''',
'''<textarea rows={4} maxLength={1200} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm resize-none"
                value={data.paragraph_secondary || ''}'''
)

content = content.replace(
'''<input type="text" maxLength={140} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.youtube_title || ''}''',
'''<input type="text" maxLength={120} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"
                  value={data.youtube_title || ''}'''
)

with open('src/admin/pages/homepage/AboutEditor.tsx', 'w') as f:
    f.write(content)
