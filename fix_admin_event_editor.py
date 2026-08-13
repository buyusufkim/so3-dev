import re

with open('src/admin/pages/events/AdminEventEditor.tsx', 'r') as f:
    content = f.read()

# Add import
content = content.replace(
    'import { MediaPicker } from "../../components/MediaPicker";',
    'import { MediaPicker } from "../../components/MediaPicker";\nimport { generateTurkishSlug } from "../../utils/slug";'
)

# Add slugTouched state
content = content.replace(
    '  const [errors, setErrors] = useState<Record<string, string>>({});',
    '  const [errors, setErrors] = useState<Record<string, string>>({});\n  const [slugTouched, setSlugTouched] = useState(!isNew);'
)

# Update formData init
content = content.replace(
    'setCoverPreview(ev.cover_thumbnail_url || ev.cover_url || null);',
    'setCoverPreview(ev.cover_thumbnail_url || ev.cover_url || null);\n          if (ev.slug) setSlugTouched(true);'
)

# Update handleChange
handle_change_new = """  const handleChange = (field: string, value: any) => {
    isDirtyRef.current = true;
    
    if (field === 'slug') {
      setSlugTouched(true);
    }
    
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'title' && !slugTouched) {
        next.slug = generateTurkishSlug(value);
      }
      return next;
    });
  };"""

content = re.sub(r'  const handleChange = \(field: string, value: any\) => \{.*?\n  \};\n', handle_change_new + '\n', content, flags=re.DOTALL)

with open('src/admin/pages/events/AdminEventEditor.tsx', 'w') as f:
    f.write(content)
