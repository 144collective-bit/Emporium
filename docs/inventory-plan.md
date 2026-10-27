# The inventory, switching weapons and fists on the street

**Draft for the owner (2026-10). Nothing here is built; the open questions
at the end come first.** Everything in it is for the city's game only:
Dorras and XP, never real money, nothing tied to the token or the store.

The brief: give Degen an inventory, let him switch between his weapons,
and give him his fists so he can brawl in the street.

## What's already there

Read before deciding, because two of the three are half built:

- **Switching guns exists, without a screen.** Once geared up at a
  counter (the Armoury's or Trench Arms'), any gun you own can be swapped
  to anywhere: X or Q steps to the next, 1-7 picks by number (in the
  fixed `WEAPON_IDS` order, not the order you own them), the touch Swap
  button over Fire, LB / RB on a gamepad. Each gun keeps its own ammo
  (`stash` in `combat-sim.ts`), a gun not carried yet comes full, the
  counter refills all, and the new gun fires after `SWAP_TIME`. Online the
  `swap` message carries it and the server checks it. Only the gun in
  hand is drawn on him (slung on his back or the revolver on his hip when
  holstered). There is no list to look at: the HUD shows the gun's name
  and the Swap button its short name.
- **Fists exist only in the ring.** `fight-sim.ts` (jab, cross, hook,
  uppercut, front kick, roundhouse, block, parry, dodge, stamina,
  knockdowns, bots) runs a fight inside an `arena` circle; `fight.ts`
  draws it with its own clips over its own movement, hiding the walker.
  The fight plan's street side ("outside the ring the south bank keeps
  guns, with a punch or a kick when unarmed"; "a tap of F throws a jab
  without holstering") was never built, and the goons it was for were
  dropped: **nothing in the city attacks you** (the owner's call), and
  pedestrians, soldiers and other characters are never targets. The
  fight plan's Phase 3 (the Kickboxer and Street styles sold by the
  trainer) is also not built: the Styles tab says "coming soon".
- **Things in his hands.** The look carries one `held` thing (coffee,
  boombox, phone, briefcase; `profile-data.ts`), put away while a gun is
  out. A crate is carried for the business card's Load / Unload
  (`moments.ts` `crateMark()`, `walk.carry()`). Clothes are bought and
  worn at Drop 001; the premium wardrobe is `wardrobe` in the save.
- **The save.** `tycoon.ts` (v10) holds the guns you own and their mods,
  the cars, karts, wardrobe and `fight` (style, styles owned, the
  record). The gun you last carried, your lifetime score and finish are
  `degen-city-combat-v1` (or the server profile online).

So "switch weapons" is mostly a screen and a set of decisions; "fists on
the street" is a new piece of game; the inventory is the thing that ties
them together.

## The proposed shape (assumptions, to be confirmed)

```
inventory.ts     the rules, DOM-free, tested in tests/inventory.test.ts:
                 what Degen carries, in what slots, cleaned from the save
inventory-ui.ts  the wheel / bag on screen; markup [data-inventory] in
                 CityMap.astro, styles src/styles/inventory.css
brawl.ts         fists on the street: the fight sim's moves out of the
                 ring, wired to walk mode (the view; the rules stay in
                 fight-sim.ts)
```

- **The inventory** (`inventory.ts`): a list of what he carries, each
  entry a kind and an id: `fists` (always there, first), his guns (from
  `tycoon.ts`, with their mods), his held thing, and later consumables if
  the owner wants any. An order the player can change (drag on the wheel,
  or move up / down), a `hotbar` mapping of 1-7 onto it, and `cleanInventory()`
  so a save from before it carries on (its guns in catalog order, fists
  first). The save gains `inventory` { order, hotbar } (v11,
  `cleanSave()` migrates).
