import json, re

with open('/home/z/my-project/download/ref1_retry.json', 'r') as f:
    data = json.load(f)
html = data['data']['html']

# Extract colors
colors = set(re.findall(r'#[0-9a-fA-F]{3,8}', html))

# Extract fonts
fonts = set(re.findall(r'font-family:\s*([^;}{\"]+)', html))

# Extract CSS blocks
css_blocks = re.findall(r'<style[^>]*>(.*?)</style>', html, re.DOTALL | re.IGNORECASE)

# Extract class names
classes = set(re.findall(r'class="([^"]+)"', html))
classes = sorted(classes)

# Extract image URLs
img_pattern = r'(?:src|url)\s*\(\s*["\']?\s*(https?://[^\s"\'\)]+\.(?:png|jpg|jpeg|gif|webp|svg|ico))'
images = re.findall(img_pattern, html, re.IGNORECASE)

# Extract nav links
nav_links = re.findall(r'href="([^"]+)"', html)
nav_links = [l for l in nav_links if not l.startswith('#') and not l.startswith('javascript') and 'wp-' not in l and 'xmlrpc' not in l and 'feed/' not in l and 'oembed' not in l]

print('=== COLORS FOUND ===')
for c in sorted(colors)[:50]:
    print(f'  {c}')

print(f'\n=== FONTS FOUND ({len(fonts)}) ===')
for f in sorted(fonts)[:20]:
    print(f'  {f}')

print(f'\n=== CSS BLOCKS ({len(css_blocks)}) ===')
for i, block in enumerate(css_blocks[:5]):
    print(f'\n--- Block {i+1} (first 2000 chars) ---')
    print(block[:2000])

print(f'\n=== TOP CLASSES ({len(classes)} total) ===')
for c in classes[:60]:
    print(f'  {c}')

print(f'\n=== IMAGES ===')
for img in images[:30]:
    print(f'  {img}')

print(f'\n=== NAV LINKS (unique, filtered) ===')
seen = set()
for l in nav_links:
    if l not in seen:
        seen.add(l)
        print(f'  {l}')