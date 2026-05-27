# Branding assets

Auto-generated from `render_logo.py`. The logo design matches the in-app splash and titlebar (9x9 grid with the center cell glowing accent `#f4a72c` on a charcoal `#0c0b09` background).

## Files

| File | Purpose |
|---|---|
| `logo-16.png` … `logo-1024.png` | Square logo on charcoal bg, multiple sizes for README / GitHub social preview / store listings |
| `logo-128-transparent.png` … `logo-1024-transparent.png` | Transparent background variants for embedding on light/dark surfaces |
| `logo-wordmark.png` | Logo + "KillerSudoku" wordmark (1843×512), good for headers and OG cards |
| `favicon.ico` | Multi-resolution favicon (16/32/48/64/128/256) |

## Regenerate

```bash
cd branding
python3 render_logo.py
```

Requires Pillow. The script reads no external assets — the logo is entirely procedurally rendered to match `src/renderer/components/animations/SplashScreen.tsx`.

## Use in README

```markdown
<p align="center">
  <img src="branding/logo-wordmark.png" alt="KillerSudoku" width="640">
</p>
```

## Recommended GitHub social preview

Upload `logo-wordmark.png` (1843×512) under repo Settings → Social preview.
