"""
MateCare Premium Logo Processor
Cleans the single high-quality logo for use with code-driven animations.
1. Ultra-aggressive transparency cleaning
2. Crop to content (remove empty space)
3. Add dark green outline
4. Edge smoothing
"""
from PIL import Image
import colorsys

INPUT  = r"c:\Users\juanp\Desktop\Matecare antigravity\matecare_ordenado\03_diseno\logomate.png"
OUTPUT = r"c:\Users\juanp\Desktop\Matecare antigravity\matecare_ordenado\02_codigo_base\matecare-mobile\assets\images\logo_premium.png"

OUTLINE_COLOR = (4, 68, 34, 200)
OUTLINE_RADIUS = 3

img = Image.open(INPUT).convert("RGBA")
w, h = img.size
pixels = img.load()

# ─── STEP 1: Clean transparency ───
print("STEP 1: Cleaning fake transparency...")
cleaned = 0
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a == 0:
            continue
        
        r_n, g_n, b_n = r / 255.0, g / 255.0, b / 255.0
        _, s_val, v_val = colorsys.rgb_to_hsv(r_n, g_n, b_n)
        
        remove = False
        # Whites
        if v_val > 0.72 and s_val < 0.18:
            remove = True
        # Grays
        elif v_val > 0.40 and s_val < 0.08:
            remove = True
        # Near-whites
        elif r > 195 and g > 195 and b > 195 and s_val < 0.20:
            remove = True
        # Neutral beiges
        elif r > 185 and g > 185 and b > 175 and abs(r-g) < 20 and abs(g-b) < 20:
            remove = True
        
        if remove:
            pixels[x, y] = (0, 0, 0, 0)
            cleaned += 1

print(f"  Removed {cleaned:,} background pixels")

# ─── STEP 2: Edge darkening ───
print("\nSTEP 2: Darkening edges...")
img_copy = img.copy()
copy_px = img_copy.load()
edge_count = 0

for y in range(1, h - 1):
    for x in range(1, w - 1):
        r, g, b, a = copy_px[x, y]
        if a == 0:
            continue
        
        neighbors = [
            copy_px[x-1, y], copy_px[x+1, y],
            copy_px[x, y-1], copy_px[x, y+1]
        ]
        trans_n = sum(1 for _, _, _, na in neighbors if na == 0)
        
        if trans_n > 0:
            r_n, g_n, b_n = r / 255.0, g / 255.0, b / 255.0
            _, s_val, v_val = colorsys.rgb_to_hsv(r_n, g_n, b_n)
            
            if v_val > 0.55 and s_val < 0.25:
                new_alpha = max(0, int(a * (1 - trans_n * 0.25)))
                pixels[x, y] = (int(r * 0.6), int(g * 0.6), int(b * 0.6), new_alpha)
                edge_count += 1

print(f"  Darkened {edge_count:,} edge pixels")

# ─── STEP 3: Crop to content ───
print("\nSTEP 3: Cropping to content...")
bbox = img.getbbox()
if bbox:
    # Add small padding (10px)
    pad = 10
    bbox = (max(0, bbox[0]-pad), max(0, bbox[1]-pad), 
            min(w, bbox[2]+pad), min(h, bbox[3]+pad))
    img = img.crop(bbox)
    print(f"  Cropped from {w}x{h} to {img.width}x{img.height}")
else:
    print("  No content found!")

# ─── STEP 4: Add dark green outline ───
print(f"\nSTEP 4: Adding {OUTLINE_RADIUS}px dark green outline...")
w2, h2 = img.size
src_pixels = img.load()

# Build alpha map
alpha_map = [[src_pixels[x, y][3] for x in range(w2)] for y in range(h2)]

outline_count = 0
for y in range(h2):
    for x in range(w2):
        if alpha_map[y][x] > 30:
            continue
        
        has_opaque = False
        for dy in range(-OUTLINE_RADIUS, OUTLINE_RADIUS + 1):
            for dx in range(-OUTLINE_RADIUS, OUTLINE_RADIUS + 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w2 and 0 <= ny < h2:
                    if alpha_map[ny][nx] > 100:
                        dist = (dx*dx + dy*dy) ** 0.5
                        if dist <= OUTLINE_RADIUS:
                            has_opaque = True
                            break
            if has_opaque:
                break
        
        if has_opaque:
            src_pixels[x, y] = OUTLINE_COLOR
            outline_count += 1

print(f"  Added {outline_count:,} outline pixels")

# ─── STEP 5: Make it square (for clean rendering) ───
print("\nSTEP 5: Making square canvas...")
w3, h3 = img.size
size = max(w3, h3)
square = Image.new("RGBA", (size, size), (0, 0, 0, 0))
paste_x = (size - w3) // 2
paste_y = (size - h3) // 2
square.paste(img, (paste_x, paste_y), img)
print(f"  Final size: {size}x{size}")

square.save(OUTPUT, "PNG")
print(f"\nDONE! Saved to: {OUTPUT}")
