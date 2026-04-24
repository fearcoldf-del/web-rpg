const BASE_URL = 'http://localhost:3000/api';

// Išsaugo hero duomenis į serverį
async function saveHero(hero) {
    try {
        const res = await fetch(`${BASE_URL}/hero`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                name:      hero.name,
                heroClass: hero.heroClass,
                level:     hero.level,
                xp:        hero.xp,
                gold:      hero.gold,
                hp:        hero.hp,
                maxHp:     hero.maxHp,
                atk:       hero.atk,
                def:       hero.def,
            }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        console.log('[api] Hero išsaugotas:', hero.name);
    } catch (e) {
        console.error('[api] saveHero klaida:', e.message);
    }
}

// Įkelia hero duomenis iš serverio pagal vardą
async function loadHero(name) {
    try {
        const res = await fetch(`${BASE_URL}/hero/${encodeURIComponent(name)}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('[api] Hero įkeltas:', data.name);
        return data;
    } catch (e) {
        console.error('[api] loadHero klaida:', e.message);
        return null;
    }
}
