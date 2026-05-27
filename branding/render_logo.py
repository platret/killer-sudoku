"""Render KillerSudoku logo PNGs from the in-app splash design.

Mirrors src/renderer/components/animations/SplashScreen.tsx:
- 9x9 grid, center cell glows accent #f4a72c
- Major-block intersections (r%3==0, c%3==0) tinted accent
- Other cells faint ink with distance falloff
- Charcoal background, soft radial glow
"""
from __future__ import annotations
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path

OUT = Path(__file__).parent

ACCENT = (244, 167, 44)        # #f4a72c
INK_BG = (12, 11, 9)           # #0c0b09
INK_NEUTRAL = (163, 154, 138)  # rgba(163, 154, 138, a)


def lerp(a: int, b: int, t: float) -> int:
    return int(round(a + (b - a) * t))


def blend(rgb: tuple[int, int, int], alpha: float, bg: tuple[int, int, int] = INK_BG) -> tuple[int, int, int]:
    return (
        lerp(bg[0], rgb[0], alpha),
        lerp(bg[1], rgb[1], alpha),
        lerp(bg[2], rgb[2], alpha),
    )


def rounded_rect(draw: ImageDraw.ImageDraw, xy, radius: int, fill, outline=None):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline)


def render_logo(size: int, *, transparent_bg: bool = False, with_wordmark: bool = False) -> Image.Image:
    """Render the logo at `size` x `size` (square)."""
    # Reserve extra width for wordmark variant.
    if with_wordmark:
        canvas_w, canvas_h = int(size * 3.6), size
    else:
        canvas_w, canvas_h = size, size

    bg = (0, 0, 0, 0) if transparent_bg else (*INK_BG, 255)
    img = Image.new("RGBA", (canvas_w, canvas_h), bg)

    # Radial glow halo behind the grid (skipped when transparent).
    if not transparent_bg:
        halo = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        hdraw = ImageDraw.Draw(halo)
        cx = size // 2
        cy = size // 2
        for radius, alpha in [(size * 0.55, 28), (size * 0.42, 36), (size * 0.30, 52)]:
            r = int(radius)
            hdraw.ellipse(
                (cx - r, cy - r, cx + r, cy + r),
                fill=(*ACCENT, alpha),
            )
        halo = halo.filter(ImageFilter.GaussianBlur(size * 0.08))
        img.alpha_composite(halo)

    # Compute grid geometry: 9 cells, gap, padded inside the size.
    pad = int(size * 0.08)
    grid_size = size - pad * 2
    gap = max(1, int(size * 0.014))
    cell = (grid_size - gap * 8) / 9.0
    radius = max(1, int(cell * 0.18))

    draw = ImageDraw.Draw(img, "RGBA")

    for i in range(81):
        r = i // 9
        c = i % 9
        dist = max(abs(r - 4), abs(c - 4))
        x0 = pad + c * (cell + gap)
        y0 = pad + r * (cell + gap)
        x1 = x0 + cell
        y1 = y0 + cell

        is_center = i == 40
        is_major = (r % 3 == 0) and (c % 3 == 0)

        if is_center:
            fill = (*ACCENT, 255)
        elif is_major:
            fill = (*blend(ACCENT, 0.18), 255 if not transparent_bg else 230)
        else:
            alpha_f = 0.12 + (4 - dist) * 0.04  # 0.12..0.28
            if transparent_bg:
                fill = (*INK_NEUTRAL, int(alpha_f * 255))
            else:
                fill = (*blend(INK_NEUTRAL, alpha_f), 255)
        rounded_rect(draw, (x0, y0, x1, y1), radius=radius, fill=fill)

    # Center cell glow — additive bloom layer.
    cx_idx = 4
    cy_idx = 4
    cx0 = pad + cx_idx * (cell + gap)
    cy0 = pad + cy_idx * (cell + gap)
    cx1 = cx0 + cell
    cy1 = cy0 + cell
    bloom = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bloom)
    # Big halo
    halo_pad = int(cell * 1.4)
    bdraw.rounded_rectangle(
        (cx0 - halo_pad, cy0 - halo_pad, cx1 + halo_pad, cy1 + halo_pad),
        radius=int((cell + halo_pad) * 0.6),
        fill=(*ACCENT, 90),
    )
    bloom = bloom.filter(ImageFilter.GaussianBlur(cell * 0.45))
    img.alpha_composite(bloom)
    # Re-draw the crisp center cell on top so it stays sharp.
    rounded_rect(draw, (cx0, cy0, cx1, cy1), radius=radius, fill=(*ACCENT, 255))
    # Small inner highlight on center for a "glass" look (only if cell big enough).
    if cell >= 8:
        inner_pad = max(1, int(cell * 0.18))
        hl_y1 = cy0 + cell * 0.45
        hl_x1 = cx1 - inner_pad
        hl_x0 = cx0 + inner_pad
        hl_y0 = cy0 + inner_pad
        if hl_x1 > hl_x0 and hl_y1 > hl_y0:
            rounded_rect(
                draw,
                (hl_x0, hl_y0, hl_x1, hl_y1),
                radius=max(1, int(cell * 0.12)),
                fill=(255, 230, 188, 90),
            )

    if with_wordmark:
        # Draw "KillerSudoku" wordmark to the right of the grid.
        from PIL import ImageFont
        text_x = size + int(size * 0.22)
        font_size = int(size * 0.36)
        try_fonts = [
            "/System/Library/Fonts/Supplemental/Futura.ttc",
            "/System/Library/Fonts/HelveticaNeue.ttc",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
        font = None
        for path in try_fonts:
            try:
                font = ImageFont.truetype(path, font_size)
                break
            except OSError:
                continue
        if font is None:
            font = ImageFont.load_default()

        # KILLER (accent gradient simulated as solid accent), SUDOKU (ink)
        tdraw = ImageDraw.Draw(img)
        killer_text = "Killer"
        sudoku_text = "Sudoku"
        bbox_k = tdraw.textbbox((0, 0), killer_text, font=font)
        kw = bbox_k[2] - bbox_k[0]
        kh = bbox_k[3] - bbox_k[1]
        ty = (canvas_h - kh) // 2 - int(size * 0.02)
        tdraw.text((text_x, ty), killer_text, fill=(*ACCENT, 255), font=font)
        tdraw.text(
            (text_x + kw + int(size * 0.04), ty),
            sudoku_text,
            fill=(245, 240, 232, 255),
            font=font,
        )

    return img


def main() -> None:
    sizes = [16, 32, 64, 128, 256, 512, 1024]
    for s in sizes:
        path = OUT / f"logo-{s}.png"
        render_logo(s, transparent_bg=False).save(path, "PNG", optimize=True)
        print(f"wrote {path}")

    # Transparent variants for embedding.
    for s in [128, 256, 512, 1024]:
        path = OUT / f"logo-{s}-transparent.png"
        render_logo(s, transparent_bg=True).save(path, "PNG", optimize=True)
        print(f"wrote {path}")

    # Wordmark variant.
    wm = render_logo(512, transparent_bg=False, with_wordmark=True)
    wm.save(OUT / "logo-wordmark.png", "PNG", optimize=True)
    print(f"wrote {OUT / 'logo-wordmark.png'}")

    # Favicon-style ICO.
    favicons = [render_logo(s, transparent_bg=False) for s in (16, 32, 48, 64, 128, 256)]
    favicons[0].save(
        OUT / "favicon.ico",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print(f"wrote {OUT / 'favicon.ico'}")


if __name__ == "__main__":
    main()
