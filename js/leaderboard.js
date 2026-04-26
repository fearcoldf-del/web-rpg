const LEADERBOARD_URL = 'http://localhost:3000/api/leaderboard';

// Klasių emoji žymėjimui
const CLASS_EMOJI = { warrior: '🛡', mage: '🔮', archer: '🏹' };

// Gauna lyderlentelės duomenis iš serverio
async function fetchLeaderboard() {
    try {
        const res = await fetch(LEADERBOARD_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('[leaderboard] fetchLeaderboard klaida:', e.message);
        return null;
    }
}

// Generuoja lyderlentelės HTML
// currentName - dabartinio žaidėjo vardas (pažymimas spalviškai)
function getLeaderboardHTML(players, currentName) {
    if (!players || players.length === 0) {
        return '<p class="lb-empty">Lyderlentelė tuščia. Būk pirmas!</p>';
    }

    const medalai = ['🥇', '🥈', '🥉'];

    const rows = players.map((p, i) => {
        const isCurrent = p.name.toLowerCase() === (currentName || '').toLowerCase();
        const vieta     = medalai[i] ?? `${i + 1}.`;
        const klasė     = CLASS_EMOJI[p.heroClass] ?? '⚔';
        return `
        <tr class="${isCurrent ? 'lb-row--current' : ''}">
            <td class="lb-rank">${vieta}</td>
            <td class="lb-name">${isCurrent ? '★ ' : ''}${p.name}</td>
            <td class="lb-class">${klasė} ${p.heroClass}</td>
            <td class="lb-level">⭐ ${p.level}</td>
            <td class="lb-gold">💰 ${p.gold}</td>
        </tr>`;
    }).join('');

    return `
    <table class="lb-table">
        <thead>
            <tr>
                <th>#</th>
                <th>Vardas</th>
                <th>Klasė</th>
                <th>Lygis</th>
                <th>Gold</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>`;
}
