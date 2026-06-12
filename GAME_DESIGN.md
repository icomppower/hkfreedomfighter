# GAME_DESIGN.md

## PROJECT
- Name: Hong Kong Fighter 香港格鬥
- Repo: https://github.com/icomppower/HongKongfighter
- Live: https://hk-brawler-sharkgundams-projects.vercel.app
- Stack: Phaser 3.60 (CDN), Vite, Vanilla JS, Vercel
- All sprites: procedurally generated via Canvas API (no external assets)

## CURRENT VERSION
- v1.0: single stage, basic controls, enemy spawns, combo system
- v2.0: 4 HK stages, bosses, weapons, ink brush cutscenes, mobile controls
- v2.1: mobile menu fix, HP refill items, boss defeat rewards
- v2.2: menu controls display fix, ki blast range attack ✅, mobile canvas size fix
- v2.3: block system ✅, menu move list ✅
- v2.4: MIDI music ✅, M key mute toggle ✅, move audit ✅

## ARCHITECTURE
src/
  scenes/       # Phaser scenes
  entities/     # Player, Enemy, Boss (ES6 classes)
  systems/      # CombatSystem, SpawnerSystem, WeaponSystem
  data/         # stages.js, enemies.js, weapons.js
  ui/           # HUD, MobileControls, ComboDisplay

Scene flow:
  MenuScene
  → StageIntroScene (ink brush cutscene)
  → Stage1Scene → BossIntroScene → [boss fight]
  → StageIntroScene
  → Stage2Scene → BossIntroScene → [boss fight]
  → StageIntroScene
  → Stage3Scene → BossIntroScene → [boss fight]
  → StageIntroScene
  → Stage4Scene → BossIntroScene → [boss fight]
  → VictoryScene

## PLAYER — 阿強 (Ah Keung)
States: idle, walk, run, jump, crouch, punch1, punch2, kick,
        uppercut, airAttack, specialA, specialB, hurt, knockdown,
        getup, dead
HP: 100 | SP bars: 3 | Lives: 3

## CONTROLS
Keyboard move:    WASD or Arrow keys
Jump:             W / Up / Space
Crouch:           S / Down
Punch:            J or Z
Kick:             K or X
Special:          J+K or Z+X simultaneously
Uppercut:         W+J or Up+Z
Sweep:            S+K or Down+X
Mouse punch:      Left click
Mouse kick:       Right click
Mouse special:    Left + Right click within 100ms
Mouse facing:     Character always faces cursor
Mobile:           D-pad bottom-left, action buttons bottom-right
Ki Blast:         F key / Hold J+K 600ms then release
Ki Blast cost:    1 SP bar, 500ms cooldown

## STAGES
1  九龍城寨  Kowloon Walled City    dark/cramped      boss: 龍叔 Uncle Dragon      HP:60
2  維多利亞港 Victoria Harbour      open/dramatic     boss: 海盜王 Pirate King      HP:70
3  旺角夜市  Mong Kok Night Market  chaotic/colorful  boss: 夜市女王 Market Queen   HP:65
4  赤鱲角機場 Chek Lap Kok Airport  clean/modern      boss: 影 The Shadow           HP:100

Each stage: 4 waves + boss fight
Wave clear required to advance (arena lock)
Checkpoint saved to localStorage at each stage start

## ENEMY TYPES
goon      青仔   HP:3   slow punch/kick
enforcer  大佬   HP:8   grab+slam, tanky
knife     刀手   HP:5   fast, ranged poke, dodges
acrobat   飛賊   HP:4   jumps, aerial attacks

## BOSS PHASES
龍叔      P1: heavy punches, grab  P2: shoulder bash  P3: ground pound berserk
海盜王    P1: hook+cannonball      P2: wave attack    P3: summons goons
夜市女王  P1: cleaver slash        P2: chili powder   P3: multi-projectile
影        P1: dagger combo         P2: shadow clones  P3: screen dark  P4: mask off enrage