- **The wheel** (`inventory-ui.ts`): hold Tab (or I) to open a radial
  wheel over the walk HUD, release on a slot to pick it; a tap of Tab
  opens it as a card for the mouse; on touch, hold the Swap button (which
  becomes the inventory's button); on a gamepad, hold Y (the d-pad still
  steps). Time doesn't slow (nothing attacks you, so there's nothing to
  slow for). The picked slot goes through `combat.swap()` for a gun,
  `combat.toggleHolster()` + the brawl for fists, `walk.setLook()`'s held
  thing for a held item. The card lists each entry with its ammo, mods
  and a line on where more come from (the Armoury), and the wheel folds
  to fit 320px. It's closable like every card (×, Esc, tap outside), and
  joins `chrome` in `index.ts` so pins fold under it.
- **Fists** are a slot in the inventory, not a gun in `WEAPONS`: picking
  them holsters the gun and raises the guard; picking a gun lowers it.
  While fists are picked, click punches and the moves come from
  `fight-sim.ts` run in "street" setup (no arena, no bout, no bot
  opponent, stamina on), so the chains, block and dodge are the same
  moves the ring teaches and a style bought at the trainer (fight plan
  Phase 3) shows on the street too. The clips are the ring's, played on
  the upper body over the animator's walk for punches (as the emotes
  are, `upperW`) and standing for kicks and the dodge.
- **Targets on the street** are the owner's call (question 9). The
  default assumed here: the dummies and the drones take punches and
  kicks (a hit on a dummy within reach counts like a shot; melee range
  only), the crowd is never hit (a swing near a person makes them step
  aside, the existing `bump`, and that's all), and a street fight against
  a person is only ever with someone who agreed to it: a sparring
  partner at a fixed spot ("Spar" prompt, a bot in the crew's look),
  or, online, another player on the south bank (the multiplayer plan's
  PvP rule). No health north of the river.

## Phases (each with the owner's sign-off)

1. **The inventory and the wheel.** `inventory.ts` and its tests, the
   save's `inventory` (v11), `inventory-ui.ts` with the wheel and the
   card, keyboard / touch / gamepad ways in, the Swap button's new role,
   the HUD's gun name reading from it, the fists slot present but doing
   what G does today (holster) until Phase 2. Checked at 320, 375, 768,
   1024 and 1440 wide, upright and on their side.
2. **Fists on the street.** `brawl.ts`: the fight sim's moves out of the
   ring on the walker, the upper-body punch over the walk, kicks and the
   dodge standing, the guard idle, the controls (question 13), the
   dummies and drones as melee targets, the crowd stepping aside, the
   sounds. Reviewed in the lab (`?anim`, a Brawl program) and
   `tests/human.test.ts` rows for the street clips.
3. **Someone to fight.** Sparring partners at fixed spots (which spots:
   question 16), their bots from `FIGHT_BOTS`, the street fight's
   start, end and prize, the fight record counting them, missions and
   badges (question 17). Online: the `in` message's fight bits and a
   `guard` flag so other players see the fists up; PvP on the south
   bank when the owner resumes multiplayer.
4. **Polish.** Both guns shown on him at once (question 7), ammo as a
   line (question 6), consumables if any, phones' layout, the far form.

## Open questions (the owner's; the plan waits on them)

The inventory:

1. **What goes in it?** Guns and fists only? The held things (coffee,
   boombox, phone, briefcase)? The crate he's carrying for a delivery?
   Consumables that don't exist yet (an energy drink that refills
   stamina, say)? Clothes stay at Drop 001 and the character screen?
2. **Carry everything, or a loadout?** Today he carries every gun he owns
   at once. A loadout (fists + two guns, say, picked at the Armoury, the
   rest in a locker there) makes the wheel small and the choice matter,
   but it's a change to how gearing up works and to the server's checks.
3. **What does it look like?** A radial wheel held open (Tab), a hotbar
   strip always in the walk HUD, a Bag tab beside Controls / Profile /
   Online / Emote, or a wheel plus a card? Should it show in the City
   view too (a Bag on the business card) or walk mode only?
4. **The keys.** Tab or I to open; keep 1-7, but in his own order rather
   than the catalog's? The mouse wheel to step through (it's the zoom
   in the City view, free while walking)?
