const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = 3000;

// Laikinas atminties saugojimas (vietoj DB)
const heroes = {};

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
    const { name, heroClass, level, xp, gold, hp, maxHp, atk, def } = req.body;

    if (!name || !heroClass) {
        return res.status(400).json({ error: 'Trūksta name arba heroClass' });
    }

    heroes[name.toLowerCase()] = { name, heroClass, level, xp, gold, hp, maxHp, atk, def };
    res.status(201).json({ message: 'Hero išsaugotas', hero: heroes[name.toLowerCase()] });
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
