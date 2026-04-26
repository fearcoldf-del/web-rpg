const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = 3000;

// Laikinas atminties saugojimas (vietoj DB)
const heroes = {};
const guilds = {}; // { [id]: { id, name, description, leaderName, members: [] } }
let guildCounter = 1;

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

app.listen(PORT, () => {
    console.log(`Web RPG serveris veikia: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});
