# SchoolSports Pro — Logo Assets

Vector logos for the SchoolSports Pro SaaS platform (school sports tournament management).

## Files

| File | Use |
|------|-----|
| **logo.svg** | Horizontal logo (icon + wordmark + tagline). Website header, marketing pages. 240×48 px. |
| **logo-icon.svg** | Icon only, square 64×64. Favicon, app icon, social avatar. |
| **logo-dark-bg.svg** | Same layout with white wordmark and lighter-blue icon stroke for dark headers / footers. |

## Colors

| Role | Hex | Usage |
|------|-----|-------|
| Primary blue | `#1E40AF` | S-track spine, start dot, light-bg wordmark |
| Light blue | `#60A5FA` | S-track spine on dark backgrounds |
| Sport orange | `#F97316` | Speed chevron, finish dot, "Pro" tspan |
| Dark slate | `#0F172A` | Wordmark on light backgrounds |
| Muted | `#64748B` / `#94A3B8` | Tagline text (light / dark) |

## Icon — Track-S Monogram

The icon is a stylised **"S" letterform** built from a single continuous cubic-bezier path that traces the shape of an **athletics S-bend double-lane track**. Two design accents reinforce the sports-tech identity:

- **Orange forward chevron** (`›`) at the upper-right — suggests speed, forward motion, and performance data.
- **Lane-marker dots** at the start (blue) and finish (orange) endpoints of the S — evoke lane numbering and a race start/finish.

The shape scales cleanly from 16 px (favicon) to large display sizes with no gradients or raster elements.

## Wordmark

- **"SchoolSports"** — `font-weight: 700`, dark slate (`#0F172A`) on light / white on dark
- **"Pro"** — `font-weight: 800`, sport orange (`#F97316`), slightly heavier to pop
- Tagline: `SPORTS MANAGEMENT PLATFORM` in small-caps spaced lettering below

## Usage

```html
<!-- Light header -->
<img src="/logo.svg" alt="SchoolSports Pro" width="200" height="40" />

<!-- Dark header / footer -->
<img src="/logo-dark-bg.svg" alt="SchoolSports Pro" width="200" height="40" />

<!-- Favicon (SVG, modern browsers) -->
<link rel="icon" type="image/svg+xml" href="/logo-icon.svg" />
```

## Scalability

All files are pure SVG (no raster, no gradients). Export `logo-icon.svg` at 512×512 PNG for PWA manifests and app-store icons.
