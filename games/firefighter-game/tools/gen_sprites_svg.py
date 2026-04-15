from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List


@dataclass(frozen=True)
class Sprite:
    name: str
    grid: List[str]
    palette: Dict[str, str]


def _sprite_to_svg(grid: List[str], palette: Dict[str, str], pixel: int = 8) -> str:
    rows = len(grid)
    cols = max((len(r) for r in grid), default=0)
    # Allow ragged rows for convenience when authoring sprites; pad with transparent pixels.
    grid = [row.ljust(cols, ".") for row in grid]

    # We draw in "pixel units" (1x1 rects) and scale via width/height in the SVG.
    # This keeps the art crisp when rasterized by the browser.
    w = cols
    h = rows

    rects: List[str] = []
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch == ".":
                continue
            color = palette.get(ch)
            if not color:
                raise ValueError(f"Missing palette entry for '{ch}'")
            rects.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{color}"/>')

    rects_str = "\n  ".join(rects)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w*pixel}" height="{h*pixel}" '
        f'viewBox="0 0 {w} {h}" shape-rendering="crispEdges">\n'
        f"  {rects_str}\n"
        "</svg>\n"
    )


def write_sprite(out_dir: Path, sprite: Sprite, pixel: int = 8) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{sprite.name}.svg"
    out_path.write_text(_sprite_to_svg(sprite.grid, sprite.palette, pixel=pixel), encoding="utf-8")
    return out_path


