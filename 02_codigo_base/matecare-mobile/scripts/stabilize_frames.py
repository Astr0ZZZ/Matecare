"""
MateCare Sprite Sheet Frame Stabilizer
Fixes the left-drift issue by centering the opaque content
of each frame within its cell.

1. Splits the sprite sheet into individual frames
2. Finds the bounding box of opaque content in each frame
3. Centers the content within the cell
4. Reassembles into a stabilized sprite sheet
"""
from PIL import Image

INPUT  = r"c:\Users\juanp\Desktop\Matecare antigravity\matecare_ordenado\02_codigo_base\matecare-mobile\assets\images\logoframes_clean.png"
OUTPUT = r"c:\Users\juanp\Desktop\Matecare antigravity\matecare_ordenado\02_codigo_base\matecare-mobile\assets\images\logoframes_clean.png"

COLS = 7
ROWS = 4

img = Image.open(INPUT).convert("RGBA")
w, h = img.size
cell_w = w // COLS  # ~197px
cell_h = h // ROWS  # ~188px

print(f"Image: {w}x{h}, Grid: {COLS}x{ROWS}, Cell: {cell_w}x{cell_h}")

# Create new blank canvas
result = Image.new("RGBA", (cell_w * COLS, cell_h * ROWS), (0, 0, 0, 0))

for row in range(ROWS):
    for col in range(COLS):
        frame_num = row * COLS + col
        
        # Extract this frame cell
        x1 = col * cell_w
        y1 = row * cell_h
        x2 = x1 + cell_w
        y2 = y1 + cell_h
        frame = img.crop((x1, y1, x2, y2))
        
        # Find bounding box of opaque content (non-transparent pixels)
        bbox = frame.getbbox()
        
        if bbox is None:
            # Empty frame, skip
            print(f"  Frame {frame_num}: empty")
            continue
        
        bx1, by1, bx2, by2 = bbox
        content_w = bx2 - bx1
        content_h = by2 - by1
        
        # Extract just the content
        content = frame.crop(bbox)
        
        # Calculate centered position within the cell
        paste_x = (cell_w - content_w) // 2
        paste_y = (cell_h - content_h) // 2
        
        # Calculate drift (how far off-center the original was)
        orig_center_x = bx1 + content_w // 2
        orig_center_y = by1 + content_h // 2
        drift_x = orig_center_x - cell_w // 2
        drift_y = orig_center_y - cell_h // 2
        
        # Paste centered content into the result
        result.paste(content, (x1 + paste_x, y1 + paste_y), content)
        
        if abs(drift_x) > 2 or abs(drift_y) > 2:
            print(f"  Frame {frame_num}: shifted by ({drift_x:+d}, {drift_y:+d})px to center")
        else:
            print(f"  Frame {frame_num}: already centered (drift: {drift_x:+d}, {drift_y:+d})")

result.save(OUTPUT, "PNG")
print(f"\nStabilized sprite sheet saved to: {OUTPUT}")
print("All frames are now centered within their cells!")
