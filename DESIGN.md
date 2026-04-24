# Design System Strategy: Kinetic Canvas

## 1. Overview & Creative North Star

**Creative North Star: "The Ethereal Archive"**

This design system moves away from the rigid, grid-bound aesthetics of traditional streaming platforms to embrace a "Kinetic Canvas." Rather than boxing content into discrete containers, we treat the UI as a fluid, atmospheric space where anime titles breathe. The "Ethereal Archive" concept focuses on cinematic immersion, using deep tonal shifts and high-contrast typography to elevate anime from mere "content" to high-art editorial features. By utilizing intentional asymmetry and borderless transitions, we create a sense of infinite depth, mimicking the vastness of the midnight sky.

## 2. Colors

Our palette is rooted in the "Deep Dark" philosophy, utilizing a midnight base to make our vibrant lavender accents and anime key art feel luminous.

### The "No-Line" Rule

**Strict Mandate:** Designers are prohibited from using 1px solid borders to define sections. Layout boundaries must be achieved through:

- **Background Color Shifts:** Transitioning from `surface` (#060e20) to `surface_container_low` (#091327) to create soft structural changes.
- **Tonal Contrast:** Utilizing the `on_surface_variant` (#a3abc3) for secondary text to create hierarchy without physical lines.

### Surface Hierarchy & Nesting

Hierarchy is expressed through physical depth. Use the `surface_container` tiers to "stack" importance:

- **Level 0 (Base):** `surface` (#060e20) for the global canvas.
- **Level 1 (Sections):** `surface_container_low` (#091327) for large content blocks.
- **Level 2 (Cards/Modules):** `surface_container_high` (#141f37) for interactive elements that need to pull forward.

### The "Glass & Gradient" Rule

To escape the "flat" look, floating UI components (like navigation bars or hovering player controls) must use **Glassmorphism**. Apply `surface_variant` (#19253f) at 60% opacity with a 20px-32px backdrop blur.

### Signature Textures

Main CTAs and Hero moments should utilize a "Kinetic Glow." Apply a linear gradient from `primary` (#ba9eff) to `primary_container` (#ac91f1) at a 135-degree angle. This provides a "soul" to the interface that flat colors cannot replicate.

## 3. Typography

The system balances the aggressive, structural power of **Epilogue** with the modern, neutral clarity of **Inter**.

- **Display & Headlines (Epilogue):** These are our "Editorial Hooks." Use `display-lg` for marquee titles. The tight tracking and heavy weight of Epilogue should contrast against vast empty space, creating an authoritative, cinematic feel.
- **Body & Labels (Inter):** Inter provides the functional backbone. Use `body-md` for synopses and `label-sm` for metadata. Inter ensures that even at small sizes, readability is never sacrificed against the deep dark background.
- **Visual Rhythm:** Always pair a `headline-lg` with `body-md` to create a dramatic scale ratio, emphasizing the "High-End Editorial" intent.

## 4. Elevation & Depth

Depth in this system is an optical illusion created by light and layering, not structural shadows.

- **The Layering Principle:** Instead of shadows, place a `surface_container_lowest` (#000000) card on top of a `surface_container_low` (#091327) background to create a "recessed" or "inset" look.
- **Ambient Shadows:** For floating elements (e.g., Modals), use an ultra-diffused shadow: `0px 24px 48px rgba(0, 0, 0, 0.4)`. The shadow must feel like an ambient occlusion, not a hard drop shadow.
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` (#40485c) at **15% opacity**. This creates a suggestion of a container without breaking the Kinetic Canvas aesthetic.
- **Glassmorphism:** Use semi-transparent layers of `surface_bright` (#1f2b48) with a blur to allow the underlying anime artwork to bleed through, softening the interface's edges.

## 5. Components

### Buttons

- **Primary:** Gradient (`primary` to `primary_container`), `on_primary` (#371975) text, 8px corners. No border.
- **Secondary:** `surface_container_highest` (#19253f) background with a "Ghost Border."
- **States:** On hover, increase the gradient luminosity. On press, scale the component down to 98%.

### Chips (Genre/Tagging)

- Use `surface_container_low` (#091327) with `on_surface_variant` (#a3abc3) text. Use `full` (9999px) roundness to contrast against the 8px standard of cards.

### Input Fields

- Background: `surface_container_lowest` (#000000).
- Border: "Ghost Border" (15% opacity `outline_variant`).
- Focus State: Transition the border to 100% opacity `primary` (#ba9eff) with a subtle outer glow.

### Cards & Lists

- **Forbid Dividers:** Do not use lines to separate list items. Use 16px–24px of vertical whitespace or a subtle background shift to `surface_container_low` on every second item (zebra striping) if density is required.
- **The "Hero" Card:** Use an 8px radius. Content should overlay the image using a `surface_dim` (#060e20) gradient fade at the bottom to ensure text legibility.

### Specialized Component: The "Episode Pulse"

- For "Currently Watching" items, use a `tertiary` (#ff97b5) progress bar (2px height) at the bottom of the card. This high-contrast "pop" acts as a functional beacon within the navy environment.

## 6. Do's and Don'ts

### Do:

- **Embrace Asymmetry:** Place headlines off-center to create a dynamic, editorial feel.
- **Use Large Margins:** Give elements room to breathe; the "Kinetic Canvas" relies on negative space.
- **Tonal Transitions:** Use background color shifts to guide the user's eye from the sidebar to the main feed.

### Don't:

- **Don't use pure white (#FFFFFF):** Always use `on_background` (#dde5ff) or `on_surface_variant` (#a3abc3) to avoid eye strain in dark mode.
- **Don't use hard borders:** Never use a 100% opaque border for sectioning; it kills the "Kinetic" flow.
- **Don't crowd the canvas:** If the screen feels busy, increase the background `surface` area.
- **Don't use standard shadows:** Avoid the default "Material" shadows; they look "cheap" in a high-end dark theme. Stick to Tonal Layering.