## WEAPONS
name     zh    damage  range  special
chopper  西瓜刀  25     55px   high knockback
bottle   玻璃樽  15     45px   stun 1.5s
rod      鐵枝   20     70px   hits all enemies in arc
chair    摺椅   30     50px   hits 2 enemies, WWE Easter egg on KO

Weapon rules:
- Random ground spawn per wave (40% chance), always at boss fight start
- Player auto-pickup on overlap
- One weapon held at a time
- Breaks on first successful hit
- 50% drop chance when player is hit
- Stage spawn weights vary per stage

## KI BLAST 氣功彈
damage: 20 | speed: 400px/sec | range: full screen
visual: cyan energy orb with pulsing glow trail (proj_kiblast)
cost: 1 SP bar per blast | cooldown: 500ms
input: F key (instant) or hold Z+X 600ms then release
spawn: player x±32, y-52 (outstretched hand height)
status: ✅ implemented v2.2

## SCORING
Enemy kill:       base points × combo multiplier (x1-x5)
Wave clear:       1000 × stage number
No-damage wave:   500 bonus
Boss defeat:      2000 × stage number
Red envelope item: +500
Continues: 3 max, costs 1000 score each

## ITEMS (on enemy death)
叉燒包  roast pork bun   +25 HP         25%
利是    red envelope     +500 score     15%
維他奶  vitasoy          +1 SP bar      10%
煲仔飯  claypot rice     full HP restore 8% (rare)

## BOSS DEFEAT REWARDS
- Full HP restore on every boss kill  →  floating: 體力全回復!
- +1 extra life (cap: 9)              →  floating: 獲得1條命!
- Gold coin burst particle effect

## STAGE INTRO CUTSCENE
- Black screen
- Ink brush stroke sweeps across (300ms tween scaleX 0→1)
- Chinese stage name appears stroke by stroke
- English subtitle fades in
- Hold 2s → fade to stage
- Font: bold CJK system font, large (48px+)

## BOSS INTRO
- Letterbox bars slide in (top + bottom 80px)
- Boss name card slides from right
- Red camera flash
- 1s pause → boss fight begins

## MUSIC 音樂
Source: 願榮光歸香港 Glory to Hong Kong (programmatic, no external file)
Engine: Tone.js PolySynth — triangle-wave oscillator, 72 BPM, Bb major, 32-beat loop
Controls: M key — mute / unmute mid-game (popup: 🔇/🔊)
Lifecycle: starts on first interaction in MenuScene (autoplay policy), loops through all zones, stops on game over
Status: ✅ implemented v2.4

## BLOCK SYSTEM 擋
input: Hold L key / 🛡 mobile button
effect: blocks all damage, 格! popup, small pushback, alpha flash
movement: 50% speed while blocking, cannot attack
status: ✅ implemented v2.3

## RESPONSIVE / MOBILE
Canvas: Phaser.Scale.FIT, 680×340 base
Tested: iPhone SE, iPhone 14, iPad portrait/landscape
Buttons: repositioned on resize event, never hardcoded
CSS: html/body 100% height, overflow hidden, flex center
Orientation: both supported, soft landscape hint in portrait
Meta: viewport no-scale, apple-mobile-web-app-capable

## DEPLOYMENT
Auto-deploy: git push to main → Vercel production
Manual: vercel --prod --team team_kT43LPQn6r3AdpyrMkByGvTR
Output dir: dist (Vite build)
vercel.json: buildCommand npm run build, outputDirectory dist

## CLAUDE CODE NOTES
- Read this file at session start for full project context
- All sprites drawn in BootScene via canvas — no external files
- Weapon system appended to CombatSystem, not separate
- Boss phases tracked via boss.phase property (1-indexed)
- Arena lock: invisible static bodies left+right of screen
- localStorage keys: hkf_checkpoint, hkf_scores, hkf_initials
