# Neon Dark Theme for your casino-affiliate

This package includes a **drop-in CSS theme** and integration notes to get the "PropFirmMatch-style" neon dark look: purple/cyan glow, glassy cards, soft gradients.

## How to use (plain HTML/CSS)
1. Copy `neon-theme.css` into your project (e.g., `public/css/`).
2. Add `<link rel="stylesheet" href="/css/neon-theme.css" />` to your HTML.
3. Use the utility classes:
   - `neon-container`, `neon-hero`, `neon-input`, `neon-btn`, `neon-chip`, `neon-card`, `neon-table`, `neon-footer`.
   - Add `featured` to `.neon-card` for a glowing card.

## How to use (React + Tailwind)
- Import the CSS once in `src/main.tsx` or `src/index.tsx`: `import "./neon-theme.css"`.
- Keep Tailwind utilities, but these classes give you immediate neon styling without editing tailwind.config.
- If you prefer tokens inside Tailwind, extend your `tailwind.config.js` like below.

```js
// tailwind.config.js (excerpt)
export default {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        bg0: '#0b0a0f',
        primary: '#b86bff',
        primary2: '#7c3aed',
        accent: '#22d3ee',
        hot: '#ff1f8f',
        lime: '#3bd671',
      },
      boxShadow: {
        neon: '0 0 0 2px rgba(184,107,255,.35), 0 0 30px rgba(184,107,255,.25)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
}
```

## Example markup
```html
<section class="neon-hero">
  <div class="neon-container">
    <span class="neon-chip">500+ Offers</span>
    <h1>The Leading Prop Firm Comparison Platform</h1>
    <p class="neon-subline">Where serious traders compare top firms — and get the best discounts.</p>
    <div class="neon-search">
      <input class="neon-input" placeholder="Search firms, bonuses, licenses..." />
      <button class="neon-btn">Search</button>
    </div>
  </div>
</section>
```