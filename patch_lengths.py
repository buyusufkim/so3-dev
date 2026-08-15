import re

def update_file(path, replacements):
    with open(path, 'r') as f:
        content = f.read()

    for old, new in replacements:
        if callable(old):
            content = old(content)
        else:
            if not isinstance(old, str):
                content = re.sub(old, new, content)
            else:
                content = content.replace(old, new)

    with open(path, 'w') as f:
        f.write(content)

# HeroEditor
update_file('src/admin/pages/homepage/HeroEditor.tsx', [
    (r'value=\{data\.headline_primary\}\n\s*onChange=\{\(e\) => handleChange\(\'headline_primary\', e\.target\.value\)\}\n\s*className="[^"]*"\n\s*maxLength=\{160\}',
     'value={data.headline_primary}\n                    onChange={(e) => handleChange(\'headline_primary\', e.target.value)}\n                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                    maxLength={100}'),
    (r'value=\{data\.headline_emphasis\}\n\s*onChange=\{\(e\) => handleChange\(\'headline_emphasis\', e\.target\.value\)\}\n\s*className="[^"]*"\n\s*maxLength=\{160\}',
     'value={data.headline_emphasis}\n                    onChange={(e) => handleChange(\'headline_emphasis\', e.target.value)}\n                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                    maxLength={100}'),
    (r'value=\{data\.support_text\}\n\s*onChange=\{\(e\) => handleChange\(\'support_text\', e\.target\.value\)\}\n\s*className="[^"]*"\n\s*maxLength=\{200\}',
     'value={data.support_text}\n                    onChange={(e) => handleChange(\'support_text\', e.target.value)}\n                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm"\n                    maxLength={180}'),
])

# Let's use a simpler method for replacing exact max lengths by finding the input block.
def replace_maxlength(content, field_name, new_length):
    # This regex looks for handleChange('field_name' ... followed by maxLength={X} or preceded by it within the same input tag
    # Actually, we can just replace the maxLength in the specific line if we can target it.
    pass