def main() -> None:
    root = Path(__file__).resolve().parents[1]  # games/firefighter-game
    out_dir = root / "images"

    sprites: Iterable[Sprite] = [
        Sprite(
            name="car_sedan_red",
            palette={
                "o": "#0d0f12",  # outline
                "r": "#d72626",  # body
                "R": "#8b1414",  # shade
                "g": "#143a63",  # glass
                "w": "#bfe6ff",  # window highlight
                "l": "#ffd166",  # light
                "t": "#1b1b1b",  # tire
                "h": "#d7dde5",  # hub
            },
            grid=[
                "................................................",
                "......................oooo......................",
                "...................ooorrrroo....................",
                "................ooorrrrrrrrroo..................",
                "..............ooorrrrrrrrrrrroo.................",
                "............ooorrrrggggggggrrrrroo..............",
                "...........oorrrrggwwwwwwwwggrrrroo.............",
                "..........oorrrrrggwwwwwwwwggrrrrrroo...........",
                ".........oorrrrrrrggggggggggrrrrrrrroo..........",
                ".........oorrrrrrrrrrrrrrrrrrrrrrrrrro..........",
                ".........oorrrrRRRRRRRRRRRRRRRRrrrrrro..........",
                "..........ooorrrrrrrrrrrrrrrrrrrrrroo...........",
                ".............ooorrrrrrrrrrrrrrroooo.............",
                "................oooooooooooooooo................",
                "...........tttt................tttt.............",
                "..........tthhht..............tthhht............",
                "..........tttt................tttt..............",
                "................................................",
            ],
        ),
        Sprite(
            name="car_pickup_red",
            palette={
                "o": "#0d0f12",
                "r": "#cc1f1f",
                "R": "#7d1212",
                "g": "#173c66",
                "w": "#b7dbff",
                "l": "#ffd166",
                "t": "#1b1b1b",
                "h": "#d7dde5",
                "b": "#2c2c2c",  # bed
            },
            grid=[
                "................................................",
                "....................oooo........................",
                ".................ooorrrroo.......................",
                "..............ooorrrrrrrroo......................",
                "............ooorrrrrrrrrrroo.....................",
                "..........ooorrrrggggrrrrrrroo...................",
                ".........oorrrrggwwwwggrrrrrroo..................",
                "........oorrrrrggwwwwggrrrrrrrroo................",
                "........oorrrrrrggggggrrrrrrrrrro................",
                "........oorrrrrrrrrrrrrrrrrrrrrrooooo............",
                "........oorrrRRRRRRRRRRRRrrrrrrrobbbo............",
                ".........ooorrrrrrrrrrrrrrrrrrooobbb.............",
                "............ooorrrrrrrrrrrooooo..................",
                "................oooooooooo.......................",
                "...........tttt..................tttt...........",
                "..........tthhht................tthhht..........",
                "..........tttt..................tttt............",
                "................................................",
            ],
        ),
        Sprite(
            name="fire_engine",
            palette={
                "o": "#0d0f12",
                "r": "#d72626",
                "R": "#8b1414",
                "y": "#f4d03f",
                "g": "#12365f",
                "w": "#bfe6ff",
                "t": "#1b1b1b",
                "h": "#d7dde5",
                "s": "#ffffff",
            },
            grid=[
                "................................................",
                "....................oooooo......................",
                "..................ooRRRRRoo.....................",
                ".............oooooRRRRRRRRooooo.................",
                "............ooorrrrrrrrrrrrrrroo................",
                "..........ooorrrrrrrrrrrrrrrrrrroo..............",
                ".........oorrrrgggwwwwggggrrrrrrroo.............",
                ".........oorrrrgggwwwwggggrrrrrrroo.............",
                ".........oorrrrrrrrrrrrrrrrrrrrrroo.............",
                ".........oorrrrrrrrrrrrrrrrrrrrrroo.............",
                ".........oorrrrrrrrrrrrrrrrrrrrrroo.............",
                ".........oorrrrrrrrrrrrrrrrrrrrrroo.............",
                ".........oorrryyyyyyyyyyyyyyyyrrrroo.............",
                "..........ooorrrrrrrrrrrrrrrrrrroo..............",
                "............ooorrrrrrrrrrrrrrooo.................",
                "...........tttt....tttt....tttt..................",
                "..........tthhht..tthhht..tthhht.................",
                "..........tttt....tttt....tttt...................",
            ],
        ),
        Sprite(
            name="house_small_beige",
            palette={
                "o": "#0d0f12",
                "s": "#e8d4b6",  # siding
                "S": "#d6bf9a",  # shadow siding
                "r": "#8b3a1a",  # roof
                "R": "#6f3516",  # roof shade
                "w": "#a8d3f4",  # window
                "d": "#5a2e12",  # door
                "k": "#f4d03f",  # knob/light
                "p": "#c98e4a",  # porch
            },
            grid=[
                "..................rrrrrrrrrr....................",
                ".................rrRRRRRRRRrr...................",
                "...............rrRRRRRRRRRRRRrr.................",
                ".............rrRRRRRRRRRRRRRRRRrr...............",
                "............rrRRRRRRRRRRRRRRRRRRrr..............",
                "...........oossssssssssssssssssssoo.............",
                "...........oosSSSSSSSSSSSSSSSSSSsoo.............",
                "...........oossssssswwww..wwwwsssoo.............",
                "...........oossssssswwww..wwwwsssoo.............",
                "...........oosSSSSSSwwww..wwwwSSsoo.............",
                "...........oossssssswwww..wwwwsssoo.............",
                "...........oossssssssssssssssssssoo.............",
                "...........oosSSSSSSSSSSSSSSSSSSsoo.............",
                "...........oosssssssssdddddsssssssoo............",
                "...........oosssssssssdddddsssssssoo............",
                "...........oosssssssssddkddsssssssoo............",
                "...........oosssssssssdddddsssssssoo............",
                "..............pppppppppppppp....................",
            ],
        ),
        Sprite(
            name="house_tall_blue",
            palette={
                "o": "#0d0f12",
                "s": "#86bfe6",
                "S": "#5aa0cc",
                "r": "#8b3a1a",
                "R": "#6f3516",
                "w": "#c6ecff",
                "d": "#5a2e12",
                "k": "#f4d03f",
                "c": "#b33a3a",  # chimney
            },
            grid=[
                "...................rrrrrrrrrrrr..................",
                "..................rrRRRRRRRRRRrr.................",
                "................rrRRRRRRRRRRRRRRrr...............",
                "..............rrRRRRRRRRRRRRRRRRRRrr.............",
                ".............rrRRRRRRRRRRRRRRRRRRRRrr............",
                "............oossssssssssssssssssssssoo...........",
                "............oosSSSSSSSSSSSSSSSSSSSSsoo...........",
                "............oossssssswwww..wwwwsssssoo...........",
                "............oossssssswwww..wwwwsssssoo...........",
                "............oosSSSSSSwwww..wwwwSSSSsoo...........",
                "............oossssssswwww..wwwwsssssoo...........",
                "............oossssssswwww..wwwwsssssoo...........",
                "............oosSSSSSSwwww..wwwwSSSSsoo...........",
                "............oossssssswwww..wwwwsssssoo...........",
                "............oossssssssssssssssssssssoo...........",
                "............oosSSSSSSSSSSSSSSSSSSSSsoo...........",
                "............oosssssssssdddddsssssssssoo..........",
                "............oosssssssssdddddsssssssssoo..........",
                "............oosssssssssddkddsssssssssoo..........",
                "............oosssssssssdddddsssssssssoo..........",
            ],
        ),
        Sprite(
            name="house_farmhouse",
            palette={
                "o": "#0d0f12",
                "s": "#e5d0a8",
                "S": "#cdb88f",
                "r": "#8b3a1a",
                "R": "#6f3516",
                "w": "#bfe6ff",
                "d": "#5a2e12",
                "k": "#f4d03f",
                "p": "#c98e4a",
                "P": "#a87437",
            },
            grid=[
                "..................rrrrrrrrrr....................",
                ".................rrRRRRRRRRrr...................",
                "...............rrRRRRRRRRRRRRrr.................",
                ".............rrRRRRRRRRRRRRRRRRrr...............",
                "............rrRRRRRRRRRRRRRRRRRRrr..............",
                "...........oossssssssssssssssssssoo.............",
                "...........oosSSSSSSSSSSSSSSSSSSsoo.............",
                "...........oossssssswwww..wwwwsssoo.............",
                "...........oossssssswwww..wwwwsssoo.............",
                "...........oosSSSSSSwwww..wwwwSSsoo.............",
                "...........oossssssswwww..wwwwsssoo.............",
                "...........oossssssssssssssssssssoo.............",
                "...........oosSSSSSSSSSSSSSSSSSSsoo.............",
                "...........oosssssssssdddddsssssssoo............",
                "...........oosssssssssdddddsssssssoo............",
                "...........oosssssssssddkddsssssssoo............",
                "...........oosssssssssdddddsssssssoo............",
                "...........oosssssssssdddddsssssssoo............",
                ".............pppppppppppppppppp..................",
                "............pPPPPPPPPPPPPPPPPPPp.................",
            ],
        ),
        Sprite(
            name="garage_single",
            palette={
                "o": "#0d0f12",
                "s": "#e6d3b6",
                "S": "#d1c0a6",
                "r": "#8b3a1a",
                "R": "#6f3516",
                "w": "#bfe6ff",
                "g": "#7b7b7b",
                "G": "#5e5e5e",
                "d": "#5a2e12",
            },
            grid=[
                "..................rrrrrrrrrr....................",
                ".................rrRRRRRRRRrr...................",
                "...............rrRRRRRRRRRRRRrr.................",
                ".............rrRRRRRRRRRRRRRRRRrr...............",
                "............rrRRRRRRRRRRRRRRRRRRrr..............",
                "...........oossssssssssssssssssssoo.............",
                "...........oosSSSSSSSSSSSSSSSSSSsoo.............",
                "...........oossssssswwww..wwwwsssoo.............",
                "...........oossssssswwww..wwwwsssoo.............",
                "...........oosSSSSSSwwww..wwwwSSsoo.............",
                "...........oossssssssssssssssssssoo.............",
                "...........oosSSSSSSSSSSSSSSSSSSsoo.............",
                "...........oossssssggggggggggsssoo.............",
                "...........oosSSSSSgGGGGGGGGGSSsoo.............",
                "...........oossssssGGGGGGGGGGsssoo.............",
                "...........oossssssGGGGGGGGGGsssoo.............",
                "...........oossssssGGGGGGGGGGsssoo.............",
                "...........oossssssGGGGGGGGGGsssoo.............",
            ],
        ),
    ]

    for sprite in sprites:
        write_sprite(out_dir, sprite, pixel=4)

    print(f"Wrote {len(list(sprites))} sprites to {out_dir}")


if __name__ == "__main__":
    main()
