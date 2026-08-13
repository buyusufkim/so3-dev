import re

with open('src/admin/pages/events/AdminEventEditor.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<MediaPicker \n        open={pickerOpen} \n        onClose={() => setPickerOpen(false)} \n        onSelect={handleMediaSelect}\n        mode={pickerMode}\n      />',
    '<MediaPicker \n        open={pickerOpen} \n        onClose={() => setPickerOpen(false)} \n        onSelect={handleMediaSelect}\n        mode={pickerMode}\n        selectedIds={pickerTarget === "cover" ? (formData.cover_media_id ? [formData.cover_media_id] : []) : gallery.map(g => g.id)}\n      />'
)

with open('src/admin/pages/events/AdminEventEditor.tsx', 'w') as f:
    f.write(content)
