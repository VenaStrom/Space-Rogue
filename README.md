# Space Rogue

A browser-based space roguelite. You control a single ship, equip it with items you find or buy, and jump between star systems on a node map — until you get destroyed. Then you start over.

Inspired by [Battlevoid: Harbinger](https://store.steampowered.com/app/396480/Battlevoid_Harbinger/).

**Play the current build:** https://venastrom.github.io/Space-Rogue/

## Status

This repo is currently a **sandbox for testing concepts** — not yet a game. What exists today:

- **Workshop** — equip slot items (thrusters, weapons) from an inventory onto the ship's hardpoints.
- **Ship Editor** — SVG-based hull editor: draw hull vertices and place typed hardpoints (weapon / thruster / misc / command / power), with mirroring.
- **Combat** — canvas arena with fixed-timestep physics: fly the ship (WASD), asteroid collisions, camera with look-ahead, starscape, minimap.

Nothing persists yet; refreshing loses all state.

## Game plan

The core loop:

1. Start a run with a basic ship.
2. Travel a map of nodes connecting star systems, sector by sector.
3. Fight what you find there; loot wrecks, buy and sell equipment, take on events.
4. Grow the ship's capabilities through what you slot onto it.
5. Die. Start over.

A full run should feel like a session — roughly 1–2 hours.

### Design decisions

**Items really affect the playstyle.** The guiding pillar: equipment shouldn't just be stat bumps — what you slot changes *how you play*. The command slot deciding your control scheme, hangars turning you into a carrier, targeting computers changing how you aim: that pattern should run through the whole item pool.

**Control is defined by your command slot.** A *cockpit* gives direct piloting; a *command bridge* gives strategic/tactical orders instead. Flavors of each allow or disallow manual weapon control in exchange for buffs. Starting ships get direct control with auto-tracking, auto-firing turrets so new players aren't punished for not doing everything at once.

**Damage is per-component.** Shields protect the whole ship but have zones. Slotted items take individual damage and can be knocked out. Advanced targeting computers — or plain skill when firing manually — let you aim at specific enemy components. The hull almost always takes chip damage through it all, and hulls have directional armor areas (e.g. thicker plating up front), so facing matters.

**Power is managed, not budgeted — once you've earned it.** The endgame model is diverting power between systems live in combat, FTL-style, rather than a hard cap on what you can slot. But early reactors won't allow rerouting and/or will cap you from adding more; later reactors unlock power management as a feature, once the player has the experience to use it.

**Single ship, but fighters are first-class.** No fleet control — instead hangars are equippable slot items. Fighters launch, fight autonomously, and can be lost and replaced. Fighter builds should be very viable.

**The map is open, but lollygagging costs you.** Harbinger-style sector hopping rather than a one-way branching path. Jumping and idling drain fuel/supplies — run dry and you're stranded into bad encounters (exact mechanism still being tuned). Runs are structured as chained sectors with exit gates: effectively endless, death is the ending.

**Items form a taxonomy: category → subcategory → variant.** Wide slot categories break into distinct subcategories with their own identities, which branch again into variants. E.g. command → [cockpit, bridge, maybe computer] → missile cockpit vs gun cockpit vs speed cockpit; accuracy bridge vs a plot-many-nav-points bridge. (Early spitball — the shape matters more than these exact examples.)

**Items compose from a large effect pool.** Many small effect building blocks exist; a common item uses just one or two of them with counterbalancing debuffs, while rarer items carry stronger buffs (and fewer strings attached). Rarity is about how much of the effect pool an item taps and how cleanly.

**Stats read dumb, numbers for the nerds.** Ratings are described in plain terms — "bad", "poor", "fine", "good", "super" — so you don't have to think too much, with the actual number still there for the nerds. Grades are honest: in procedural generation, each rating tier corresponds to a cap per stat category.

**Item generation is procedural at dev time only.** Items get procedurally generated during development as a design aid — then hand-curated and frozen into the game's fixed item pool when they're good. Players never see a random item; they see the keepers. Each subcategory can have its own generation algorithms keyed off its stat shape.

*Worked example — shields.* A shield's stats: number of segments, strength (graded, number underneath), a shape enum (e.g. several zones up front and a single one aft makes a "front sider"), charge rate, and a bool for whether redistributing shield power between zones is possible/allowed. A wanted archetype: a shield with zones *only* in the front — exposed sides in exchange for more capacity or charge rate. The generator can have a different algorithm per shape/archetype.

**Economy: salvage, shops, events.** Destroyed enemies drop salvage in the arena; station nodes have shops with currency-based trade; non-combat events (distress calls, anomalies) pay out for choices and risk. No crafting.

**Distinct tech factions.** Multiple factions with visually and mechanically distinct hulls and equipment — loot reflects who you fought. (The repo's `ships/republic/` folder is the first of these.)

**Meta-progression: hulls and trophies.** Dying can unlock new starting hulls. Certain items — legendary finds, achievement rewards — can be added to your permanent starting loadout.

**No crew.** The ship is the character; all management is equipment and resources.

**The hull editor is a dev tool.** Players pick premade hulls; the editor is for authoring them, not a player-facing feature.

Raw spitball ideas — item examples, archetypes, variants — are collected in [docs/ideas.md](docs/ideas.md).

### Open questions

- The exact fuel/supply pressure mechanism and its tuning.
- Art direction — programmer-art polygons until the mechanics prove out, then decide.
- How shield zones, armor areas, and component targeting interact in practice.
- Faction count, identities, and how faction tech trees differ mechanically.

## Tech

- TypeScript + React 19 + Vite 8, Tailwind CSS 4
- No game engine — hand-rolled Canvas 2D rendering and physics
- Yarn 4 (Berry), ESLint 9 flat config
- Deployed to GitHub Pages on push to `main`

### Commands

```sh
yarn dev     # dev server
yarn build   # type-check + production build
yarn lint    # type-check + eslint
```

## Credits

- Icons by [Remix Icon](https://remixicon.com) and [game-icons.net](https://game-icons.net) (CC BY 3.0)
