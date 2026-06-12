# Handover 3 — 香港自由戰士 HK Freedom Fighter ✊

**Date:** 2026-06-11
**Repo:** https://github.com/icomppower/hkfreedomfighter
**Live:** https://hk-freedom-fighter.vercel.app
**Base game:** 旺角拳王 Mong Kok Brawler — https://github.com/icomppower/HongKongfighter
**Reskin GDD:** https://app.notion.com/p/37d1f269eaea8102acb9f335c435cae3
**Stack:** Phaser 3.60 (CDN) · Vite · Vanilla JS · Vercel (auto-deploy on push to `main`)

Continues from `handover2.md` (base-game history). This document covers the
reskin session: project creation, full retheme, first deploy, mobile audio fix.

This is a pure **reskin** of the base game per the GDD. Combat, move list,
weapon mechanics, scoring, wave layouts, boss AI and HP values are all
**unchanged** — internal config keys (`goon`, `enforcer`, `dragon`, `pirate`,
`queen`, `shadow`, `chopper`, `bottle`, `bun`, `keung_*` texture keys, etc.)
were deliberately kept so the diff against the base stays mechanical.

## What was done this session

### Commit `242ebe9` — "feat: HK Freedom Fighter — 2019 HK protest reskin of Mong Kok Brawler"

- Copied `/Users/johnny/claude/hk-brawler` → `/Users/johnny/claude/hkfreedomfighter`
  (rsync, excluding node_modules / .git / dist), removed the copied `.vercel/`
  so deploys couldn't hit the base game's Vercel project.
- Applied the full retheme (file-by-file list below).
- Verified with build + headless smoke test: zone `admiralty`, all 4 boss
  phases, victory flow, zero console errors.
- Pushed to new repo `icomppower/hkfreedomfighter`.

### Commit `65a6dd1` — "fix: music not playing on mobile — retry audio unlock on touchend"

**Symptom:** music fine on desktop, silent on phones.
**Cause:** iOS Safari only grants the WebAudio unlock on **touchend/click**,
not touchstart — and Phaser's `pointerdown` is backed by touchstart. So
`Tone.start()` failed silently, and `MidiPlayer._started = true` blocked any
retry → permanent silence on mobile.
**Fix:**
- `src/systems/MidiPlayer.js` — `play()` now awaits `_unlock()`, which
  retries `Tone.start()` on `touchend`/`pointerup`/`mousedown`/`keydown`
  until `Tone.getContext().state === 'running'`, then removes the listeners.
- `src/systems/Sfx.js` — `ensure()` hardened the same way (`ctx.resume()`
  retried across gestures, one-time hook).

**Caveat:** the iPhone hardware **silent switch** mutes WebAudio at the OS
level — that cannot be fixed in code.

### Deploy

- `vercel link --yes --project hk-freedom-fighter --scope team_kT43LPQn6r3AdpyrMkByGvTR`
  (also auto-connected the GitHub repo → push-to-main auto-deploys).
- `vercel deploy --prod` → aliased to **https://hk-freedom-fighter.vercel.app**.
- Notion GDD version log updated through v0.4.1 (verified by re-fetch —
  Notion's auto-linking of bare filenames can silently break
  `old_str` matches in update-page; always re-fetch to confirm).

## Theme mapping (internal key → displayed identity)

