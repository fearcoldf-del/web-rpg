const PVP_URL  = 'http://localhost:3000/api/pvp';
const BASE_API = 'http://localhost:3000/api';

// Gauna laukiančius iššūkius hero'ui
async function fetchChallenges(heroName) {
    try {
        const res = await fetch(`${PVP_URL}/challenges/${encodeURIComponent(heroName)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('[pvp] fetchChallenges klaida:', e.message);
        return [];
    }
}

// Siunčia iššūkį kitam žaidėjui
async function challengePlayer(challengerName, targetName) {
    try {
        const res = await fetch(`${PVP_URL}/challenge`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ challengerName, targetName }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        return await res.json();
    } catch (e) {
        console.error('[pvp] challengePlayer klaida:', e.message);
        return null;
    }
}

// Priima iššūkį - serveris simuliuoja kovą ir grąžina rezultatą
async function acceptChallenge(matchId) {
    try {
        const res = await fetch(`${PVP_URL}/accept/${matchId}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('[pvp] acceptChallenge klaida:', e.message);
        return null;
    }
}

// Atmeta iššūkį
async function declineChallenge(matchId) {
    try {
        const res = await fetch(`${PVP_URL}/decline/${matchId}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('[pvp] declineChallenge klaida:', e.message);
        return null;
    }
}

// Gauna paskutinius 5 PvP rezultatus
async function fetchPvPResults(heroName) {
    try {
        const res = await fetch(`${PVP_URL}/results/${encodeURIComponent(heroName)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('[pvp] fetchPvPResults klaida:', e.message);
        return [];
    }
}

// Gauna visų žaidėjų sąrašą (iššūkiams)
async function fetchAllHeroes() {
    try {
        const res = await fetch(`${BASE_API}/heroes`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('[pvp] fetchAllHeroes klaida:', e.message);
        return [];
    }
}

// Generuoja PvP modal HTML
// challenges  - laukiantys iššūkiai (gauti)
// results     - paskutinių kovų istorija
// allHeroes   - visi žaidėjai serverio atmintyje
// myName      - dabartinio žaidėjo vardas
function getPvPHTML(challenges, results, allHeroes, myName) {
    const others = allHeroes.filter(h => h.name.toLowerCase() !== myName.toLowerCase());

    // ── Žaidėjų sąrašas (iššūkti) ──
    let playersHTML;
    if (others.length === 0) {
        playersHTML = '<p class="pvp-empty">Nėra kitų žaidėjų. Pakvieskite draugus!</p>';
    } else {
        playersHTML = others.map(h => `
            <div class="pvp-player-item">
                <div class="pvp-player-info">
                    <span class="pvp-player-name">${h.name}</span>
                    <span class="pvp-player-meta">${h.heroClass} · Lygis ${h.level} · ${h.gold} 💰</span>
                </div>
                <button class="btn-shop pvp-challenge-btn" data-target="${h.name}">⚔️ Iššūkti</button>
            </div>
        `).join('');
    }

    // ── Gauti iššūkiai ──
    let challengesHTML;
    if (challenges.length === 0) {
        challengesHTML = '<p class="pvp-empty">Nėra laukiančių iššūkių</p>';
    } else {
        challengesHTML = challenges.map(c => `
            <div class="pvp-challenge-item">
                <div class="pvp-challenge-info">
                    <span class="pvp-player-name">⚔️ ${c.challengerName}</span>
                    <span class="pvp-player-meta">laukia jūsų atsako...</span>
                </div>
                <div class="pvp-challenge-actions">
                    <button class="btn-shop pvp-accept-btn" data-match-id="${c.id}">✔ Priimti</button>
                    <button class="btn-pvp-decline pvp-decline-btn" data-match-id="${c.id}">✕ Atmesti</button>
                </div>
            </div>
        `).join('');
    }

    // ── Kovų istorija ──
    let resultsHTML;
    if (results.length === 0) {
        resultsHTML = '<p class="pvp-empty">Dar nebuvo PvP kovų</p>';
    } else {
        resultsHTML = results.map(r => {
            const won      = r.winner.toLowerCase() === myName.toLowerCase();
            const opponent = won ? r.loser : r.winner;
            const timeStr  = new Date(r.timestamp).toLocaleTimeString('lt-LT', {
                hour:   '2-digit',
                minute: '2-digit',
            });
            return `
                <div class="pvp-result-item ${won ? 'pvp-result--win' : 'pvp-result--loss'}">
                    <span class="pvp-result-badge">${won ? '🏆 PERGALĖ' : '💀 PRALAIMĖJIMAS'}</span>
                    <span class="pvp-result-vs">prieš <strong>${opponent}</strong></span>
                    ${won ? `<span class="pvp-result-reward">+${r.xpGained} XP · +${r.goldGained} 💰</span>` : ''}
                    <span class="pvp-result-time">${timeStr}</span>
                </div>
            `;
        }).join('');
    }

    const badgeCount = challenges.length > 0 ? `(${challenges.length})` : '';

    return `
        <p id="pvpMessage" class="pvp-message"></p>

        <div class="pvp-section">
            <h3 class="pvp-section-title">⚔️ Iššūkti žaidėją</h3>
            <div class="pvp-player-list">${playersHTML}</div>
        </div>

        <hr class="guild-divider">

        <div class="pvp-section">
            <h3 class="pvp-section-title">📨 Gauti iššūkiai <span class="pvp-count">${badgeCount}</span></h3>
            <div class="pvp-challenges-list">${challengesHTML}</div>
        </div>

        <hr class="guild-divider">

        <div class="pvp-section">
            <h3 class="pvp-section-title">📜 Kovų istorija</h3>
            <div class="pvp-results-list">${resultsHTML}</div>
        </div>
    `;
}
