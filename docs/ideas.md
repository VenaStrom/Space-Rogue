# Idea scratchpad

Spitballed ideas captured so they can be revisited later. Nothing here is a commitment —
the distilled decisions live in the README; this is the raw material. Add freely, prune never.

## Items — command slot

- Taxonomy example: command → [cockpit, bridge, maybe computer].
- Cockpit variants: missile cockpit, gun cockpit, speed cockpit.
- Bridge variants: accuracy bridge, a bridge that lets you plot many nav points.
- Cockpit = direct piloting, bridge = strategic orders; flavors of each allow/disallow
  manual weapon control in exchange for buffs.
- "Computer" is the third command subcategory: fully automated arena combat. Each
  computer ships with a different strategy/doctrine, often with more buffs as a
  counter to the rigidness. Strategic decisions (jumping etc.) stay with the player;
  in the arena it does whatever it does.
- Bridges almost always allow fighter command, with varying efficacy; cockpits
  generally don't.
- Bridge order vocabulary: nav points + focus target only. Bridge quality = how many
  nav points you can plot. Everything else automatic.
- Computer doctrine sketches: range keeper (holds the engagement band its weapons
  dictate), berserker (always closes, focuses nearest/weakest, zero self-preservation,
  huge buffs), turtle (shield facing + point defense, wins by attrition, can't chase),
  opportunist (fires at whatever component is most exposed across all enemies —
  chaotic but surgical).

## Items — shields

- Stats: number of segments, strength (graded, real number underneath), shape enum,
  charge rate, bool for whether redistributing between zones is possible/allowed.
- Shape enum example: several zones up front + a single one aft = "front sider".
- Archetype wanted: zones only in the front — exposed sides in exchange for more
  capacity or charge rate.
- Shields protect the whole ship, but zones make positioning matter.

## Items — reactors / power

- Early reactors: no power rerouting and/or a cap on adding more equipment.
- Later reactors: unlock live power management (FTL-style diverting) as a feature,
  matching player experience.

## Items — thrusters

- Role variants, mirroring the weapon taxonomy: cruise (top speed), brawler
  (acceleration), dancer (turn/strafe) — counterbalanced stats per role.

## Items — reactors (continued) / power notes

- Reactors are the only power subcategory for now — output, reroute capability, and
  stability live as stats/bools on the reactor.
- Capacitors/batteries (buffering burst draw: alpha strikes, jump spool) noted as a
  possible future subcategory — deliberately not in yet.

## Items — jump drives

- Retreating = diverting power to the jump drive at the cost of thrust, weapons,
  shields, etc. Setups without power redirect instead statically charge the jump
  drive at some fixed rate.
- Jump drives have a bool stat: whether they can charge in combat at all — flavored
  by how *stable* the jump tech is. Archetypes: a stable drive is less risky and can
  charge under fire; a super unstable one can't (but is presumably better elsewhere).
  Keep it a bool question, not a slider.

## Items — weapons / targeting

- Advanced targeting computers let you target specific enemy components.
- Manual fire achieves the same through skill.
- Weapon roles (taxonomy top level): sustained DPS, burst/alpha, point defense,
  utility. Projectile type (gun/launcher/beam) is a variant axis inside each role.
- Utility role contents: EMP/disablers (component knockout without hull damage),
  tractor beams (positioning as a weapon; synergy with hazards/ramming), mines and
  deployables (turrets, decoys — area denial). "Component cracker" piercing weapons
  were considered and not picked — component access stays with targeting, not a
  weapon class.

## Items — hangars / fighters

- Hangars are equippable slot items; fighters launch, fight autonomously, can be lost
  and replaced. Fighter builds should be very viable despite single-ship control.

## Combat arena

- Ramming builds should be viable (and silly) — collision damage is real, which
  implies ram-plating / reinforced-prow style items eventually.
- Terrain as a weapon: asteroids block shots, hazards can be lured into.
- Slow-mo (never pause) while issuing orders — could scale with bridge quality?

## Slots / hardpoints

- Core slot types (weapon, thruster, command, power, shield) + utility slots defined
  per hull; "misc" as a concept goes away.
- Utility slots can be reserved for categories: a carrier hull guarantees hangar mounts.
- Power-hookup gating: each slot has a power rating. Good hookup → anything fits;
  low-power slot → only low-draw categories (hangars, sensors, …). The slot's power
  rating doubles as the compatibility rule, which feeds the compat-notification UI.
- Implies the code's SlotType enum becomes something like slot = (allowed categories /
  power rating, size) eventually.

## Item system meta

- Wide categories → distinct subcategories → variants, each with their own identity.
- Large pool of effect building blocks; commons use 1–2 effects with counterbalancing
  debuffs; rarer items get stronger buffs with fewer strings attached.
