from pathlib import Path
from base64 import b64encode
from io import BytesIO
import json
import cv2
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent
out = root / 'sample-review'
out.mkdir(exist_ok=True)
samples = [
    ('sample-artist-point', 'Artist Point sample'),
    ('sample-fuji-gate', 'Fuji Shrine sample'),
]
work_size = 480
color_count = 32
min_area = 18
catalog = []
site_pages = []

def cell_paths(region_ids, count):
    """Trace shared pixel edges so every point belongs to exactly one paint cell."""
    size = region_ids.shape[0]
    borders = [[] for _ in range(count + 1)]
    padded = np.pad(region_ids, 1)
    for y, x in np.argwhere(padded[1:, 1:-1] != padded[:-1, 1:-1]):
        borders[padded[y + 1, x + 1]].append((x, y, 0))
        borders[padded[y, x + 1]].append((x + 1, y, 2))
    for y, x in np.argwhere(padded[1:-1, 1:] != padded[1:-1, :-1]):
        borders[padded[y + 1, x]].append((x, y, 1))
        borders[padded[y + 1, x + 1]].append((x, y + 1, 3))
    directions = ((1, 0), (0, 1), (-1, 0), (0, -1))
    scale = 400 / size
    for border in borders[1:]:
        edges = set(border)
        paths = []
        while edges:
            x, y, direction = start = min(edges)
            points = [(x, y)]
            while True:
                edges.remove((x, y, direction))
                dx, dy = directions[direction]
                x, y = x + dx, y + dy
                if (x, y) == start[:2]:
                    break
                next_direction = next(d for d in (
                    (direction + 1) % 4, direction, (direction - 1) % 4
                ) if (x, y, d) in edges)
                if direction != next_direction:
                    points.append((x, y))
                direction = next_direction
            paths.append('M' + 'L'.join(f'{x*scale:.2f} {y*scale:.2f}' for x,y in points) + 'Z')
        yield ''.join(paths)

def png_url(pixels):
    buffer = BytesIO()
    Image.fromarray(pixels).save(buffer, format='PNG', optimize=True)
    return 'data:image/png;base64,' + b64encode(buffer.getvalue()).decode('ascii')

