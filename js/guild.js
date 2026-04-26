const GUILD_URL = 'http://localhost:3000/api/guilds';

// Gauna visų gildijų sąrašą
async function fetchGuilds() {
    try {
        const res = await fetch(GUILD_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('[guild] fetchGuilds klaida:', e.message);
        return null;
    }
}

// Sukuria naują gildiją
async function createGuild(name, description, leaderName) {
    try {
        const res = await fetch(GUILD_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name, description, leaderName }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('[guild] createGuild klaida:', e.message);
        return null;
    }
}

// Prisijungia prie gildijos
async function joinGuild(guildId, heroName) {
    try {
        const res = await fetch(`${GUILD_URL}/${guildId}/join`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ heroName }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error('[guild] joinGuild klaida:', e.message);
        return null;
    }
}

// Generuoja gildijų modal'o HTML
// guilds     - gildijų masyvas iš serverio
// heroGuildId - dabartinio hero gildijos ID (arba null)
function getGuildsHTML(guilds, heroGuildId) {
    const sąrašas = guilds.length === 0
        ? '<p class="guild-empty">Dar nėra gildijų. Sukurk pirmą!</p>'
        : guilds.map(g => {
            const arNarys   = String(g.id) === String(heroGuildId);
            const narysTag  = arNarys ? '<span class="guild-badge">✔ Mano gildija</span>' : '';
            return `
            <div class="guild-item ${arNarys ? 'guild-item--mine' : ''}">
                <div class="guild-info">
                    <span class="guild-name">⚔️ ${g.name}</span>
                    ${narysTag}
                    <span class="guild-desc">${g.description || ''}</span>
                    <span class="guild-meta">👑 ${g.leaderName} &nbsp;·&nbsp; 👥 ${g.members.length} nariai</span>
                </div>
                ${arNarys ? '' : `
                <button class="btn btn-shop guild-join-btn" data-guild-id="${g.id}">
                    Prisijungti
                </button>`}
            </div>`;
        }).join('');

    return `
    <div class="guild-list">${sąrašas}</div>
    <hr class="guild-divider">
    <div class="guild-create">
        <p class="guild-create-title">Sukurti naują gildiją</p>
        <input id="guildNameInput"  class="guild-input" type="text"
               placeholder="Gildijos pavadinimas" maxlength="30">
        <input id="guildDescInput"  class="guild-input" type="text"
               placeholder="Aprašymas (nebūtina)" maxlength="60">
        <button id="guildCreateBtn" class="btn btn-primary guild-create-btn">
            ⚔️ Kurti gildiją
        </button>
        <p id="guildMessage" class="shop-message"></p>
    </div>`;
}