5. **Phones.** Hold the Swap button to open the wheel (then a tap still
   steps), or a separate Bag button? The right-hand buttons are already
   tight at 320px upright.
6. **Ammo.** Keep it free (every gun comes full, the counter refills
   all), or sell ammo at the Armoury for Dorras and show it as a line
   in the bag? And must he still gear up at a counter first, or can the
   bag draw any owned gun anywhere (today, no counter, no gun)?
7. **On his body.** Show the primary on his back and a second gun on his
   hip at the same time, or keep one gun shown as today?
8. **Online.** A loadout and the fists need a protocol bump (`PROTOCOL`),
   tested on workers.dev only, as the rules say. Fine to plan on that?

Fists on the street:

9. **Who can he hit?** The big one. (a) Nobody: shadow-boxing only, the
   moves play and nothing is hit. (b) The dummies and drones, as melee
   targets. (c) Sparring partners who agreed: bots in the crew's look at
   fixed spots (a "Spar" prompt), fighting back there only. (d) Other
   players, online, on the south bank only. Any mix? The crowd is
   assumed off limits whatever the answer (the owner's rule: never a
   target). Should a swing near a person make them flinch and step
   aside, or should they ignore it?
10. **Do street punches score?** A dummy knocked over by a punch counts
    as a takedown (XP, missions, counters) like a shot, or fists are for
    fun only?
11. **Health.** None for Degen on the street (the fight plan's rule:
    health only in the ring and the PvP zone), or does a street spar
    use health like a bout?
12. **How fists are chosen.** A slot you pick on the wheel (holsters the
    gun), or automatic whenever the gun is holstered (G = fists up), or
    both? And the fight plan's "F taps a jab with the gun out": keep
    that idea or drop it?
13. **Controls unarmed.** The ring's are click punch, right-click kick,
    Shift block, Space dodge. On the street Shift is sprint and Space is
    jump. Options: block on right-click held and kick on G; or Shift
    blocks only while standing still and sprints on the move; or the
    ring's layout exactly and no sprint / jump while fists are up. On
    touch, Punch / Kick / Block take Fire / Aim / Reload's places while
    fists are picked. Which?
14. **Styles.** Build the fight plan's Phase 3 (Kickboxer and Street
    sold by the trainer) alongside this, so a bought style shows on the
    street, or keep the Brawler only for now?
15. **The animation.** Street punches over the motion-captured walk on
    the upper body only (a jab while walking), kicks and dodges standing
    still, the guard idle keyed: is that what "brawl" looks like, or
    should fists up switch him fully onto the ring's clips (no walk
    cycle, the fighter's shuffle)? The ring's clips were keyed for a
    fighter in a guard; a casual street jab may want its own.
16. **Where.** Fists up anywhere in the city, or only south of the river
    (the PvP zone) with the north a safe hangout? If sparring partners
    come (9c), where do they stand: outside the Fight Club, The Block's
    court, the Night Market, Trench Avenue?
17. **Rewards.** Street spars pay Dorras and XP like the gym's, XP only,
    or nothing? New missions and badges (a street chain, a spar on the
    boardwalk)?
18. **Other players.** Should they see the guard up and the swings
    (a flag in the `in` message, the clips on `remote.ts`), even before
    PvP lands?
19. **Order.** Inventory first (Phase 1), fists after, as above? Or
    fists first because that's the fun, with the wheel to follow?
20. **The look of the wheel.** Degen's style (ink outlines, flat
    shading, PulseChain neon, gradient borders, white text), slots as
    the gun store's art (`ART` in gunshop.ts) plus a fists card: any
    reference the owner has in mind (a GTA-style wheel, a Fortnite-style
    hotbar)?

## Not in scope

Weapons in the ring, grabs and throws, blood or gore (cartoon stars
only), anything typed by players, anything for real money, and any
attack on the crowd.
