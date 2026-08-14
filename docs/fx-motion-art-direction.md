# Tango effect motion art direction

## Quality benchmark

`Cosmos Orbit` is the minimum quality bar for a premium Tango effect. An effect should feel like a short material response to a tile landing, not an icon pasted over the tile.

Every effect is built from three readable beats:

1. **Material response** — the tile lands, compresses, tilts, warms, ripples, or catches light.
2. **Signature action** — one unmistakable action communicates the product identity.
3. **Residue** — a restrained glint, smoke trail, halo, or settled mark completes the motion.

Only one beat owns the viewer's attention at a time. Secondary details support the primary action and never compete with it.

## Motion rules

- Keep placement effects between 320 and 900 milliseconds. Only legendary effects may exceed 820 milliseconds.
- Use `cubic-bezier(.18,.86,.24,1)` for landing and `cubic-bezier(.4,0,.2,1)` for mechanical folding or locking.
- Avoid elastic overshoot, cartoon bounce, constant rotation, and confetti-like particles.
- Keep all pixels inside the rounded cell mask. No particle may cover a neighboring cell or game UI.
- Preserve tile readability throughout the effect. The selected skin remains recognizable.
- Common effects use one primary motion. Rare uses one material motion plus one accent. Epic and legendary may add one ambient residue layer.
- Reduced motion keeps only a short landing/settle frame.

## Visual rules

- Use Tango's burgundy, navy, forest, ivory, walnut, and brass palette as the base.
- Highlights are warm ivory, not pure white, except for a very short specular glint.
- Shadows are contact shadows attached to the tile, never floating in an arbitrary direction.
- Lines need a dark support edge when placed over bright or gradient skins.
- Prefer layered transparency, bevel, and controlled glow over flat symbols.
- Effects must remain legible on bright, dark, and gradient tiles at 320px mobile width.

## Reference-generation prompt

Use generated video or images only as motion reference, not as a shipped sprite sheet:

> A premium, restrained game UI tile-placement effect for Tango, a modern 5x5 color strategy board game. One rounded square tile occupies the exact center of a single board cell. The tile itself reacts physically to placement, followed by one clear material-specific signature action and a subtle finishing residue. Modern editorial board-game art direction, walnut and ivory materials, burgundy/navy/forest accents, warm brass highlights, precise easing, no cartoon bounce, no confetti, no floating UI icon, no text, no camera move, no neighboring cells, transparent background, all motion clipped to the rounded cell boundary, 60 fps motion reference.

Append the specific material action, for example: `two brushed-brass rings counter-rotate once and interlock at the center with a single restrained glint`.

## Acceptance checklist

- The effect is identifiable without reading its name.
- The tile, not an overlay card, remains the main subject.
- The action reads at normal game scale and does not rely on the enlarged lab view.
- The first, middle, and final frames are visually intentional.
- Repeated playback is calm enough for a full match.
- No overflow, layout shift, stale animation, or simultaneous legacy renderer appears.
