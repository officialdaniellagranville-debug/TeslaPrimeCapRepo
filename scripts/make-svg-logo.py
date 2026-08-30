"""
Create a clean, professional Tesla Prime Capital logo as inline SVG.
- Black background with rounded corners
- Red "T" stylized mark in the center (Tesla-like)
- Will be embedded directly in email HTML (no external fetch needed)
- Bypasses Gmail image proxy entirely
"""
import os

# This is a clean, premium logo mark: red "T" inside black rounded square
SVG_LOGO = '''<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto 16px;border-radius:14px">
<rect width="64" height="64" rx="14" fill="#000000"/>
<rect x="0.5" y="0.5" width="63" height="63" rx="13.5" stroke="#B91C1C" stroke-width="1" fill="none"/>
<path d="M14 20 L50 20" stroke="#CC0000" stroke-width="3.5" stroke-linecap="round"/>
<path d="M32 20 L32 50" stroke="#CC0000" stroke-width="3.5" stroke-linecap="round"/>
<circle cx="32" cy="20" r="3" fill="#CC0000"/>
<circle cx="32" cy="50" r="3" fill="#CC0000"/>
</svg>'''

# Save as a file we can reference
out_path = '/home/z/my-project/public/email-logo-mark.svg'
with open(out_path, 'w') as f:
    f.write(SVG_LOGO)
print(f'Saved SVG to: {out_path}')
print(f'Size: {os.path.getsize(out_path)} bytes')
print('---')
print(SVG_LOGO)
