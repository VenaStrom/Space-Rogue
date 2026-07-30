# Idea scratchpad

Spitballed ideas captured so they can be revisited later. Nothing here is a commitment —
the distilled decisions live in the README; this is the raw material. Add freely, prune never.

## Items — command slot

- Taxonomy example: command → [cockpit, bridge, maybe computer].
- Cockpit variants: missile cockpit, gun cockpit, speed cockpit.
- Bridge variants: accuracy bridge, a bridge that lets you plot many nav points.
- Cockpit = direct piloting, bridge = strategic orders; flavors of each allow/disallow
  manual weapon control in exchange for buffs.
- "Computer" as a third command subcategory is a maybe — role unclear, revisit.
- Bridges almost always allow fighter command, with varying efficacy; cockpits
  generally don't.

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

## Items — weapons / targeting

- Advanced targeting computers let you target specific enemy components.
- Manual fire achieves the same through skill.

## Items — hangars / fighters

- Hangars are equippable slot items; fighters launch, fight autonomously, can be lost
  and replaced. Fighter builds should be very viable despite single-ship control.

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

## Map / run

- Harbinger-style open sector hopping; chained sectors with exit gates.
- Fuel/supply drain as the anti-lollygagging pressure — exact mechanism undecided.

## Progression

- Hull unlocks on death.
- Hulls can also be bought and scavenged during a run — but you can't swap to one
  mid-run… except maybe at an in-game shipyard, which would be cool.
- Certain legendary / achievement-unlocked items can join the permanent starting loadout.
