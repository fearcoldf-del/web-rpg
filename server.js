const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = 3000;

// Laikinas atminties saugojimas (vietoj DB)
const heroes = {};
const guilds = {}; // { [id]: { id, name, description, leaderName, members: [] } }
let guildCounter = 1;

// PvP duomenys
const pvpMatches = {}; // { [id]: { id, challengerName, targetName, status, result? } }
const pvpResults = {}; // { [heroName]: [result, ...] } - paskutiniai 5 kovų
let pvpCounter   = 1;

app.use(cors());
app.use(express.json());

// GET /api/health - serverio būsenos patikrinimas
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// GET /api/hero/:name - grąžina hero duomenis pagal vardą
app.get('/api/hero/:name', (req, res) => {
    const hero = heroes[req.params.name.toLowerCase()];
    if (!hero) {
        return res.status(404).json({ error: 'Hero nerastas' });
    }
    res.json(hero);
});

// POST /api/hero - išsaugo hero duomenis
app.post('/api/hero', (req, res) => {
    const { name, heroClass, level, xp, gold, hp, maxHp, atk, def, guildId } = req.body;

    if (!name || !heroClass) {
        return res.status(400).json({ error: 'Trūksta name arba heroClass' });
    }

    heroes[name.toLowerCase()] = { name, heroClass, level, xp, gold, hp, maxHp, atk, def, guildId: guildId ?? null };
    res.status(201).json({ message: 'Hero išsaugotas', hero: heroes[name.toLowerCase()] });
});

// GET /api/heroes - visi herojai (PvP žaidėjų sąrašui)
app.get('/api/heroes', (req, res) => {
    res.json(Object.values(heroes));
});

// GET /api/guilds - visos gildijos
app.get('/api/guilds', (req, res) => {
    res.json(Object.values(guilds));
});

// POST /api/guilds - sukuria naują gildiją
app.post('/api/guilds', (req, res) => {
    const { name, description, leaderName } = req.body;
    if (!name || !leaderName) {
        return res.status(400).json({ error: 'Trūksta name arba leaderName' });
    }

    const id = String(guildCounter++);
    guilds[id] = { id, name, description: description || '', leaderName, members: [leaderName] };
    res.status(201).json(guilds[id]);
});

// GET /api/guilds/:id - vienos gildijos info su nariais
app.get('/api/guilds/:id', (req, res) => {
    const guild = guilds[req.params.id];
    if (!guild) return res.status(404).json({ error: 'Gildija nerasta' });
    res.json(guild);
});

// POST /api/guilds/:id/join - žaidėjas prisijungia prie gildijos
app.post('/api/guilds/:id/join', (req, res) => {
    const guild = guilds[req.params.id];
    if (!guild) return res.status(404).json({ error: 'Gildija nerasta' });

    const { heroName } = req.body;
    if (!heroName) return res.status(400).json({ error: 'Trūksta heroName' });

    if (!guild.members.includes(heroName)) {
        guild.members.push(heroName);
    }
    res.json(guild);
});

// GET /api/leaderboard - top 10 žaidėjų pagal lygį, tada gold
app.get('/api/leaderboard', (req, res) => {
    const sorted = Object.values(heroes)
        .sort((a, b) => b.level - a.level || b.gold - a.gold)
        .slice(0, 10);
    res.json(sorted);
});

// ── PvP sistema ──

// Simuliuoja kovą tarp dviejų heroų pagal jų stats
function simulatePvP(a, b) {
    let aHp = a.maxHp;
    let bHp = b.maxHp;
    const log = [];
    let turn  = 0;

    while (aHp > 0 && bHp > 0 && turn < 30) {
        turn++;
        // a puola
        const aDmg = Math.max(1, a.atk - b.def + Math.floor(Math.random() * 6) - 2);
        bHp -= aDmg;
        log.push(`Turas ${turn}: ${a.name} smogė ${b.name} už ${aDmg} žalos`);
        if (bHp <= 0) break;
        // b puola
        const bDmg = Math.max(1, b.atk - a.def + Math.floor(Math.random() * 6) - 2);
        aHp -= bDmg;
        log.push(`Turas ${turn}: ${b.name} smogė ${a.name} už ${bDmg} žalos`);
    }

    const winner     = aHp > 0 ? a : b;
    const loser      = aHp > 0 ? b : a;
    const xpGained   = 50 + loser.level * 15;
    const goldGained = 20 + loser.level * 8;

    return { winner: winner.name, loser: loser.name, log, xpGained, goldGained };
}

// Išsaugo rezultatą abiem žaidėjams (paskutiniai 5)
function savePvPResult(challengerName, targetName, result) {
    const entry = { ...result, timestamp: Date.now() };
    [challengerName, targetName].forEach(name => {
        if (!pvpResults[name]) pvpResults[name] = [];
        pvpResults[name].unshift(entry);
        pvpResults[name] = pvpResults[name].slice(0, 5);
    });
}

// POST /api/pvp/challenge - iššūkis kitam žaidėjui
app.post('/api/pvp/challenge', (req, res) => {
    const { challengerName, targetName } = req.body;
    if (!challengerName || !targetName) {
        return res.status(400).json({ error: 'Trūksta challengerName arba targetName' });
    }
    if (!heroes[challengerName.toLowerCase()]) {
        return res.status(404).json({ error: 'Iššūkėjas nerastas' });
    }
    if (!heroes[targetName.toLowerCase()]) {
        return res.status(404).json({ error: 'Taikinys nerastas' });
    }
    if (challengerName.toLowerCase() === targetName.toLowerCase()) {
        return res.status(400).json({ error: 'Negalima iššūkti save' });
    }

    const id = String(pvpCounter++);
    pvpMatches[id] = {
        id,
        challengerName,
        targetName,
        status:    'pending',
        createdAt: Date.now(),
    };
    res.status(201).json(pvpMatches[id]);
});

// GET /api/pvp/challenges/:heroName - gauna gautus iššūkius
app.get('/api/pvp/challenges/:heroName', (req, res) => {
    const name    = req.params.heroName.toLowerCase();
    const pending = Object.values(pvpMatches).filter(
        m => m.targetName.toLowerCase() === name && m.status === 'pending'
    );
    res.json(pending);
});

// POST /api/pvp/accept/:matchId - priima iššūkį ir simuliuoja kovą
app.post('/api/pvp/accept/:matchId', (req, res) => {
    const match = pvpMatches[req.params.matchId];
    if (!match)                  return res.status(404).json({ error: 'Match nerastas' });
    if (match.status !== 'pending') return res.status(400).json({ error: 'Match jau baigtas' });

    const challenger = heroes[match.challengerName.toLowerCase()];
    const target     = heroes[match.targetName.toLowerCase()];
    if (!challenger || !target)  return res.status(404).json({ error: 'Herojus nerastas' });

    const result  = simulatePvP(challenger, target);
    match.status  = 'accepted';
    match.result  = result;

    savePvPResult(match.challengerName, match.targetName, result);

    res.json(result);
});

// POST /api/pvp/decline/:matchId - atmeta iššūkį
app.post('/api/pvp/decline/:matchId', (req, res) => {
    const match = pvpMatches[req.params.matchId];
    if (!match) return res.status(404).json({ error: 'Match nerastas' });
    match.status = 'declined';
    res.json({ message: 'Iššūkis atmestas' });
});

// GET /api/pvp/results/:heroName - paskutiniai 5 PvP rezultatai
app.get('/api/pvp/results/:heroName', (req, res) => {
    const results = pvpResults[req.params.heroName] ?? [];
    res.json(results);
});

app.listen(PORT, () => {
    console.log(`Web RPG serveris veikia: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});
