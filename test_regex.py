import re
with open('database/migrations/018_seed_homepage_content_why_process.sql', 'r') as f:
    text = f.read()

m = re.search(r"UPDATE homepage_sections SET content_json = '(\{.*?\})'\s*WHERE section_id = 'why_so3'", text, flags=re.DOTALL)
print("Matched:", bool(m))
if not m:
    print(repr(text))