for source, title in samples:
    image = Image.open(root / 'art-source' / f'{source}.png').convert('RGB').resize(
        (work_size, work_size), Image.Resampling.LANCZOS
    )
    quant = image.quantize(colors=color_count, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    palette = np.array(quant.getpalette(), dtype=np.uint8).reshape(-1, 3)[:color_count]
    data = np.array(quant, dtype=np.uint8)

    # Clean up tiny disconnected pixels using the same connectivity as tap targets.
    for _ in range(8):
        small = []
        for color in np.unique(data):
            count, labels, stats, _ = cv2.connectedComponentsWithStats(
                (data == color).astype(np.uint8), connectivity=4
            )
            for part in range(1, count):
                if stats[part, cv2.CC_STAT_AREA] < min_area:
                    x, y, w, h, area = stats[part]
                    small.append((color, x, y, w, h, labels[y:y + h, x:x + w] == part))
        changed = 0
        for color, x, y, w, h, mask in small:
            crop = data[y:y + h, x:x + w]
            if np.any(crop[mask] != color):
                continue
            xa, ya = max(0, x - 1), max(0, y - 1)
            xb, yb = min(work_size, x + w + 1), min(work_size, y + h + 1)
            local = np.zeros((yb - ya, xb - xa), np.uint8)
            local[y - ya:y - ya + h, x - xa:x - xa + w] = mask
            rim = (cv2.dilate(local, np.ones((3, 3), np.uint8)) > 0) & (local == 0)
            neighbors = data[ya:yb, xa:xb][rim]
            neighbors = neighbors[neighbors != color]
            if len(neighbors):
                crop[mask] = np.bincount(neighbors, minlength=256).argmax()
                changed += 1
        if not changed:
            break

    finished = palette[data]
    # Retain the source's interior shading. The numbered swatch still applies
    # a flat base color to the entire cell, and unpainted cells show no artwork.
    shaded = cv2.addWeighted(np.array(image), .76, finished, .24, 0)
    region_ids = np.zeros(data.shape, dtype=np.int32)
    regions = []
    for color in np.unique(data):
        count, labels, stats, _ = cv2.connectedComponentsWithStats(
            (data == color).astype(np.uint8), connectivity=4
        )
        for part in range(1, count):
            x, y, width, height, _ = stats[part]
            mask = labels[y:y + height, x:x + width] == part
            region_ids[y:y + height, x:x + width][mask] = len(regions) + 1
            distance = cv2.distanceTransform(np.pad(mask.astype(np.uint8), 1), cv2.DIST_L2, 5)
            _, clearance, _, (px, py) = cv2.minMaxLoc(distance)
            regions.append([int(color), int(x + px - 1), int(y + py - 1), round(clearance, 1)])
    assert region_ids.min() == 1 and region_ids.max() == len(regions)
    # Preserve the full region ID across two channels of a lossless PNG.
    encoded = np.stack([region_ids % 256, region_ids // 256, np.zeros_like(region_ids)], axis=-1)
    catalog.append({
        'title': title, 'source': source, 'size': work_size,
        'palette': ['#%02x%02x%02x' % tuple(rgb) for rgb in palette],
        'regions': regions, 'map': png_url(encoded.astype(np.uint8)),
        'shaded': png_url(shaded),
    })
    page_id = 'artist-point-anime-hard' if source == 'sample-artist-point' else 'fuji-shrine-anime-hard'
    shapes = [
        {'tag': 'path', 'a': {'d': path, 'fill-rule': 'evenodd'},
         'x': round((x + .5) * 400 / work_size, 2),
         'y': round((y + .5) * 400 / work_size, 2), 'n': color + 1,
         'labelSize': round(min(7, max(2, clearance)), 1)}
        for path, (color, x, y, clearance) in zip(cell_paths(region_ids, len(regions)), regions)
    ]
    site_pages.append({
        'id': page_id,
        'title': 'Artist Point at Sunrise' if source == 'sample-artist-point' else 'Fuji Shrine at Sunrise',
        'category': 'Anime Scenic', 'level': 'Hard',
        'tags': ['Anime', 'Nature', 'Places'] + (['National Parks'] if source == 'sample-artist-point' else []),
        'palette': catalog[-1]['palette'], 'shapes': shapes,
        'detail': True, 'firstLabel': True, 'paintTexture': catalog[-1]['shaded'],
    })
    borders = np.zeros(region_ids.shape, dtype=bool)
    borders[:, :-1] |= region_ids[:, :-1] != region_ids[:, 1:]
    borders[:-1, :] |= region_ids[:-1, :] != region_ids[1:, :]
    thumbnail = np.full(region_ids.shape, 250, dtype=np.uint8)
    thumbnail[borders] = 105
    Image.fromarray(thumbnail).save(root / 'previews' / f'{page_id}.png')
    comparison = Image.new('RGB', (work_size * 3, work_size))
    comparison.paste(image, (0, 0))
    comparison.paste(Image.fromarray(finished), (work_size, 0))
    comparison.paste(Image.fromarray(shaded), (work_size * 2, 0))
    comparison.save(out / f'{source}-comparison.png')
    Image.fromarray(finished).resize((720, 720), Image.Resampling.NEAREST).save(out / f'{source}-finished.png')

    line = np.full((work_size, work_size, 3), 250, dtype=np.uint8)
    for color in np.unique(data):
        count, labels, stats, _ = cv2.connectedComponentsWithStats((data == color).astype(np.uint8), 8)
        for part in range(1, count):
            mask = (labels == part).astype(np.uint8)
            contours, _ = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
            cv2.drawContours(line, contours, -1, (95, 90, 85), 1)
    Image.fromarray(line).resize((720, 720), Image.Resampling.NEAREST).save(out / f'{source}-line.png')
    print(f'{title}: {len(regions)} regions, {len(np.unique(data))} colors')

(out / 'playable-samples.js').write_text(
    'const samples = ' + json.dumps(catalog, separators=(',', ':')) + ';\n',
    encoding='utf-8',
)
(root / 'shaded-art.js').write_text(
    'const shadedPages = ' + json.dumps(site_pages, separators=(',', ':')) + ';\n',
    encoding='utf-8',
)
