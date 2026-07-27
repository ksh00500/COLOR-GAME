# Tango victory effects v2

## Current state

The original twelve victory effects are retired. Catalog and ownership records
remain in the database, but the items cannot be sold, crafted, equipped, or
selected by weekly rotation. Existing loadouts are reset to the neutral match
result.

Retired ownership is reserved for a same-rarity replacement when v2 launches.
No replacement item should ship until its desktop and mobile preview is
approved.

## Product boundary

- The result summary remains stable and does not change per cosmetic.
- An effect may use only a bounded center stage above the score summary.
- The reveal should finish within 1.5 seconds and must not loop.
- It must not introduce viewport scrolling, layout shifts, repeated flashes,
  strong screen shake, or input blocking after the reveal.
- Loss and draw presentations always use the neutral result.
- Mobile performance and 320 px layouts are release requirements.

## Prototype directions

1. **Color Link** — the winning linked tiles converge into the Tango mark.
2. **Wooden Stamp** — a refined wooden seal stamps the result into place.
3. **Palette Sweep** — the player's three equipped tile colors reveal the
   verdict through one controlled sweep.
4. **Cosmos Link** — linked tiles become a small constellation that forms the
   Tango mark.

Each direction must first be reviewed as a desktop and mobile motion prototype.
Only the approved visual language should be expanded into rarity tiers.