- Ratings described in dumb-dumb terms ("bad", "poor", "fine", "good", "super") with the
  actual number for the nerds; each grade tier = a cap per stat category.
- Procedural generation at dev time only: generate → curate → freeze. Different
  generation algorithms per subcategory / shape / archetype.
- Items interact across slots, and the UI must be clear about compatibility problems:
  notifications like "your shields have the redistribute feature but your reactor or
  bridge doesn't support it", or "hangar equipped but no bridge to command fighters".
  How many parts need to be in agreement for a feature to work is undecided — don't
  want to lock builds down too much.
- Some effects are specialized enough to dictate the item's *name* (e.g. command
  capability on a cockpit makes it a "squad leader cockpit"). These name-dictating
  specialized effects are mutually exclusive with each other — gated by rank: e.g.
  command + another specialized effect on a cockpit are mutually exclusive at
  common–epic, but can coexist on a legendary.

Specific item ideas live in [item-ideas.md](item-ideas.md).

## Hulls / cargo

- Hulls have cargo space — a capacity stat. Salvage UI: items in space on one side,
  your hold on the other; transfer to keep/discard. Arena-wide reach, out of combat only.
- Hull archetype roster: fighter/interceptor (few slots, high-grade hookups, glass
  cannon), cruiser/gunship (the balanced tutorial-shaped baseline), carrier (reserved
  hangar mounts, weak direct weapons), freighter (lots of cargo *and* power — not
  inherently a warship, but throw on shields and heavy weapons and you can craft one;
  also the multiple-loadouts toolbox).
- Cargo capacity is a hull stat for sure, but with a reasonable minimum — more flavor
  than gameplay-deciding.
- Items swappable at any time outside combat → a freighter can almost carry multiple
  loadouts and reconfigure per encounter. Cargo becomes a flexibility stat, not a
  loot-volume stat.

## Stations

- Stations are hulls without movement, marked as stations — armed, present in their
  node's arena, and part of the fight if one breaks out there.
- Reusing the hull/slot system for stations means station variety is item variety.
- Attacking a station yourself: presumably possible and presumably summons heat?
- Stations spawn belonging to a faction, drawn from the fighting factions + a
  neutral-traders pool — and you have rep with that faction.
- Rep is shallow by design: persists the whole run (unlike sector-scoped heat), good
  rep (earned via quests/events) slightly improves prices, bad rep past a threshold
  flips the faction to aggression. Nothing deeper.

## Run start

- Mix of options at run start: static orientations (coherent kits) with rolling
  effects for variety — or, for the daring, a draft with no guarantee of item synergy.
- Draft-as-risk is a difficulty/reward lever in itself.
- Initial orientation kits: Gunner (cockpit + sustained-DPS guns), Skirmisher
  (cockpit + dancer thrusters + burst weapons), Commander (bridge + starter fighter
  wing). No computer-based starter — doctrine computers are found/bought mid-run.

## Run mutators

- Economic screws: pricier visas, stingier salvage, higher repair costs.
- Combat modifiers: enemies up a grade tier, denser fights, faster enemy fighters.
- Rule twists: no shield regen in combat, jump drives never charge in combat,
  draft-only starts.
- Reward doublers: loot rarity/quantity multipliers as the greed side of the trade.

## Map / run

- Harbinger-style open sector hopping; chained sectors with exit gates.
- Anti-lollygagging pressure: **jump visas**, bought and collected during play.
  Jumping without one summons the authorities — really overpowered, will likely
  kill you, and they chase you. :)
- The authorities double as an untouchable-tier faction; illegal jumping is the
  player-triggered doom clock.
- Jumping legally is thus an economic decision — visa cost competes with gear.
- Summoned authorities stay on the sector map and know of you: they occupy systems
  (don't jump into theirs), heat is shakeable, and they never follow through the exit
  gate — leaving the sector wipes your record.
- Exit gate is literally a jump gate: it slings you to another system. (Supersedes an
  earlier visa-checkpoint idea for the gate; regular jumps still use visas.)
- Open: the in-universe reason to keep going forward, gate after gate. No answer yet.
- Sector themes: nebula (sensor fog), dense asteroid belts, faction territory,
  derelict fields — theme shapes arenas and encounters.

## Factions

- Start with two factions, but design the faction system (tech identity, rep, spawn
  pools) so additions are cheap.
- Faction #1: the republic — balanced, reliable gear.
- Faction #2: outlaw "unstable overdrive" tech — stronger effects with nasty
  counterbalances (unstable jump drives, overcharged reactors, glass weapons);
  high-variance loot.
- Authorities and neutral traders exist outside the fighting-factions pool.

## Progression

- Hull unlocks on death.
- Hulls can also be bought and scavenged during a run — but you can't swap to one
  mid-run… except maybe at an in-game shipyard, which would be cool.
- Certain legendary / achievement-unlocked items can join the permanent starting loadout.
