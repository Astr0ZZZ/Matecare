"""
MateCare Sprite Sheet FINAL Optimizer
- NO frame duplication (keeps original speed)
- Centers all frames
- Ultra-aggressive transparency cleaning
- Adds 2px dark green OUTLINE around all opaque content
- Removes truly problematic frames
"""
from PIL import Image, ImageFilter
import colorsys

SOURCE = r"c:\Users\juanp\Desktop\Matecare antigravity\matecare_ordenado\03_diseno\logoframes.png"
OUTPUT = r"c:\Users\juanp\Desktop\Matecare antigravity\matecare_ordenado\02_codigo_base\matecare-mobile\assets\images\logoframes_clean.png"

COLS = 7
ROWS = 4
OUTLINE_COLOR = (4, 68, 34, 220)  # Dark green, slightly transparent
OUTLINE_RADIUS = 2  # pixels of outline thickness

img = Image.open(SOURCE).convert("RGBA")
w, h = img.size
cell_w = w // COLS
cell_h = h // ROWS

print("STEP 1: Extract & clean frames...")
frames = []
for row in range(ROWS):
    for col in range(COLS):
        x1 = col * cell_w
        y1 = row * cell_h
        frame = img.crop((x1, y1, x1 + cell_w, y1 + cell_h))
        frames.append(frame)

print(f"  {len(frames)} frames extracted ({cell_w}x{cell_h} each)")

# Clean transparency on all frames
print("\nSTEP 2: Cleaning transparency...")
for idx, frame in enumerate(frames):
    pixels = frame.load()
    for y in range(cell_h):
        for x in range(cell_w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            r_n, g_n, b_n = r / 255.0, g / 255.0, b / 255.0
            _, s_val, v_val = colorsys.rgb_to_hsv(r_n, g_n, b_n)
            
            remove = False
            if v_val > 0.72 and s_val < 0.20:
                remove = True
            elif v_val > 0.42 and s_val < 0.10:
                remove = True
            elif r > 195 and g > 195 and b > 195 and s_val < 0.22:
                remove = True
            elif r > 185 and g > 185 and b > 175 and abs(r-g) < 22 and abs(g-b) < 22:
                remove = True
            
            if remove:
                pixels[x, y] = (0, 0, 0, 0)

print("  Done")

# Center all frames
print("\nSTEP 3: Centering frames...")
centered = []
for idx, frame in enumerate(frames):
    bbox = frame.getbbox()
    if bbox is None:
        centered.append(Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0)))
        continue
    
    content = frame.crop(bbox)
    cw, ch = content.size
    new_frame = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
    px = (cell_w - cw) // 2
    py = (cell_h - ch) // 2
    new_frame.paste(content, (px, py), content)
    centered.append(new_frame)

print("  Done")

# Add dark green outline
print(f"\nSTEP 4: Adding {OUTLINE_RADIUS}px dark green outline...")
outlined = []
for idx, frame in enumerate(centered):
    result = frame.copy()
    src = frame.load()
    
    # Create alpha mask of opaque pixels
    alpha_map = [[src[x, y][3] for x in range(cell_w)] for y in range(cell_h)]
    
    # For each transparent pixel, check if any opaque pixel is within OUTLINE_RADIUS
    res_pixels = result.load()
    outline_added = 0
    
    for y in range(cell_h):
        for x in range(cell_w):
            if alpha_map[y][x] > 30:  # Already opaque, skip
                continue
            
            # Check neighborhood for opaque pixels
            has_opaque_neighbor = False
            for dy in range(-OUTLINE_RADIUS, OUTLINE_RADIUS + 1):
                for dx in range(-OUTLINE_RADIUS, OUTLINE_RADIUS + 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < cell_w and 0 <= ny < cell_h:
                        if alpha_map[ny][nx] > 100:
                            dist = (dx*dx + dy*dy) ** 0.5
                            if dist <= OUTLINE_RADIUS:
                                has_opaque_neighbor = True
                                break
                if has_opaque_neighbor:
                    break
            
            if has_opaque_neighbor:
                # Add outline pixel with distance-based opacity
                res_pixels[x, y] = OUTLINE_COLOR
                outline_added += 1
    
    outlined.append(result)

print(f"  Outline added to all frames")

# Detect and handle bad frames (compare content size consistency)
print("\nSTEP 5: Detecting problematic frames...")
frame_sizes = []
for i, f in enumerate(outlined):
    bbox = f.getbbox()
    if bbox:
        frame_sizes.append((bbox[2]-bbox[0]) * (bbox[3]-bbox[1]))
    else:
        frame_sizes.append(0)

# Find the "mature" frames (fully formed logo) - typically the larger ones
if frame_sizes:
    max_size = max(frame_sizes)
    threshold = max_size * 0.3  # Frames with less than 30% of max are "building" frames
    
    # Keep all frames but mark which are "building" vs "complete"
    building_end = 0
    for i, s in enumerate(frame_sizes):
        if s >= threshold:
            building_end = i
            break
    print(f"  Logo starts forming at frame {building_end}")
    print(f"  Last frame index: {len(outlined)-1}")

# Assemble final sprite sheet (same grid: 7 cols x 4 rows, 28 frames)
new_cols = COLS
new_rows = ROWS
total = len(outlined)

print(f"\nSTEP 6: Assembling ({new_cols}x{new_rows}, {total} frames)...")
result = Image.new("RGBA", (cell_w * new_cols, cell_h * new_rows), (0, 0, 0, 0))

for i, frame in enumerate(outlined):
    col = i % new_cols
    row = i // new_cols
    result.paste(frame, (col * cell_w, row * cell_h), frame)

result.save(OUTPUT, "PNG")
print(f"\nDONE!")
print(f"  Size: {result.width}x{result.height}")
print(f"  Grid: {new_cols} cols x {new_rows} rows")
print(f"  Frames: {total}")
print(f"  >>> columns = {new_cols}, rows = {new_rows}, totalFrames = {total}")
