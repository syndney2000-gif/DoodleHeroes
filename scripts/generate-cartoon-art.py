#!/usr/bin/env python3
"""Generate original Margin Merge storybook SVGs. SPDX-License-Identifier: CC0-1.0

No fonts, stock artwork, external resources, or raster images are used. The
paths and arrangement below are the editable source for all 32 illustrations.
Run from any directory: python3 scripts/generate-cartoon-art.py
"""

from pathlib import Path
from html import escape
import xml.etree.ElementTree as ET

OUT = Path(__file__).resolve().parents[1] / "public/images/merge/cartoon"
INK = "#304C3B"
IVORY = "#FFF8E6"
SAGE = "#B9D4A4"
GREEN = "#688D69"
PEACH = "#F0B697"
GOLD = "#EBC975"
BLUE = "#A8CCD1"
LILAC = "#C6B9DE"
ROSE = "#DE9EAA"


def path(d, fill="none", **attrs):
    extra = " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<path d="{d}" fill="{fill}" {extra}/>'


def circle(x, y, r, fill=IVORY, **attrs):
    extra = " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" {extra}/>'


def ellipse(x, y, rx, ry, fill, **attrs):
    extra = " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" {extra}/>'


def rect(x, y, w, h, fill, r=5):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"/>'


def star(x, y, s=9, fill=GOLD):
    return path(f"M{x} {y-s} L{x+s*.3} {y-s*.3} L{x+s} {y} L{x+s*.3} {y+s*.3} L{x} {y+s} L{x-s*.3} {y+s*.3} L{x-s} {y} L{x-s*.3} {y-s*.3}Z", fill)


def face(x, y, spread=9, cheeks=True):
    result = circle(x-spread, y, 2.4, INK, stroke="none") + circle(x+spread, y, 2.4, INK, stroke="none")
    result += path(f"M{x-4} {y+6} Q{x} {y+10} {x+4} {y+6}", stroke_width=2)
    if cheeks:
        result += ellipse(x-spread-3, y+5, 3.5, 2, PEACH, stroke="none") + ellipse(x+spread+3, y+5, 3.5, 2, PEACH, stroke="none")
    return result


def book(x, y, w, h, color, spine=True):
    result = rect(x, y+5, w, h, IVORY) + rect(x, y, w, h-2, color)
    if spine:
        result += path(f"M{x+9} {y+2} V{y+h-4}")
    return result


def portrait_frame(x, y, w, h, color=GOLD):
    return rect(x, y, w, h, color, 4) + rect(x+7, y+7, w-14, h-14, BLUE, 2)


def hero_body(color=BLUE):
    return path("M45 70 Q64 62 82 70 L87 99 Q64 108 40 99Z", color) + path("M50 101 L47 111 M76 101 L80 111", stroke_width=7)


