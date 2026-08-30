"""
Optimize email-logo.jpg into a smaller, Gmail-friendly PNG.
- Resize to 192x192 (3x retina for 64px display)
- Save as new filename email-logo-v2.png to bust Gmail's cached failed fetch
- Output to /home/z/my-project/public/email-logo-v2.png
"""
from PIL import Image

SRC = '/home/z/my-project/public/email-logo.jpg'
DST = '/home/z/my-project/public/email-logo-v2.png'

img = Image.open(SRC).convert('RGBA')
print(f'Original size: {img.size}, mode: {img.mode}')

# Resize to 192x192 using high-quality LANCZOS
target = 192
resized = img.resize((target, target), Image.LANCZOS)
print(f'Resized to: {resized.size}')

# Optimize PNG
resized.save(DST, format='PNG', optimize=True)
print(f'Saved to: {DST}')

# Verify
import os
size_bytes = os.path.getsize(DST)
print(f'File size: {size_bytes} bytes ({size_bytes/1024:.1f} KB)')

# Verify final image
final = Image.open(DST)
print(f'Final: size={final.size}, mode={final.mode}, format={final.format}')
