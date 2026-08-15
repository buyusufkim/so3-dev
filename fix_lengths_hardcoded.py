import re

files_to_fix = [
    ('src/admin/pages/homepage/AboutEditor.tsx', [
        ("maxLength={140}", "maxLength={120}", "headline_primary"),
        ("maxLength={140}", "maxLength={120}", "headline_emphasis"),
        ("maxLength={600}", "maxLength={1200}", "paragraph_primary"),
        ("maxLength={600}", "maxLength={1200}", "paragraph_secondary"),
        ("maxLength={140}", "maxLength={120}", "youtube_title")
    ]),
    ('src/admin/pages/homepage/HeroEditor.tsx', [
        ("maxLength={160}", "maxLength={100}", "headline_primary"),
        ("maxLength={160}", "maxLength={100}", "headline_emphasis"),
        ("maxLength={200}", "maxLength={180}", "support_text")
    ]),
    ('src/admin/pages/homepage/ProcessEditor.tsx', [
        ("maxLength={100}", "maxLength={180}", "step")
    ]),
    ('src/admin/pages/homepage/ContactEditor.tsx', [
        ("maxLength={100}", "maxLength={120}", "contact_headline_primary"),
        ("maxLength={100}", "maxLength={120}", "contact_headline_emphasis"),
        ("maxLength={100}", "maxLength={120}", "consultation_headline_primary"),
        ("maxLength={100}", "maxLength={120}", "consultation_headline_emphasis"),
        ("maxLength={200}", "maxLength={400}", "consultation_intro_primary"),
        ("maxLength={200}", "maxLength={400}", "consultation_intro_secondary")
    ]),
    ('src/admin/pages/homepage/InstagramEditor.tsx', [
        ("maxLength={500}", "maxLength={400}", "intro")
    ])
]

for filepath, replacements in files_to_fix:
    with open(filepath, 'r') as f:
        content = f.read()

    # Need a smarter way to just find and replace within lines having the specific property, 
    # but some are spread across lines. 
    # Actually, we can split into lines and scan for the matching variable, then update previous/current line's maxLength.
    
    lines = content.split('\n')
    
    for old, new, var in replacements:
        for i, line in enumerate(lines):
            # check if line or next lines contain the var
            # This is tricky because the input could be `<input type="text" maxLength={140}` and next line is `value={data.headline_primary}`
            pass
            
    # Alternative: just read the whole file, use regex that captures up to a few newlines
    # e.g., r'maxLength=\{140\}(.*?headline_primary)' -> new + group(1)
    
    for old, new, var in replacements:
        old_val = old.replace('{', r'\{').replace('}', r'\}')
        pattern1 = old_val + r'((?:.|\n){1,100}?' + var + r')'
        content = re.sub(pattern1, new + r'\1', content)
        
        # What if var comes before maxLength?
        pattern2 = r'(' + var + r'(?:.|\n){1,100}?)' + old_val
        content = re.sub(pattern2, r'\1' + new, content)

    with open(filepath, 'w') as f:
        f.write(content)

