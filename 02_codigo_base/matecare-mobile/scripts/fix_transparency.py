"""
MateCare Logo Transparency Fixer v3 - ULTRA AGGRESSIVE + EDGE SHADOW
1. Removes ALL neutral/light pixels aggressively  
2. Fades edge pixels that border transparency (anti-alias cleanup)
3. Adds a subtle dark tint to remaining light edge pixels
"""
from PIL import Image, ImageFilter
import colorsys

INPUT  = r"c:\Users\juanp\Desktop\Matecare antigravity\matecare_ordenado\03_diseno\logoframes.png"
OUTPUT = r"c:\Users\juanp\Desktop\Matecare antigravity\matecare_ordenado\02_codigo_base\matecare-mobile\assets\images\logoframes_clean.png"

img = Image.open(INPUT).convert("RGBA")
pixels = img.load()
w, h = img.size
changed = 0

print("Pass 1: Ultra-aggressive background removal...")
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a == 0:
            continue
        
        r_n, g_n, b_n = r / 255.0, g / 255.0, b / 255.0
        h_val, s_val, v_val = colorsys.rgb_to_hsv(r_n, g_n, b_n)
        
        # RULE 1: Any bright pixel with low saturation = background
        if v_val > 0.75 and s_val < 0.18:
            pixels[x, y] = (0, 0, 0, 0)
            changed += 1
            continue
        
        # RULE 2: Medium grays
        if v_val > 0.45 and s_val < 0.10:
            pixels[x, y] = (0, 0, 0, 0)
            changed += 1
            continue
        
        # RULE 3: Any very light pixel (even with slight tint)
        if r > 200 and g > 200 and b > 200 and s_val < 0.20:
            pixels[x, y] = (0, 0, 0, 0)
            changed += 1
            continue
        
        # RULE 4: Light beige/cream that isn't part of the gold
        # Gold has R >> B, cream/white has R ≈ G ≈ B
        if r > 190 and g > 190 and b > 180 and abs(r - g) < 20 and abs(g - b) < 20:
            pixels[x, y] = (0, 0, 0, 0)
            changed += 1
            continue

print(f"  Removed {changed:,} pixels")

print("Pass 2: Edge transparency fade (anti-alias cleanup)...")
# Create a copy to read from while modifying
img_copy = img.copy()
copy_pixels = img_copy.load()
edge_fixed = 0

for y in range(1, h - 1):
    for x in range(1, w - 1):
        r, g, b, a = copy_pixels[x, y]
        if a == 0:
            continue
        
        # Check if this pixel borders a transparent pixel
        neighbors = [
            copy_pixels[x-1, y], copy_pixels[x+1, y],
            copy_pixels[x, y-1], copy_pixels[x, y+1]
        ]
        transparent_neighbors = sum(1 for nr, ng, nb, na in neighbors if na == 0)
        
        if transparent_neighbors > 0:
            r_n, g_n, b_n = r / 255.0, g / 255.0, b / 255.0
            h_val, s_val, v_val = colorsys.rgb_to_hsv(r_n, g_n, b_n)
            
            # If this edge pixel is light/neutral, make it semi-transparent
            if v_val > 0.6 and s_val < 0.25:
                # Fade it based on how many transparent neighbors
                new_alpha = max(0, int(a * (1 - transparent_neighbors * 0.3)))
                # Also darken it slightly to blend with dark backgrounds
                darken = 0.7
                pixels[x, y] = (int(r * darken), int(g * darken), int(b * darken), new_alpha)
                edge_fixed += 1
            elif v_val > 0.5:
                # Slightly darken bright edge pixels even if saturated
                darken = 0.85
                new_alpha = max(0, int(a * (1 - transparent_neighbors * 0.15)))
                pixels[x, y] = (int(r * darken), int(g * darken), int(b * darken), new_alpha)
                edge_fixed += 1

print(f"  Fixed {edge_fixed:,} edge pixels")

img.save(OUTPUT, "PNG")
total = changed + edge_fixed
pct = (changed / (w * h)) * 100
print(f"\nTotal: {total:,} pixels processed ({pct:.1f}% removed + {edge_fixed:,} edges faded)")
print(f"Saved to: {OUTPUT}")
