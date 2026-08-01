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

**Control is defined by your command slot.** A *cockpit* gives direct piloting; a *command bridge* gives strategic/tactical orders; a *computer* automates the arena entirely — each computer ships with its own doctrine and usually extra buffs to counter that rigidity, while strategic decisions (like when to jump) stay yours. Flavors of each allow or disallow manual weapon control in exchange for buffs. The bridge's order vocabulary is deliberately lean: plot nav points (bridge quality decides how many) and designate a focus target — everything else is automatic. Starting ships get direct control with auto-tracking, auto-firing turrets so new players aren't punished for not doing everything at once.

**Damage is per-component.** Shields protect the whole ship but have zones. Slotted items take individual damage and can be knocked out. Advanced targeting computers — or plain skill when firing manually — let you aim at specific enemy components. The hull almost always takes chip damage through it all, and hulls have directional armor areas (e.g. thicker plating up front), so facing matters.

**Power is managed, not budgeted — once you've earned it.** The endgame model is diverting power between systems live in combat, FTL-style, rather than a hard cap on what you can slot. But early reactors won't allow rerouting and/or will cap you from adding more; later reactors unlock power management as a feature, once the player has the experience to use it.

**Single ship, but fighters are first-class.** No fleet control — instead hangars are equippable slot items. Fighters launch, fight autonomously, and can be lost and replaced. Fighter builds should be very viable.

**The map is open, but lollygagging costs you.** Harbinger-style sector hopping rather than a one-way branching path. The pressure resource is the **jump visa**: jumping legally requires one, and they're bought and collected during play. Jump without one and you summon the authorities — massively overpowered, likely lethal, and they chase you. Runs are structured as chained sectors with exit gates: effectively endless, death is the ending. The exit is literally a **jump gate** — it slings you to another system, and the next sector begins.

**Authorities are shakeable heat, contained per sector.** Once summoned they stay on the current sector map and know about you — a standing hazard occupying systems you now shouldn't jump into. Heat can be shed, and they don't follow you to the next sector; the exit gate is a hard reset on your record.

**No set bosses.** Difficulty comes from escalating regular encounters, not designed boss fights.

**Sectors are themed.** Each sector rolls an identity — nebula sensor fog, dense asteroid belts, faction territory, derelict fields — that shapes its arenas and encounters.

**Difficulty is custom run mods.** Player-picked run modifiers (mutators) that trade extra difficulty for reward multipliers, rather than fixed difficulty presets or an ascension ladder. All four flavors are in scope: economic screws (pricier visas, stingier salvage), combat modifiers (higher enemy grades, denser fights), rule twists (no shield regen in combat, drives that never charge under fire), and reward doublers as the payoff side.

**Weapons: no ammo, twin-stick aim within arcs.** No consumable ammunition anywhere — fire rate and power are the only limits. Under direct piloting you aim with the mouse cursor, twin-stick style, but each hardpoint respects its firing arc.

**Slow-mo, not pause.** Issuing orders dilates time rather than stopping it — the pressure stays on, but you can think. No full tactical pause.

**Light fog of war.** Unexplored map nodes are unknown and the arena minimap has range limits, but there's no stealth/cloaking layer — clarity over ambush gameplay.

**The arena fights back.** Collisions and ramming deal real damage (ramming builds are a legitimate, silly option), sectors bring environmental hazards (minefields, radiation, gravity wells), and terrain is usable — block shots behind asteroids, lure enemies into hazards.

**Light worldbuilding, one framing premise.** You're a republic commander who stumbled onto a plot, stole a crucial component of it, and set out to hunt the "rebels" behind it — not realizing it's an inside job your own leadership can't admit to. They keep you busy with a fetch quest per sector while they figure out how to stop you; the overarching goal is delivering what you carry. Command has conveniently "lost track of your ship number" (hence the visas), and the military police won't hear your explanations — an unstoppable force that's on paper your own side, in an awfully bureaucratic way. The tone stays lighthearted while dark things happen behind the scenes: the commander is kinda dense, the player slowly figures it out, and every move the republic makes against you keeps a facade of believability. Beyond that, lore lives in item and event text.

**Events come in two tiers.** Mostly short FTL-style text events — a paragraph, a few choices; plus a rarer tier of playable arena scenarios (escorts, salvage under pressure, and the like).

