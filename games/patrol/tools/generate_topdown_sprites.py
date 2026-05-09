from pathlib import Path
from math import sin, cos, radians
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parents[1] / "images" / "generated"
OUT.mkdir(parents=True, exist_ok=True)

DIRECTIONS = {
    "n": 0,
    "ne": 45,
    "e": 90,
    "se": 135,
    "s": 180,
    "sw": 225,
    "w": 270,
    "nw": 315,
}

CARDINAL = {k: DIRECTIONS[k] for k in ("n", "e", "s", "w")}


def save(img, name):
    img.save(OUT / f"{name}.webp", "WEBP", quality=92, lossless=False, method=6)


def transparent(size):
    return Image.new("RGBA", size, (0, 0, 0, 0))


def shadow(draw, box, alpha=70):
    draw.ellipse(box, fill=(0, 0, 0, alpha))


def rotate_save(base, name, angle, size=None):
    rotated = base.rotate(-angle, expand=True, resample=Image.Resampling.BICUBIC)
    if size:
        canvas = transparent(size)
        canvas.alpha_composite(rotated, ((size[0] - rotated.width) // 2, (size[1] - rotated.height) // 2))
        rotated = canvas
    save(rotated, name)


def rounded_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def make_vehicle_base(body, roof, accent, police=False):
    img = transparent((128, 160))
    d = ImageDraw.Draw(img)
    shadow(d, (28, 124, 100, 150), 55)
    rounded_rect(d, (42, 18, 86, 142), 15, body, (10, 15, 18, 255), 3)
    rounded_rect(d, (47, 28, 81, 62), 6, (220, 236, 244, 245), (38, 54, 64, 255), 2)
    rounded_rect(d, (47, 96, 81, 130), 6, (220, 236, 244, 245), (38, 54, 64, 255), 2)
    d.rectangle((39, 50, 45, 70), fill=(27, 32, 36, 255))
    d.rectangle((83, 50, 89, 70), fill=(27, 32, 36, 255))
    d.rectangle((39, 92, 45, 112), fill=(27, 32, 36, 255))
    d.rectangle((83, 92, 89, 112), fill=(27, 32, 36, 255))
    rounded_rect(d, (49, 66, 79, 96), 7, roof, (20, 26, 30, 255), 2)
    d.polygon([(50, 18), (64, 6), (78, 18)], fill=accent)
    if police:
        d.rectangle((43, 75, 61, 85), fill=(37, 120, 255, 255))
        d.rectangle((67, 75, 85, 85), fill=(220, 35, 35, 255))
        d.rectangle((48, 85, 80, 95), fill=(235, 241, 246, 255))
        d.rectangle((41, 106, 87, 118), fill=(8, 13, 18, 255))
    return img


def make_building_base(kind):
    img = transparent((240, 210))
    d = ImageDraw.Draw(img)
    palettes = {
        "ranch": ((218, 205, 168, 255), (162, 82, 64, 255), (124, 92, 64, 255)),
        "brick_home": ((178, 103, 82, 255), (96, 72, 65, 255), (224, 214, 184, 255)),
        "garage": ((196, 200, 196, 255), (102, 116, 122, 255), (90, 94, 98, 255)),
        "barn": ((156, 55, 45, 255), (112, 38, 34, 255), (236, 226, 198, 255)),
        "store": ((213, 204, 174, 255), (112, 128, 136, 255), (118, 80, 56, 255)),
        "trailer": ((213, 218, 214, 255), (112, 132, 150, 255), (170, 184, 194, 255)),
    }
    wall, roof, trim = palettes[kind]
    shadow(d, (42, 142, 222, 196), 65)
    d.rectangle((46, 72, 202, 156), fill=wall, outline=(58, 47, 38, 255), width=3)
    d.polygon([(32, 74), (124, 30), (216, 74)], fill=roof, outline=(55, 36, 30, 255))
    d.rectangle((64, 96, 94, 124), fill=(190, 222, 234, 255), outline=trim, width=3)
    d.rectangle((150, 96, 180, 124), fill=(190, 222, 234, 255), outline=trim, width=3)
    d.rectangle((108, 114, 136, 156), fill=trim)
    if kind in ("garage", "store"):
        d.rectangle((82, 112, 162, 156), fill=(88, 94, 96, 255), outline=(35, 38, 40, 255), width=3)
    if kind == "barn":
        d.line((46, 72, 202, 156), fill=(236, 226, 198, 255), width=4)
        d.line((202, 72, 46, 156), fill=(236, 226, 198, 255), width=4)
    return img


def make_roof_base(kind):
    img = transparent((192, 160))
    d = ImageDraw.Draw(img)
    colors = {
        "ranch": ((166, 82, 62, 255), (112, 58, 48, 255)),
        "brick_home": ((104, 112, 122, 255), (64, 72, 80, 255)),
        "garage": ((118, 130, 138, 255), (72, 82, 88, 255)),
        "barn": ((158, 54, 44, 255), (108, 34, 30, 255)),
        "store": ((132, 126, 104, 255), (88, 94, 96, 255)),
        "trailer": ((180, 190, 198, 255), (126, 142, 154, 255)),
    }
    roof, ridge = colors[kind]
    shadow(d, (34, 108, 166, 144), 45)
    d.polygon([(20, 82), (96, 24), (172, 82), (150, 120), (42, 120)], fill=roof, outline=(42, 34, 30, 255))
    d.line((96, 25, 96, 118), fill=ridge, width=5)
    d.line((42, 82, 150, 82), fill=(255, 255, 255, 38), width=3)
    if kind == "trailer":
        d.rounded_rectangle((26, 54, 166, 116), radius=14, fill=roof, outline=(42, 44, 46, 255), width=3)
        d.line((44, 70, 148, 70), fill=(255, 255, 255, 48), width=3)
    if kind == "barn":
        d.line((42, 82, 150, 120), fill=(235, 218, 180, 95), width=4)
    return img.filter(ImageFilter.UnsharpMask(radius=1, percent=125))


def make_tree(kind, color1, color2):
    img = transparent((160, 160))
    d = ImageDraw.Draw(img)
    shadow(d, (48, 112, 132, 146), 50)
    d.rectangle((74, 78, 88, 130), fill=(92, 57, 32, 255))
    if kind == "pine":
        d.polygon([(80, 16), (38, 104), (122, 104)], fill=color1)
        d.polygon([(80, 38), (30, 126), (130, 126)], fill=color2)
    else:
        for x, y, r, c in [(62, 56, 35, color1), (96, 58, 38, color2), (78, 92, 42, color1), (52, 88, 30, color2)]:
            d.ellipse((x - r, y - r, x + r, y + r), fill=c)
    return img.filter(ImageFilter.UnsharpMask(radius=1, percent=115))


def make_person(color, dog=False):
    img = transparent((96, 112))
    d = ImageDraw.Draw(img)
    shadow(d, (32, 82, 66, 102), 45)
    if dog:
        d.ellipse((28, 52, 64, 78), fill=(126, 87, 54, 255))
        d.ellipse((58, 45, 78, 63), fill=(126, 87, 54, 255))
        d.line((29, 62, 16, 50), fill=(126, 87, 54, 255), width=5)
    else:
        d.ellipse((38, 16, 58, 36), fill=(228, 182, 134, 255), outline=(24, 20, 18, 255), width=2)
        rounded_rect(d, (34, 36, 62, 76), 8, color, (18, 22, 24, 255), 2)
        d.line((34, 45, 18, 66), fill=(36, 38, 42, 255), width=5)
        d.line((62, 45, 78, 66), fill=(36, 38, 42, 255), width=5)
        d.line((42, 74, 34, 98), fill=(42, 62, 90, 255), width=6)
        d.line((54, 74, 62, 98), fill=(42, 62, 90, 255), width=6)
    return img


def make_tile(name, base, line):
    img = Image.new("RGBA", (256, 256), base)
    d = ImageDraw.Draw(img)
    for i in range(-256, 512, 26):
        d.line((i, 0, i + 80, 256), fill=line, width=3)
    for x in range(0, 256, 64):
        for y in range(0, 256, 64):
            d.rectangle((x + 3, y + 3, x + 10, y + 8), fill=(255, 255, 255, 18))
    save(img, name)


vehicles = {
    "police_cruiser": ((15, 23, 31, 255), (238, 244, 248, 255), (230, 236, 240, 255), True),
    "sedan_blue": ((44, 92, 126, 255), (70, 113, 144, 255), (205, 216, 224, 255), False),
    "sedan_red": ((135, 48, 43, 255), (163, 68, 54, 255), (230, 210, 190, 255), False),
    "pickup_green": ((58, 103, 73, 255), (81, 126, 89, 255), (210, 222, 204, 255), False),
    "suv_gray": ((76, 83, 90, 255), (106, 116, 124, 255), (210, 218, 224, 255), False),
}

for name, spec in vehicles.items():
    base = make_vehicle_base(*spec)
    for suffix, angle in DIRECTIONS.items():
        rotate_save(base, f"vehicle_{name}_{suffix}", angle, (192, 192))

for kind in ["ranch", "brick_home", "garage", "barn", "store", "trailer"]:
    base = make_building_base(kind)
    for suffix, angle in CARDINAL.items():
        rotate_save(base, f"building_{kind}_{suffix}", angle, (300, 300))
    roof = make_roof_base(kind)
    for suffix, angle in CARDINAL.items():
        rotate_save(roof, f"roof_{kind}_{suffix}", angle, (224, 224))

trees = {
    "oak_dense": ("round", (48, 122, 58, 255), (74, 154, 70, 255)),
    "maple": ("round", (91, 133, 50, 255), (139, 158, 61, 255)),
    "pine_tall": ("pine", (37, 102, 76, 255), (58, 136, 92, 255)),
    "yard_bush": ("round", (54, 114, 48, 255), (76, 142, 63, 255)),
}
for name, (kind, c1, c2) in trees.items():
    save(make_tree(kind, c1, c2), f"tree_{name}")

people = {
    "civilian_blue": (58, 130, 202, 255),
    "civilian_red": (190, 72, 76, 255),
    "civilian_yellow": (212, 174, 55, 255),
    "officer": (26, 42, 58, 255),
    "ems": (238, 238, 238, 255),
}
for name, color in people.items():
    base = make_person(color)
    for suffix, angle in CARDINAL.items():
        rotate_save(base, f"person_{name}_{suffix}", angle, (128, 128))
dog = make_person((0, 0, 0, 0), dog=True)
for suffix, angle in CARDINAL.items():
    rotate_save(dog, f"animal_dog_{suffix}", angle, (128, 128))

for name, base, line in [
    ("tile_lawn_striped", (95, 145, 78, 255), (128, 174, 94, 80)),
    ("tile_lawn_dark", (72, 124, 67, 255), (104, 154, 82, 70)),
    ("tile_field_plowed", (166, 154, 102, 255), (107, 90, 56, 90)),
    ("tile_field_green", (126, 157, 83, 255), (74, 112, 52, 80)),
    ("tile_gravel", (126, 124, 113, 255), (214, 210, 190, 45)),
]:
    make_tile(name, base, line)
