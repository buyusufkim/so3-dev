import re
import glob

limits = {
    'HeroEditor.tsx': {
        'eyebrow': 80,
        'headline_primary': 100,
        'headline_emphasis': 100,
        'support_text': 180,
        'feature_left': 80,
        'feature_right': 80,
        'primary_cta_label': 60,
        'secondary_cta_label': 60,
        'primary_cta_target': 200,
        'secondary_cta_target': 200,
    },
    'BrandBandEditor.tsx': {}, # handled manually if needed
    'AboutEditor.tsx': {
        'eyebrow': 80,
        'headline_primary': 120,
        'headline_emphasis': 120,
        'paragraph_primary': 1200,
        'paragraph_secondary': 1200,
        'youtube_title': 120,
        'youtube_video_id': 20
    },
    'WhySo3Editor.tsx': {
        'eyebrow': 80,
        'headline_primary': 140,
        'headline_emphasis': 140,
        'intro': 400,
    },
    'ProcessEditor.tsx': {
        'eyebrow': 80,
        'headline_primary': 140,
        'headline_emphasis': 140,
    },
    'ContactEditor.tsx': {
        'contact_eyebrow': 80,
        'contact_headline_primary': 120,
        'contact_headline_emphasis': 120,
        'directions_cta_label': 80,
        'consultation_eyebrow': 80,
        'consultation_headline_primary': 120,
        'consultation_headline_emphasis': 120,
        'consultation_intro_primary': 400,
        'consultation_intro_secondary': 400
    },
    'TourEditor.tsx': {
        'eyebrow': 80,
        'headline': 160,
        'intro': 300
    },
    'InstagramEditor.tsx': {
        'eyebrow': 80,
        'headline': 160,
        'intro': 400,
        'cta_label': 80,
        'placeholder_text': 300
    },
    'CommunityEditor.tsx': {
        'eyebrow': 80,
        'headline': 160,
        'intro': 500,
        'cta_label': 80
    },
    'TrainersEditor.tsx': {
        'eyebrow': 80,
        'headline': 160,
        'intro': 300
    },
    'BranchesEditor.tsx': {
        'eyebrow': 80,
        'headline_primary': 140,
        'headline_emphasis': 140,
        'gallery_cta_label': 60
    },
    'PerformanceEditor.tsx': {
        'headline_primary': 140,
        'headline_emphasis': 140,
        'description': 500
    }
}

for filepath in glob.glob('src/admin/pages/homepage/*Editor.tsx'):
    filename = filepath.split('/')[-1]
    
    with open(filepath, 'r') as f:
        content = f.read()

    # Generic replace for state fields
    if filename in limits:
        for field, maxlen in limits[filename].items():
            # Find the input/textarea tag that binds to `data.field` or similar.
            # Usually looks like:
            # onChange={(e) => handleChange('field', e.target.value)}
            # We want to replace maxLength={X} with maxLength={maxlen} within the same tag block.
            
            # Use regex to find the whole tag
            pattern = r'(<(?:input|textarea)[^>]*?onChange=\{\(e\)\s*=>\s*handleChange\(\'' + field + r'\'[^>]*?>)'
            
            def repl(match):
                tag = match.group(1)
                if 'maxLength={' in tag:
                    tag = re.sub(r'maxLength=\{\d+\}', f'maxLength={{{maxlen}}}', tag)
                else:
                    # Insert maxLength just before className or at the end
                    if 'className=' in tag:
                        tag = tag.replace('className=', f'maxLength={{{maxlen}}} className=')
                    else:
                        tag = tag.replace('>', f' maxLength={{{maxlen}}}>')
                return tag
                
            content = re.sub(pattern, repl, content)

    # For array items (WhySo3, Process)
    if filename == 'WhySo3Editor.tsx':
        # items title 100, items description 500
        # onChange={(e) => handleItemChange(index, 'title', e.target.value)}
        pattern_title = r'(<(?:input|textarea)[^>]*?onChange=\{\(e\)\s*=>\s*handleItemChange\(index,\s*\'title\'[^>]*?>)'
        def repl_t(m): return re.sub(r'maxLength=\{\d+\}', 'maxLength={100}', m.group(1)) if 'maxLength=' in m.group(1) else m.group(1).replace('className=', 'maxLength={100} className=')
        content = re.sub(pattern_title, repl_t, content)

        pattern_desc = r'(<(?:input|textarea)[^>]*?onChange=\{\(e\)\s*=>\s*handleItemChange\(index,\s*\'description\'[^>]*?>)'
        def repl_d(m): return re.sub(r'maxLength=\{\d+\}', 'maxLength={500}', m.group(1)) if 'maxLength=' in m.group(1) else m.group(1).replace('className=', 'maxLength={500} className=')
        content = re.sub(pattern_desc, repl_d, content)

    if filename == 'ProcessEditor.tsx':
        # step title 180
        # onChange={(e) => handleStepChange(index, e.target.value)}
        pattern_step = r'(<(?:input|textarea)[^>]*?onChange=\{\(e\)\s*=>\s*handleStepChange\(index,[^>]*?>)'
        def repl_s(m): return re.sub(r'maxLength=\{\d+\}', 'maxLength={180}', m.group(1)) if 'maxLength=' in m.group(1) else m.group(1).replace('className=', 'maxLength={180} className=')
        content = re.sub(pattern_step, repl_s, content)
        
    with open(filepath, 'w') as f:
        f.write(content)

