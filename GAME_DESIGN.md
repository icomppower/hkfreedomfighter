# GAME_DESIGN.md

## PROJECT
- Name: 香港自由戰士 HK Freedom Fighter ✊
- Repo: https://github.com/icomppower/hkfreedomfighter
- Live: https://hk-freedom-fighter.vercel.app
- GDD (Notion): https://app.notion.com/p/37d1f269eaea8102acb9f335c435cae3
- Stack: Phaser 3.60 (CDN), Vite, Vanilla JS, Vercel
- All sprites: procedurally generated via Canvas API (only file asset: menu music MIDI)
- Base game: 旺角拳王 Mong Kok Brawler — https://github.com/icomppower/HongKongfighter
  This is a pure **reskin**: combat, move list, weapon mechanics, scoring and
  wave layouts are inherited unchanged. Internal config keys (`goon`,
  `dragon`, `chopper`, `keung_*`…) deliberately kept — see handover3.md.

## THEME & TONE
2019 Hong Kong protest movement. Tone: **heroic** — the protesters are the
heroes. UI palette (GDD-locked): background `#0a0a0a` · primary `#FFD700` ·
secondary `#FFFFFF` · danger `#FF3333`.

## CURRENT VERSION
Inherited from base: v1.0–v2.4 (4 stages, bosses, weapons, mobile controls,
block, ki blast, MIDI music — see handover2.md).

This reskin:
- v0.1: repo copied from hk-brawler, .vercel unlinked, plan laid out
- v0.2: full reskin — stages, bosses, enemies, weapons, items, player, UI
- v0.3: 4 new backgrounds, smoke test green (all stages, 4-phase final boss)
- v0.4: first production deploy 🚀, GitHub→Vercel auto-deploy connected
- v0.4.1: mobile music fix 🔊 — iOS audio unlock retried on touchend

## ARCHITECTURE
src/
  scenes/       # Phaser scenes
  entities/     # Player, Enemy, Boss (ES6 classes)
  systems/      # CombatSystem, SpawnerSystem, Sfx, MidiPlayer
  data/         # levels.js, enemies.js, weapons.js, moves.js
  ui/           # HUD widgets, MobileControls
  assets/       # textures.js — all procedural drawing

Scene flow:
  MenuScene
  → StageIntroScene (ink brush cutscene)
  → GameScene (4 waves) → BossIntroScene → [boss fight]
  → [repeat for stages 1-4]
  → GameOverScene / victory

## PLAYER — 龍仔 (Dragon)
Black protest gear, yellow hard hat, goggles, black mask, yellow aura.
States: idle, walk, run, jump, crouch, punch1, punch2, kick,
        uppercut, airAttack, specialA, specialB, hurt, knockdown,
        getup, dead
HP: 100 | SP bars: 3 | Lives: 3
(Internal key: `keung` — palette only change from base.)

## CONTROLS
Keyboard move:    WASD or Arrow keys
Jump:             W / Up / Space (double jump)
Crouch:           S / Down
Punch:            J or Z
Kick:             K or X
Special 龍拳:     J+K or Z+X simultaneously (1 SP)
Special 旋風腿:   Down + J+K (2 SP)
Uppercut:         W+J or Up+Z
Sweep:            S+K or Down+X
Block:            Hold L / 🛡 mobile button
Ki Blast:         F key / Hold J+K 600ms then release (1 SP)
Mouse punch/kick: Left / Right click
Mute music:       M
Mobile:           D-pad bottom-left, action buttons bottom-right

## STAGES
1  金鐘    Admiralty    night highway, tear-gas haze, rain  boss: 777 The Rubber Stamp   HP:60
2  立法會  LegCo        facade, searchlights, graffiti      boss: 比卡超 The Shocker      HP:70
3  元朗    Yuen Long    MTR station interior                boss: 強哥 The Fixer          HP:65
4  理工大學 PolyU Siege  burning barricades, smoke, embers   boss: 維尼熊 The Bear         HP:100

Each stage: 4 waves + boss fight
Wave clear required to advance (arena lock)
Checkpoint saved to localStorage at each stage start