| Internal key | Base game | HK Freedom Fighter |
|---|---|---|
| `keung` (player) | 阿強 Ah Keung | **龍仔 Dragon** — black gear, yellow hard hat, goggles, mask |
| `goon` | 青仔 | 白衫友 White Shirt (white tint) |
| `enforcer` | 大佬 | 防暴警 Riot Cop (dark blue) |
| `knife` | 刀手 | 便衣 Plainclothes (grey) |
| `acrobat` | 飛賊 | 速龍 Raptor (black) |
| `dragon` (boss 1) | 龍叔 Uncle Dragon | **777 · The Rubber Stamp** (HP 60) |
| `pirate` (boss 2) | 海盜王 Pirate King | **比卡超 · The Shocker** (HP 70) |
| `queen` (boss 3) | 夜市女王 Market Queen | **強哥 · The Fixer** (HP 65) |
| `shadow` (boss 4) | 影 The Shadow | **維尼熊 · The Bear** (HP 100) |
| `clone` | 影分身 | 分身 |
| `chopper` | 西瓜刀 | 雨傘 Umbrella (yellow) |
| `bottle` | 玻璃樽 | 汽油彈 Molotov |
| `rod` | 鐵枝 | 旗桿 Flag Pole |
| `chair` | 摺椅 | 路障 Barrier |
| `bun` | 叉燒包 | 能量棒 Snack Bar |
| `hongbao` | 利是 | 連儂牆便條 Lennon Note |
| `drink` | 維他奶 | 生理鹽水 Saline |
| `claypot` | 煲仔飯 | 急救包 First Aid Kit |

## Stages (`src/data/levels.js` + `src/assets/textures.js`)

| # | Stage | bg key | Background |
|---|---|---|---|
| 1 | 金鐘 Admiralty | `admiralty` | Night highway, gantry sign, barricades, yellow umbrellas, tear-gas haze (rain on) |
| 2 | 立法會 LegCo | `legco` | Government facade, searchlights, banners, graffiti, shattered glass |
| 3 | 元朗 Yuen Long | `yuenlong` | MTR station interior, fluorescent lights, platform pillars |
| 4 | 理工大學 PolyU Siege | `polyu` | Burning barricades, smoke columns, brick arches, embers |

Wave layouts/trigger Xs are identical to the base game; only the four
background generator functions were rewritten (texture keys
`<bg>_far/_mid/_near/_ground`, referenced from MenuScene + GameOverScene too).

## What changed in this reskin (file by file)

- `src/data/levels.js` — stage names + bg keys (waves untouched)
- `src/data/enemies.js` — all palettes, display names, boss `roars`,
  new `quote` field (defeat quotes per GDD), item labels
- `src/data/weapons.js` — zh/en display names only (stats untouched)
- `src/assets/textures.js` — player mask in `drawFighter` (`pal.mask`),
  item + weapon sprites redrawn, 4 new background generators
- `src/scenes/GameScene.js` — boss defeat quote popText in `onBossDefeated`
  (only mechanical addition; purely cosmetic)
- `src/scenes/MenuScene.js` — title 香港自由戰士 / HK FREEDOM FIGHTER,
  yellow `#FFD700` palette, admiralty backdrop
- `src/scenes/HUDScene.js` — 龍仔 DRAGON label, yellow accents
- `src/scenes/GameOverScene.js` — "VICTORY — GLORY TO HONG KONG", backdrop
- `src/systems/MidiPlayer.js` + `src/systems/Sfx.js` — mobile audio unlock (v0.4.1)
- `src/entities/*.js` — header comments + summon popTexts re-themed
- `index.html`, `package.json`, `README.md`, `GAME_DESIGN.md` — titles/descriptions

## UI palette (GDD-locked)

Background `#0a0a0a` · primary `#FFD700` · secondary `#FFFFFF` ·
danger `#FF3333` · panels pulse yellow.

## Music

Unchanged track: 願榮光歸香港 Glory to Hong Kong — `public/audio/glory_to_hk.mid`,
played by `src/systems/MidiPlayer.js` (Tone.js PolySynth + @tonejs/midi).

## Dev commands

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # → dist/
npm run preview -- --port 4173 &   # use --strictPort to avoid a stale-server trap
node smoke-test.mjs  # headless screenshot tests (requires Chrome; hits :4173)
```

Deploy is automatic: `git push origin main` → Vercel production.

## Known gaps / next tasks

- Mobile music fix is deployed but verified headless only — worth a quick
  hands-on check on a real iPhone (remember the silent switch caveat).
- Inherited from base (see `handover2.md`): iOS Safari context menu,
  mouse-facing, mouse special, weapon balance, boss difficulty tuning.
