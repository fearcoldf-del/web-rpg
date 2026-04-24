# Web RPG - Fazė 1 Dizaino Dokumentas

## Žaidimo aprašymas
Modernizuotas browser RPG panašus į Tanoth. Idle/auto-battle stilius
su animuotomis kovomis, AI botais ir virtualios valiutos sistema.

## Techninis stackas
- Frontend: Vanilla JS + HTML/CSS + Canvas API
- Backend: Node.js + Express + Socket.io
- DB: MySQL
- Payments: LemonSqueezy

## Fazė 1 - Core loop (tik šitai darome dabar)
1. Žaidėjas sukuria hero (vardas, klasė)
2. Hero turi stats: HP, ATK, DEF, level, XP
3. Žaidėjas gali pradėti kovą su NPC botu
4. Kova vyksta automatiškai - animuota Canvas arenoje
5. Po kovos žaidėjas gauna XP ir gold
6. Surinkus XP - level up ir stats auga

## Kas NĖRA fazėje 1
- Gildijos, PvP, dungeon, prekyba
- Mokėjimai ir realios monetos
- Multiplayer

## Failų struktūra
web-rpg/
├── index.html
├── css/style.css
├── js/
│   ├── main.js
│   ├── hero.js
│   ├── battle.js
│   └── ui.js
└── DESIGN.md