## ENEMY TYPES
goon      白衫友 White Shirt   HP:3   white 0xEEEEEE   slow punch/kick
enforcer  防暴警 Riot Cop      HP:8   dark blue 0x1a2a4a  grab+slam, tanky
knife     便衣  Plainclothes   HP:5   grey 0x555566    fast, ranged poke, dodges
acrobat   速龍  Raptor         HP:4   black 0x111122   jumps, aerial attacks

## BOSS PHASES & DEFEAT QUOTES
777      P1: heavy punches, grab  P2: shoulder bash  P3: ground pound berserk
         roars: 我係好打得! / 依法辦事!!        quote: 「我只係奉命行事！」
比卡超    P1: hook+cannonball      P2: wave attack    P3: summons goons
         roars: 全部拉晒佢! / 速龍小隊, 出動!!   quote: 「唔係我話事！」
強哥      P1: cleaver slash        P2: chili powder   P3: multi-projectile
         roars: 呢度係元朗! / 兄弟們, 上呀!!     quote: 「香港係我地㗎！」
維尼熊    P1: dagger combo  P2: shadow clones (分身)  P3: screen dark  P4: mask off enrage
         roars: 唔准提小熊維尼! / 黑暗就係我嘅武器 / ……朕要親自出手
         quote: 「歷史會還我清白！」

Quote shown as popText 900ms after K.O. (GameScene.onBossDefeated).

## WEAPONS
key      name        damage  range  special
chopper  雨傘 Umbrella  25     55px   high knockback
bottle   汽油彈 Molotov 15     45px   stun 1.5s
rod      旗桿 Flag Pole 20     70px   hits all enemies in arc
chair    路障 Barrier   30     50px   hits 2 enemies

Weapon rules (unchanged from base):
- Random ground spawn per wave (40% chance), always at boss fight start
- Auto-pickup on overlap, one held at a time, breaks on first landed hit
- 50% drop chance when player is hit; stage spawn weights vary per stage

## SCORING (unchanged from base)
Enemy kill:       base points × combo multiplier (x1-x5)
Wave clear:       1000 × stage number
No-damage wave:   500 bonus (doubles wave bonus)
Boss defeat:      2000 × stage number
Continues: 3 max, costs 1000 score each

## ITEMS (on enemy death)
能量棒    Snack Bar     +25 HP          25%
連儂牆便條 Lennon Note   +500 score      15%
生理鹽水  Saline        +1 SP bar       10%
急救包    First Aid Kit full HP restore  8% (rare)
(Internal keys bun/hongbao/drink/claypot kept; sprites redrawn.)

## BOSS DEFEAT REWARDS
- Full HP restore on every boss kill  →  floating: 體力全回復!
- +1 extra life (cap: 9)              →  floating: 獲得1條命!
- Gold coin burst particle effect

## MUSIC 音樂
Source: 願榮光歸香港 Glory to Hong Kong — `public/audio/glory_to_hk.mid`
Engine: Tone.js PolySynth + @tonejs/midi (`src/systems/MidiPlayer.js`)
Controls: M key — mute / unmute mid-game (popup: 🔇/🔊)
Lifecycle: starts on first interaction in MenuScene, loops, stops on game over
Mobile: iOS Safari only grants the audio unlock on touchend/click —
  MidiPlayer + Sfx retry Tone.start()/ctx.resume() on
  touchend/pointerup/mousedown/keydown until the context runs (v0.4.1).
  Note: the iPhone hardware silent switch mutes WebAudio at OS level —
  not fixable in code.

## RESPONSIVE / MOBILE
Canvas: Phaser.Scale.FIT, 960×540 base
Buttons: repositioned on resize event, never hardcoded
Orientation: both supported

## DEPLOYMENT
Auto-deploy: git push to main → Vercel production
Manual: vercel deploy --prod (project hk-freedom-fighter,
        scope team_kT43LPQn6r3AdpyrMkByGvTR)
Output dir: dist (Vite build)

## CLAUDE CODE NOTES
- Read this file + handover3.md at session start for full project context
- This is a reskin: do NOT touch combat, move list, weapon mechanics, scoring
- Internal keys are the BASE game's names; displayed identity lives in
  data files (names/palettes) and textures.js (drawings) — see the
  mapping table in handover3.md
- All sprites drawn at boot via canvas — no external image files
- Boss phases tracked via boss.phase property (1-indexed)
- Arena lock: invisible static bodies left+right of screen
- localStorage keys: hkf_checkpoint, hkf_scores, hkf_initials
