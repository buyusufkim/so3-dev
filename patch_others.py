def replace_in_file(path, replacements):
    with open(path, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)

# HeroEditor
replace_in_file('src/admin/pages/homepage/HeroEditor.tsx', [
    ('maxLength={160} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                  value={data.headline_primary || \'\'}', 'maxLength={100} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                  value={data.headline_primary || \'\'}'),
    ('maxLength={160} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                  value={data.headline_emphasis || \'\'}', 'maxLength={100} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                  value={data.headline_emphasis || \'\'}'),
    ('maxLength={200} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                value={data.support_text || \'\'}', 'maxLength={180} className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                value={data.support_text || \'\'}')
])

# ProcessEditor
replace_in_file('src/admin/pages/homepage/ProcessEditor.tsx', [
    ('maxLength={100}\n                        className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"', 'maxLength={180}\n                        className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"')
])

# ContactEditor
replace_in_file('src/admin/pages/homepage/ContactEditor.tsx', [
    ('maxLength={100}\n                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                      value={data.contact_headline_primary || \'\'}', 'maxLength={120}\n                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                      value={data.contact_headline_primary || \'\'}'),
    ('maxLength={100}\n                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                      value={data.contact_headline_emphasis || \'\'}', 'maxLength={120}\n                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                      value={data.contact_headline_emphasis || \'\'}'),
    ('maxLength={100}\n                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                      value={data.consultation_headline_primary || \'\'}', 'maxLength={120}\n                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                      value={data.consultation_headline_primary || \'\'}'),
    ('maxLength={100}\n                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                      value={data.consultation_headline_emphasis || \'\'}', 'maxLength={120}\n                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                      value={data.consultation_headline_emphasis || \'\'}'),
    ('maxLength={200}\n                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                      value={data.consultation_intro_primary || \'\'}', 'maxLength={400}\n                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                      value={data.consultation_intro_primary || \'\'}'),
    ('maxLength={200}\n                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                      value={data.consultation_intro_secondary || \'\'}', 'maxLength={400}\n                      className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                      value={data.consultation_intro_secondary || \'\'}')
])

# InstagramEditor
replace_in_file('src/admin/pages/homepage/InstagramEditor.tsx', [
    ('maxLength={500}\n                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm resize-none"\n                    value={data.intro || \'\'}', 'maxLength={400}\n                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm resize-none"\n                    value={data.intro || \'\'}')
])