def make_items():
    items = {}
    # Heroes grow from a single ink mark into expressive handmade characters.
    items["heroes"] = [
        ("Ink Dot", path("M66 27 C65 43 39 58 40 77 C40 104 88 107 91 79 C93 59 72 45 66 27Z", GREEN) + path("M53 60 Q45 71 49 80", stroke=IVORY, stroke_width=5) + face(66, 81, 8)),
        ("Blob", path("M28 84 Q20 67 37 59 Q34 36 57 40 Q71 24 85 43 Q106 44 100 68 Q119 90 94 100 Q76 109 61 102 Q35 111 28 94Z", SAGE) + path("M41 57 Q45 46 54 48", stroke=IVORY, stroke_width=5) + face(66, 76, 11)),
        ("Stick Figure", path("M64 66 V90 M64 75 L41 62 M64 75 L86 60 M64 90 L47 110 M64 90 L84 109", stroke_width=7) + circle(64, 47, 22, IVORY) + face(64, 48, 8) + path("M48 29 Q62 16 79 30", GOLD, stroke_width=4)),
        ("Doodle Kid", hero_body(SAGE) + path("M44 75 L30 91 M82 75 L96 87", stroke_width=8) + circle(64, 48, 25, IVORY) + path("M39 44 Q33 22 59 22 Q84 14 91 42 L74 36 L66 25 L59 38Z", PEACH) + face(64, 49, 10) + path("M46 68 L64 77 L81 68", GOLD) + circle(64, 89, 4, GOLD)),
        ("Pencil Knight", path("M42 66 L31 105 L70 99Z", ROSE) + hero_body(BLUE) + circle(64, 46, 24, BLUE) + path("M40 47 Q42 21 64 22 Q88 23 88 47Z", SAGE) + rect(43, 42, 42, 19, IVORY, 8) + face(64, 48, 9, False) + path("M62 23 V14 L77 19 L64 30", PEACH) + path("M38 76 L21 80 L24 101 L38 109 L51 96 L52 80Z", GOLD) + star(37, 90, 7, IVORY) + path("M94 94 L100 34 L106 22 L111 36 L105 96Z", GOLD) + path("M100 34 L111 36 M94 85 L111 87") + circle(94, 80, 5, IVORY)),
        ("Ink Wizard", path("M46 66 L29 107 Q65 117 96 106 L80 67Z", LILAC) + circle(64, 54, 22, IVORY) + face(64, 55, 9) + path("M37 41 L58 10 Q62 6 68 15 L87 42Z", LILAC) + path("M29 43 Q65 31 97 44 Q66 55 29 43Z", BLUE) + star(62, 29, 6, GOLD) + star(55, 89, 9, GOLD) + path("M100 108 L104 48", stroke_width=5) + star(105, 39, 12, GOLD) + circle(94, 76, 6, IVORY)),
        ("Super Doodle", path("M41 61 Q19 81 19 106 L61 99 L99 111 Q107 81 87 61Z", ROSE) + hero_body(BLUE) + path("M44 75 L29 63 M83 74 L98 54", stroke_width=8) + circle(64, 42, 24, IVORY) + path("M40 39 Q44 14 70 18 L87 30 L74 29 L65 24 L54 38Z", GREEN) + path("M43 41 Q64 35 85 41 L82 53 Q64 48 46 53Z", GOLD) + face(64, 44, 10, False) + star(64, 86, 12, GOLD) + star(108, 31, 7, GOLD)),
        ("Hero of the Margin", path("M40 64 L20 108 Q40 105 51 98 L94 109 L91 63Z", LILAC) + hero_body(SAGE) + circle(64, 45, 24, IVORY) + path("M41 32 L38 15 L53 24 L63 10 L75 24 L89 15 L87 32Z", GOLD) + circle(64, 25, 3, ROSE) + face(64, 47, 10) + star(64, 83, 12, GOLD) + path("M92 98 L101 49 M92 61 L108 65", stroke_width=5) + path("M100 49 L106 32 L109 51Z", GOLD) + circle(92, 78, 6, IVORY) + star(23, 43, 7, GOLD)),
    ]
    items["paper"] = [
        ("Paper Scrap", path("M34 36 L93 28 L89 89 L74 97 L63 89 L49 100 L37 91 L25 96Z", IVORY) + path("M93 28 L75 32 L85 48Z", GOLD) + path("M44 51 L72 47 M42 64 L78 58 M40 77 L63 73", stroke=GREEN, stroke_width=3)),
        ("Sticky Note", path("M31 30 L98 34 L94 84 L76 103 L28 97Z", GOLD) + path("M94 84 L77 82 L76 103Z", IVORY) + path("M44 49 L81 51 M43 62 L76 64 M42 76 L62 77", stroke=GREEN, stroke_width=3)),
        ("Notebook", book(35, 23, 63, 82, SAGE) + rect(57, 40, 29, 27, IVORY, 3) + path("M64 49 H79 M64 57 H76", stroke_width=2) + ''.join(path(f"M28 {y} H43", stroke_width=4) for y in [38, 54, 70, 86]) + path("M82 102 V116 L88 111 L94 116 V102Z", ROSE)),
        ("Sketchbook", book(28, 29, 73, 72, BLUE) + ''.join(path(f"M{x} 23 V35", stroke_width=4) for x in [42, 57, 72, 87]) + rect(45, 46, 40, 36, IVORY, 4) + circle(74, 56, 5, GOLD) + path("M49 76 L60 61 L70 71 L77 66 L82 76Z", SAGE) + path("M20 103 L32 65 L36 62 L40 68 L28 107 L19 113Z", GOLD)),
        ("Storybook", path("M19 35 Q42 23 64 37 Q87 23 110 35 V98 Q87 85 64 102 Q42 87 19 98Z", ROSE) + path("M24 31 Q45 23 64 37 Q84 23 105 31 V91 Q85 82 64 97 Q44 82 24 91Z", IVORY) + path("M64 38 V95 M32 65 Q44 62 55 67 M32 75 Q44 72 55 77 M75 68 Q87 62 98 65 M75 78 Q87 72 98 75", stroke_width=2) + star(43, 47, 8, GOLD) + path("M78 54 L84 42 L91 54Z", SAGE) + path("M62 36 L62 73 L70 66 L77 71 L77 34Z", GOLD)),
        ("Book Stack", book(24, 84, 83, 19, LILAC) + book(32, 62, 72, 18, PEACH) + book(22, 40, 78, 18, SAGE) + book(38, 19, 62, 17, BLUE) + path("M88 59 V77 L95 72 L101 78 V59Z", GOLD) + path("M39 94 H95 M46 72 H93 M36 50 H90 M52 28 H90", stroke_width=2)),
        ("Library", rect(22, 25, 84, 83, PEACH, 4) + rect(29, 34, 70, 64, IVORY, 1) + path("M28 65 H100 M28 97 H100 M25 108 V114 M101 108 V114", stroke_width=4) + rect(33, 40, 12, 23, SAGE, 2) + rect(47, 37, 13, 26, GOLD, 2) + path("M65 40 L77 36 L86 60 L74 64Z", LILAC) + rect(84, 40, 10, 23, BLUE, 2) + rect(33, 74, 11, 21, LILAC, 2) + rect(46, 71, 13, 24, BLUE, 2) + rect(62, 75, 12, 20, ROSE, 2) + rect(77, 72, 17, 23, GOLD, 2) + path("M17 25 Q64 9 111 25Z", SAGE)),
        ("Story Castle", path("M19 105 V57 H38 V38 H88 V57 H108 V105Z", IVORY) + rect(16, 52, 25, 55, BLUE, 3) + rect(87, 52, 25, 55, BLUE, 3) + path("M12 53 L28 30 L45 53Z M83 53 L100 29 L116 53Z", PEACH) + path("M39 39 L64 13 L89 39Z", ROSE) + path("M64 14 V5 L83 10 L64 15Z", GOLD) + path("M50 106 V80 Q64 64 78 80 V106Z", GOLD) + path("M64 78 V106 M24 66 V76 M100 66 V76 M58 46 V57 M71 46 V57", stroke_width=3) + path("M9 107 Q35 101 64 111 Q93 101 119 107 L118 116 Q91 111 64 119 Q37 111 10 116Z", SAGE)),
    ]
    items["tools"] = [
        ("Pencil Stub", '<g transform="rotate(32 64 65)">' + rect(51, 34, 26, 48, GOLD, 2) + rect(51, 25, 26, 13, ROSE, 5) + path("M51 75 L64 105 L77 75Z", IVORY) + path("M59 94 L64 105 L69 94Z", INK) + path("M59 41 V72 M69 41 V72", stroke=GREEN, stroke_width=2) + '</g>'),
        ("Crayon", '<g transform="rotate(29 64 64)">' + path("M52 101 V41 L64 19 L76 41 V101Z", ROSE) + rect(50, 45, 28, 42, PEACH, 2) + path("M54 53 H74 M54 79 H74 M58 41 L64 29 L70 41", stroke_width=2) + star(64, 66, 7, IVORY) + '</g>'),
        ("Fountain Pen", '<g transform="rotate(31 64 64)">' + rect(53, 19, 22, 59, BLUE, 7) + path("M53 74 H75 L76 90 L64 112 L52 90Z", GOLD) + path("M64 110 V88 M53 75 H75 M59 25 V57", stroke_width=2.5) + circle(64, 87, 3, INK) + path("M75 28 H81 V57", stroke=GREEN, stroke_width=4) + '</g>'),
        ("Paintbrush", '<g transform="rotate(30 64 64)">' + path("M58 63 H70 L68 109 Q64 117 60 109Z", PEACH) + rect(54, 48, 20, 22, GOLD, 3) + path("M54 49 Q47 35 60 26 Q71 19 69 10 Q89 36 74 49Z", GREEN) + path("M60 40 Q68 30 67 24", stroke=SAGE, stroke_width=4) + path("M55 56 H73 M55 62 H73", stroke_width=2) + '</g>'),
        ("Palette", path("M110 65 Q114 32 78 24 Q42 17 23 44 Q7 67 25 89 Q45 115 70 102 Q82 96 68 85 Q60 76 72 72 Q83 68 89 79 Q101 90 110 65Z", GOLD) + ellipse(50, 82, 9, 7, IVORY) + circle(39, 44, 9, ROSE) + circle(61, 35, 9, BLUE) + circle(85, 43, 9, SAGE) + circle(96, 61, 8, LILAC) + path("M88 94 L108 107", stroke=GREEN, stroke_width=7) + path("M82 88 L90 89 L94 96 L89 101 L81 96Z", PEACH)),
        ("Framed Picture", portrait_frame(20, 24, 88, 80, PEACH) + circle(81, 46, 9, GOLD) + path("M28 89 L49 61 L68 82 L82 67 L100 88 V96 H28Z", SAGE) + path("M28 91 Q55 81 75 92 T100 91", GREEN, stroke="none") + path("M27 32 H101 M27 96 H101", stroke=IVORY, stroke_width=2)),
        ("Art Prize", rect(41, 100, 47, 11, PEACH, 3) + rect(48, 89, 33, 12, GOLD, 3) + path("M61 69 H69 V90 H61Z", GOLD) + path("M44 30 H84 V53 Q83 76 64 77 Q45 76 44 53Z", GOLD) + path("M43 37 H29 Q24 62 47 63 M85 37 H99 Q105 62 82 63", stroke_width=6, stroke=INK) + path("M43 37 H29 Q24 62 47 63 M85 37 H99 Q105 62 82 63", stroke_width=3, stroke=GOLD) + star(64, 51, 12, IVORY) + path("M50 31 V45", stroke=IVORY, stroke_width=3) + star(24, 20, 6, GOLD) + star(106, 78, 7, GOLD)),
        ("Masterpiece", path("M54 18 L34 116 M75 18 L95 116 M39 101 H91", stroke=GREEN, stroke_width=6) + portrait_frame(22, 26, 84, 74, GOLD) + path("M30 80 Q42 68 55 79 Q68 63 81 76 Q94 67 98 83 V92 H30Z", SAGE) + circle(84, 46, 8, GOLD) + path("M46 76 Q43 60 52 52 Q62 40 71 54 Q80 60 74 77Z", LILAC) + path("M52 52 L52 42 L60 48 M65 48 L74 42 L73 55", LILAC) + face(62, 62, 6, False) + path("M48 78 Q34 79 37 68", stroke_width=4) + star(16, 42, 7, GOLD) + star(113, 79, 7, GOLD)),
    ]
    items["creatures"] = [
        ("Squiggle Worm", path("M22 91 Q33 74 46 84 Q60 94 65 79 Q74 57 87 64 Q106 70 105 84", stroke=INK, stroke_width=23) + path("M22 91 Q33 74 46 84 Q60 94 65 79 Q74 57 87 64 Q106 70 105 84", stroke=SAGE, stroke_width=18) + circle(93, 62, 18, SAGE) + face(94, 62, 6) + path("M86 45 L83 36 M100 45 L104 37", stroke_width=2.5) + circle(82, 35, 3, GOLD) + circle(105, 36, 3, GOLD)),
        ("Ladybird", path("M36 59 L24 53 M33 76 L21 78 M42 94 L31 106 M92 59 L104 53 M95 76 L107 78 M86 94 L97 106", stroke_width=4) + circle(64, 44, 21, GREEN) + path("M52 27 L47 18 M77 27 L82 18", stroke_width=3) + ellipse(64, 75, 34, 33, ROSE) + path("M64 44 V107") + circle(47, 64, 7, INK) + circle(43, 84, 6, INK) + circle(81, 64, 7, INK) + circle(85, 84, 6, INK) + circle(57, 41, 3, IVORY, stroke="none") + circle(71, 41, 3, IVORY, stroke="none") + path("M59 48 Q64 52 69 48", stroke=IVORY, stroke_width=2)),
        ("Paper Bird", path("M18 77 L59 62 L80 31 L108 47 L95 60 L87 83 L64 100Z", IVORY) + path("M59 62 L44 27 L87 83Z", BLUE) + path("M59 62 L18 77 L64 100Z", SAGE) + path("M95 47 L115 53 L95 59Z", GOLD) + circle(86, 47, 3, INK, stroke="none") + path("M65 99 L61 111 M76 94 L78 106", stroke_width=3) + path("M49 44 L72 73", stroke=IVORY, stroke_width=3)),
        ("Ink Cat", path("M38 90 Q13 92 21 69 Q24 62 29 65", stroke_width=13, stroke=INK) + path("M38 90 Q13 92 21 69 Q24 62 29 65", stroke_width=8, stroke=GREEN) + ellipse(67, 85, 27, 24, GREEN) + path("M40 59 L40 28 L58 39 Q67 35 78 39 L95 27 L95 60 Q95 80 68 81 Q40 79 40 59Z", GREEN) + path("M45 43 V36 L54 43 M83 43 L90 36 V44", PEACH, stroke="none") + ellipse(67, 65, 18, 11, IVORY, stroke="none") + circle(56, 55, 3, IVORY, stroke="none") + circle(80, 55, 3, IVORY, stroke="none") + path("M64 62 L70 62 L67 66Z", ROSE, stroke_width=1.5) + path("M61 69 Q67 75 73 69 M38 61 L26 57 M38 67 L25 69 M96 61 L108 57 M96 67 L109 69", stroke_width=2) + ellipse(55, 106, 11, 5, IVORY) + ellipse(79, 106, 11, 5, IVORY)),
        ("Sketch Fox", path("M76 100 Q116 106 112 66 Q96 78 84 72Z", PEACH) + path("M112 66 Q115 86 104 95 L95 81Z", IVORY) + ellipse(61, 87, 25, 23, PEACH) + path("M31 50 L30 20 L54 36 Q64 32 74 36 L96 20 L93 53 Q87 73 62 83 Q38 73 31 50Z", PEACH) + path("M36 43 L35 30 L47 40 M80 40 L91 30 L88 44", ROSE, stroke="none") + path("M35 56 Q48 53 62 67 Q76 53 90 56 Q79 76 62 83 Q45 75 35 56Z", IVORY, stroke="none") + face(62, 51, 13, False) + path("M57 66 L67 66 L62 72Z", INK) + ellipse(49, 108, 10, 5, IVORY) + ellipse(72, 108, 10, 5, IVORY)),
        ("Margin Dragon", path("M74 76 L96 41 L112 74 L96 68 L86 90Z", LILAC) + path("M39 74 L18 52 L17 86 L32 81 L43 93Z", LILAC) + path("M80 100 Q110 107 111 87 Q121 113 90 115 L72 107Z", SAGE) + ellipse(64, 87, 29, 26, SAGE) + ellipse(64, 92, 15, 18, IVORY) + path("M40 43 L40 23 L52 34 M77 34 L91 23 L89 46", GOLD) + rect(37, 34, 56, 41, SAGE, 18) + face(64, 49, 12) + ellipse(64, 66, 22, 11, SAGE) + circle(56, 63, 2, INK, stroke="none") + circle(72, 63, 2, INK, stroke="none") + ellipse(43, 109, 12, 5, GREEN) + ellipse(85, 109, 12, 5, GREEN) + path("M36 77 L27 66 M93 72 L99 57", stroke_width=2)),
        ("Unicorn", path("M34 76 Q9 68 14 91 Q27 82 37 95Z", LILAC) + ellipse(62, 85, 31, 20, IVORY) + path("M42 94 V113 H52 L56 96 M75 94 L79 113 H89 L86 91", IVORY) + path("M69 80 Q56 58 71 39 Q86 26 97 44 L105 62 Q105 75 83 75 L84 92Z", IVORY) + path("M71 40 Q53 40 55 62 Q43 63 51 80 L68 84 L67 66Z", LILAC) + path("M83 36 L90 12 L96 39Z", GOLD) + path("M76 40 L70 25 L85 34Z", IVORY) + circle(90, 52, 3, INK, stroke="none") + ellipse(98, 63, 4, 2, PEACH, stroke="none") + path("M91 69 Q98 72 101 67", stroke_width=2) + star(32, 49, 8, GOLD)),
        ("Star Whale", path("M25 65 Q21 40 51 36 Q87 30 101 56 L112 42 L118 48 L115 64 L121 79 L113 85 L99 73 Q91 106 53 107 Q20 107 16 84 Q12 71 25 65Z", BLUE) + path("M20 84 Q52 99 98 74 Q90 105 53 107 Q27 106 20 84Z", IVORY, stroke="none") + path("M53 79 Q49 103 68 99 L78 86Z", BLUE) + circle(35, 68, 3, INK, stroke="none") + path("M27 79 Q34 83 40 77", stroke_width=2) + ellipse(42, 74, 5, 3, PEACH, stroke="none") + star(76, 55, 10, GOLD) + path("M48 31 Q43 20 34 24 M48 31 Q50 11 60 17", stroke=BLUE, stroke_width=4) + star(26, 34, 6, GOLD) + star(101, 21, 7, GOLD)),
    ]
    return items


def render(name, artwork):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-labelledby="title">
  <title id="title">{escape(name)}</title>
  <metadata>Original Doodle Heroes storybook artwork. SPDX-License-Identifier: CC0-1.0</metadata>
  <ellipse cx="64" cy="115" rx="36" ry="5" fill="{INK}" opacity=".10"/>
  <g stroke="{INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">{artwork}</g>
</svg>
'''


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    items = make_items()
    count = 0
    for chain, tiers in items.items():
        assert len(tiers) == 8, chain
        for tier, (name, artwork) in enumerate(tiers, start=1):
            target = OUT / f"{chain}-{tier}.svg"
            document = render(name, artwork)
            root = ET.fromstring(document)
            assert root.attrib["viewBox"] == "0 0 128 128"
            assert "<image" not in document and "<script" not in document
            target.write_text(document, encoding="utf-8")
            print(f"{target.name}: {name} ({target.stat().st_size} bytes)")
            count += 1
    assert count == 32
    print(f"Validated {count} SVGs; {sum(p.stat().st_size for p in OUT.glob('*.svg')):,} bytes total.")


if __name__ == "__main__":
    main()