**Slots: core types plus per-hull utility mounts, gated by power hookup.** Hulls offer dedicated core slots (weapons, thrusters, command, power, shields) plus utility slots the hull itself defines — the generic "misc" catch-all disappears. Utility slots can be reserved for specific categories (a carrier's hangar mounts), and a slot's power hookup gates what fits: a high-power slot accepts anything, while a weak one only takes low-draw items (hangars, sensors, and the like).

**Weapons are categorized by role, not projectile.** Sustained DPS, burst/alpha, point defense, utility — the projectile type (gun, launcher, beam) is a variant axis within each role, not the top of the taxonomy.

**First-playable core: power distribution.** That mechanic is load-bearing for the intended feel and ships in the first fun build. Shield zones, component damage/targeting, and fighters/hangars scale in later — a whole-ship shield bubble stands in until zones matter.

**Items form a taxonomy: category → subcategory → variant.** Wide slot categories break into distinct subcategories with their own identities, which branch again into variants. E.g. command → [cockpit, bridge, maybe computer] → missile cockpit vs gun cockpit vs speed cockpit; accuracy bridge vs a plot-many-nav-points bridge. (Early spitball — the shape matters more than these exact examples.)

**Items compose from a large effect pool.** Many small effect building blocks exist; a common item uses just one or two of them with counterbalancing debuffs, while rarer items carry stronger buffs (and fewer strings attached). Rarity is about how much of the effect pool an item taps and how cleanly.

**Items interact — and the UI owns the confusion.** Equipment features can depend on other slots (a shield's redistribute feature needs a reactor/bridge that supports it; hangars need something that can command fighters). The UI must make compatibility problems obvious with clear notifications, never silent failure. How strict the agreement requirements are is deliberately loose — builds shouldn't be locked down too hard.

**Stats read dumb, numbers for the nerds.** Ratings are described in plain terms — "bad", "poor", "fine", "good", "super" — so you don't have to think too much, with the actual number still there for the nerds. Grades are honest: in procedural generation, each rating tier corresponds to a cap per stat category.

**Item generation is procedural at dev time only.** Items get procedurally generated during development as a design aid — then hand-curated and frozen into the game's fixed item pool when they're good. Players never see a random item; they see the keepers. Each subcategory can have its own generation algorithms keyed off its stat shape.

*Worked example — shields.* A shield's stats: number of segments, strength (graded, number underneath), a shape enum (e.g. several zones up front and a single one aft makes a "front sider"), charge rate, and a bool for whether redistributing shield power between zones is possible/allowed. A wanted archetype: a shield with zones *only* in the front — exposed sides in exchange for more capacity or charge rate. The generator can have a different algorithm per shape/archetype.

**Retreat is a power decision.** Fleeing a bad fight means diverting power to your jump drive at the cost of thrust, weapons, and shields. Setups without power redirect charge the jump drive statically instead. Whether a drive can charge in combat at all is a per-item property (stable vs unstable jump tech).

**Repairs are layered.** Components come back online automatically between fights; hull damage persists and costs real resources — station/shipyard repairs competing with shopping money, equippable repair systems/drones, and scarce consumable patches you spend when you choose.

**Enemies are built same-ish.** Enemy ships use the hull + slotted-component system (so component targeting works on them), but with enemy-only equipment and hand-tuned loadouts; what they drop is curated separately from what they carry.

**Save anywhere.** Runs are 1–2 hours, so you can suspend a run at any point outside combat and resume later.

**Economy: salvage, shops, events.** Destroyed enemies drop salvage in the arena; station nodes have shops with currency-based trade; non-combat events (distress calls, anomalies) pay out for choices and risk. No crafting.

**Salvage runs through cargo space.** Hulls have cargo holds. Out of combat, a UI shows items floating in space alongside your hold, and you move what you want to keep or discard — collection can be arena-wide, but never during combat. Cargo is definitely a hull stat, but with a reasonable minimum everywhere: more flavor than gameplay-deciding. What makes it matter is that **items can be swapped freely any time outside combat** — so a freighter with a big hold can effectively carry multiple loadouts.

**Stations are immobile hulls.** Stations physically exist in their node's arena, armed — if enemies show up, you fight with the station present. They're built as hulls without movement, marked as stations. But commerce doesn't require the arena: a UI on the map screen handles the shopping unless there's a reason to be there. Each station spawns belonging to a faction — drawn from the fighting factions plus a neutral-traders pool — and you have **reputation** with that faction. Rep is deliberately shallow: it persists for the whole run (unlike heat), good rep from quests and events slightly improves prices, and bad rep past a threshold just means aggression.

**Run starts: safe orientations or a daring draft.** Pick an unlocked hull, then either a static orientation (a coherent starter kit) with rolling effects for variety — or, for the daring, draft starting items from a random offering with no guarantee of synergy. Initial orientations: **Gunner** (cockpit + sustained guns), **Skirmisher** (cockpit + dancer thrusters + burst weapons), **Commander** (bridge + starter fighter wing). A computer-based orientation is deliberately not a starter. (Permanent-loadout trophies come along per the meta-progression rules.)

**Audio: diegetic minimal.** Ship hums, radio chatter, muffled space combat; music sparse and situational.

**Distinct tech factions — start with two, design for N.** Factions have visually and mechanically distinct hulls and equipment, and loot reflects who you fought. Two factions ship first — the republic's balanced, reliable gear versus an outlaw **unstable overdrive** identity (stronger effects with nasty counterbalances: unstable jump drives, overcharged reactors, glass weapons — high-variance loot) — but the faction system (tech identity, reputation, spawn pools) is built to take additions cheaply. (The repo's `ships/republic/` folder is the first of these.)

**Meta-progression: hulls and trophies.** Dying can unlock new starting hulls. Certain items — legendary finds, achievement rewards — can be added to your permanent starting loadout.

**No crew.** The ship is the character; all management is equipment and resources.

**The hull editor is a dev tool.** Players pick premade hulls; the editor is for authoring them, not a player-facing feature.

Raw spitball ideas — item examples, archetypes, variants — are collected in [docs/ideas.md](docs/ideas.md).

### Open questions

- Jump-visa tuning: pricing, availability, and exactly how the authorities behave once summoned.
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
