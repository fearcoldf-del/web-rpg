// ── Žaidimo būsena ──
let hero           = null;
let currentBattle  = null;
let battleInterval = null;
let pvpPollInterval = null; // PvP iššūkių tikrinimo intervalas

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[main.js] DOMContentLoaded - pradedu registruoti event listener\'us');

    // ── Bandome įkelti paskutinį hero iš serverio ──
    const lastHeroName = localStorage.getItem('lastHeroName');
    if (lastHeroName) {
        console.log('[main.js] Randame lastHeroName:', lastHeroName, '- bandome įkelti');
        const data = await loadHero(lastHeroName);
        if (data) {
            hero = new Hero(data.name, data.heroClass);
            hero.level = data.level;
            hero.xp    = data.xp;
            hero.gold  = data.gold;
            hero.hp    = data.hp;   // išsaugoti HP, NE maxHp
            hero.maxHp = data.maxHp;
            hero.atk   = data.atk;
            hero.def   = data.def;

            console.log('[main.js] Hero įkeltas, praleidžiam kūrimo ekraną');
            console.log('HP prieš spawn (įkeliant iš serverio):', hero.hp, '/', hero.maxHp);
            document.getElementById('battleLog').innerHTML = '';
            updateHeroStats(hero);
            showBattleScreen();
            spawnEnemy();
            startPvPPolling();
        }
    }

    // ── Klasės pasirinkimas ──
    document.querySelectorAll('input[name="heroClass"]').forEach(r => {
        r.addEventListener('change', () => {
            console.log('[heroClass] Pasirinkta klasė:', r.value);
            validateForm();
        });
    });

    // ── Vardo laukas ──
    document.getElementById('heroName').addEventListener('input', validateForm);

    // ── "Pradėti nuotykį" mygtukas ──
    document.getElementById('startBtn').addEventListener('click', async () => {
        console.log('[startBtn] Paspaustas');

        const name      = document.getElementById('heroName').value.trim();
        const heroClass = document.querySelector('input[name="heroClass"]:checked').value;

        try {
            hero = new Hero(name, heroClass);
        } catch (e) {
            document.getElementById('creationError').textContent = e.message;
            return;
        }

        localStorage.setItem('lastHeroName', hero.name);
        await saveHero(hero);

        document.getElementById('battleLog').innerHTML = '';
        updateHeroStats(hero);
        showBattleScreen();
        console.log('HP prieš spawn (naujas herojus, kūrimas):', hero.hp, '/', hero.maxHp);
        spawnEnemy();
        startPvPPolling();
    });

    // ── "Pradėti kovą" mygtukas ──
    document.getElementById('fightBtn').addEventListener('click', () => {
        console.log('[fightBtn] Paspaustas, battleInterval:', battleInterval);
        if (battleInterval) return;

        document.getElementById('fightBtn').disabled = true;
        addBattleLog('Kova prasideda!', 'system');
        battleInterval = setInterval(runTurn, 1500);
    });

    // ── Gildijų mygtukas ──
    document.getElementById('guildBtn').addEventListener('click', () => openGuildModal());

    document.getElementById('guildCloseBtn').addEventListener('click', () => {
        document.getElementById('guildModal').classList.add('hidden');
    });

    // Pirkimo/prisijungimo ir kūrimo eventai (delegation ant modal turinio)
    document.getElementById('guildContent').addEventListener('click', async (e) => {
        // Prisijungimas prie gildijos
        const joinBtn = e.target.closest('.guild-join-btn');
        if (joinBtn) {
            const guildId = joinBtn.dataset.guildId;
            const result  = await joinGuild(guildId, hero.name);
            if (result) {
                hero.guildId = guildId;
                await saveHero(hero);
                openGuildModal();
            }
            return;
        }

        // Gildijos kūrimas
        if (e.target.id === 'guildCreateBtn') {
            const name = document.getElementById('guildNameInput').value.trim();
            const desc = document.getElementById('guildDescInput').value.trim();
            const msg  = document.getElementById('guildMessage');

            if (!name) { msg.textContent = 'Įveskite gildijos pavadinimą.'; return; }

            const result = await createGuild(name, desc, hero.name);
            if (result) {
                hero.guildId = result.id;
                await saveHero(hero);
                openGuildModal();
            } else {
                msg.textContent = 'Nepavyko sukurti gildijos.';
            }
        }
    });

    // ── Lyderlentelės mygtukas ──
    document.getElementById('lbBtn').addEventListener('click', async () => {
        document.getElementById('lbContent').innerHTML = '<p class="lb-loading">Kraunama...</p>';
        document.getElementById('lbModal').classList.remove('hidden');

        const players = await fetchLeaderboard();
        document.getElementById('lbContent').innerHTML =
            getLeaderboardHTML(players, hero?.name);
    });

    document.getElementById('lbCloseBtn').addEventListener('click', () => {
        document.getElementById('lbModal').classList.add('hidden');
    });

    // ── Shop mygtukas ──
    document.getElementById('shopBtn').addEventListener('click', () => {
        openShop();
    });

    document.getElementById('shopCloseBtn').addEventListener('click', () => {
        document.getElementById('shopModal').classList.add('hidden');
    });

    // Pirkimo mygtukai (event delegation ant modal'o)
    document.getElementById('shopContent').addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-item]');
        if (!btn || btn.disabled) return;

        const itemId = btn.dataset.item;
        const result = buyItem(hero, itemId);

        document.getElementById('shopMessage').textContent = result.message;
        document.getElementById('shopMessage').style.color = result.success ? '#ffd166' : '#e63946';

        if (result.success) {
            updateHeroStats(hero);
            await saveHero(hero);
            // Atnaujina shop UI su nauju gold kiekiu
            document.getElementById('shopContent').innerHTML = getShopHTML(hero);
        }
    });

    // ── PvP mygtukas ──
    document.getElementById('pvpBtn').addEventListener('click', () => openPvPModal());

    document.getElementById('pvpCloseBtn').addEventListener('click', () => {
        document.getElementById('pvpModal').classList.add('hidden');
    });

    // PvP veiksmai (event delegation ant modal turinio)
    document.getElementById('pvpContent').addEventListener('click', async (e) => {
        const msg = document.getElementById('pvpMessage');

        // Iššūkti žaidėją
        const challengeBtn = e.target.closest('.pvp-challenge-btn');
        if (challengeBtn) {
            const targetName = challengeBtn.dataset.target;
            challengeBtn.disabled = true;
            const result = await challengePlayer(hero.name, targetName);
            if (result) {
                if (msg) {
                    msg.textContent  = `⚔️ Iššūkis išsiųstas žaidėjui ${targetName}!`;
                    msg.style.color  = '#ffd166';
                }
            } else {
                if (msg) {
                    msg.textContent = 'Nepavyko išsiųsti iššūkio.';
                    msg.style.color = '#e63946';
                }
                challengeBtn.disabled = false;
            }
            return;
        }

        // Priimti iššūkį
        const acceptBtn = e.target.closest('.pvp-accept-btn');
        if (acceptBtn) {
            const matchId = acceptBtn.dataset.matchId;
            acceptBtn.disabled = true;
            const result = await acceptChallenge(matchId);
            if (result) {
                const won = result.winner.toLowerCase() === hero.name.toLowerCase();
                if (won) {
                    // Pridedam XP ir gold nugalėtojui
                    hero.gainXP(result.xpGained);
                    hero.gold += result.goldGained;
                    await saveHero(hero);
                    updateHeroStats(hero);
                    addBattleLog(`⚔️ PvP pergalė! Prieš ${result.loser}. +${result.xpGained} XP, +${result.goldGained} 💰`, 'system');
                } else {
                    addBattleLog(`⚔️ PvP pralaimėjimas. ${result.winner} buvo stipresnis.`, 'enemy');
                }
                // Atnaujiname badge ir modal
                await checkPvPChallenges();
                openPvPModal();
            } else {
                if (msg) {
                    msg.textContent = 'Klaida priimant iššūkį.';
                    msg.style.color = '#e63946';
                }
                acceptBtn.disabled = false;
            }
            return;
        }

        // Atmesti iššūkį
        const declineBtn = e.target.closest('.pvp-decline-btn');
        if (declineBtn) {
            const matchId = declineBtn.dataset.matchId;
            declineBtn.disabled = true;
            await declineChallenge(matchId);
            await checkPvPChallenges();
            openPvPModal();
            return;
        }
    });

    // ── "Naujas herojus" mygtukas - atnaujina HP ir sukuria naują priešą ──
    document.getElementById('newHeroBtn').addEventListener('click', () => {
        console.log('[newHeroBtn] Paspaustas - atstatome HP, kuriame naują priešą');
        clearInterval(battleInterval);
        battleInterval = null;

        // Išsaugome lygį, XP ir gold - tik atstatome HP (LEISTINAS reset)
        hero.hp = hero.maxHp;

        document.getElementById('battleLog').innerHTML = '';
        updateHeroStats(hero);
        console.log('HP prieš spawn (Naujas herojus mygtukas):', hero.hp, '/', hero.maxHp);
        spawnEnemy();
    });

    console.log('[main.js] Visi event listener\'ai užregistruoti');
});

// ── PvP pagalbinės funkcijos ──

// Pradeda kas 30s tikrinti naujus iššūkius
function startPvPPolling() {
    if (pvpPollInterval) return;
    checkPvPChallenges(); // tikrina iškart paleidus
    pvpPollInterval = setInterval(checkPvPChallenges, 30000);
}

// Tikrina ar yra naujų iššūkių - atnaujina badge ant mygtuko
async function checkPvPChallenges() {
    if (!hero) return;
    const challenges = await fetchChallenges(hero.name);
    const count      = challenges.length;
    const badge      = document.getElementById('pvpBadge');
    if (!badge) return;

    if (count > 0) {
        badge.textContent = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// Atidaro PvP modal ir užkrauna visus duomenis
async function openPvPModal() {
    document.getElementById('pvpModal').classList.remove('hidden');
    document.getElementById('pvpContent').innerHTML = '<p class="lb-loading">Kraunama...</p>';

    // Lygiagretūs užklausai
    const [challenges, results, allHeroes] = await Promise.all([
        fetchChallenges(hero.name),
        fetchPvPResults(hero.name),
        fetchAllHeroes(),
    ]);

    document.getElementById('pvpContent').innerHTML =
        getPvPHTML(challenges, results, allHeroes, hero.name);
}

// ── Gildijų modal pagalbinė funkcija ──
async function openGuildModal() {
    document.getElementById('guildModal').classList.remove('hidden');
    document.getElementById('guildContent').innerHTML = '<p class="lb-loading">Kraunama...</p>';

    const guilds = await fetchGuilds();
    if (guilds === null) {
        document.getElementById('guildContent').innerHTML =
            '<p class="lb-empty">Nepavyko prisijungti prie serverio.</p>';
        return;
    }
    document.getElementById('guildContent').innerHTML =
        getGuildsHTML(guilds, hero?.guildId);
}

// ── Shop pagalbinė funkcija ──
function openShop() {
    document.getElementById('shopMessage').textContent = '';
    document.getElementById('shopContent').innerHTML = getShopHTML(hero);
    document.getElementById('shopModal').classList.remove('hidden');
}

// ── Formos validacija ──
function validateForm() {
    const name    = document.getElementById('heroName').value.trim();
    const checked = document.querySelector('input[name="heroClass"]:checked');
    document.getElementById('startBtn').disabled = !(name && checked);
    document.getElementById('creationError').textContent = '';
}

// ── Priešo generavimas ──
function spawnEnemy() {
    const enemy   = createEnemy(hero.level);
    enemy.level   = hero.level;
    currentBattle = new Battle(hero, enemy);

    updateHeroStats(hero);
    updateEnemyStats(enemy);
    drawArena(hero, enemy);

    document.getElementById('fightBtn').textContent = '⚔ Pradėti kovą';
    document.getElementById('fightBtn').disabled    = false;

    const bossWarn = enemy.isBoss ? ' ⚠ BOSAS!' : '';
    addBattleLog(`─── ${enemy.emoji ?? ''} ${enemy.name} (lygis ${enemy.level})${bossWarn} ───`, 'system');
}

// ── Kovos turas ──
function runTurn() {
    const status = currentBattle.isOver();

    if (status.over) {
        clearInterval(battleInterval);
        battleInterval = null;
        finishBattle(status.winner);
        return;
    }

    // Fiksuojame HP prieš turą - žalos skaičiavimui
    const heroPrevHp  = hero.hp;
    const enemyPrevHp = currentBattle.enemy.hp;

    const log = currentBattle.nextTurn();

    addBattleLog(`── Turas ${log.turn - 1} ──`, 'turn');
    log.events.forEach(e => addBattleLog(e.message, e.side === 'hero' ? 'hero' : 'enemy'));

    const heroDmg  = heroPrevHp - hero.hp;
    const enemyDmg = enemyPrevHp - currentBattle.enemy.hp;

    // Canvas efektai
    animateAttack('hero');
    triggerHitFlash('enemy');
    if (enemyDmg > 0) spawnDamageNumber('enemy', enemyDmg);

    if (heroDmg > 0) {
        setTimeout(() => {
            if (currentBattle) {
                animateAttack('enemy');
                triggerHitFlash('hero');
                spawnDamageNumber('hero', heroDmg);
                if (heroDmg > hero.maxHp * 0.2) triggerShake(heroDmg);
            }
        }, 500);
    }

    updateHeroStats(hero);
    updateEnemyStats(currentBattle.enemy);
}

// ── Kovos pabaiga ──
async function finishBattle(winner) {
    const enemy = currentBattle.enemy; // currentBattle scope, ne globalus

    if (winner === 'hero') {
        const xpGain      = enemy.xpReward  ?? (30 + hero.level * 10);
        const goldGain    = enemy.goldReward ?? (10 + hero.level * 5);
        const levelBefore = hero.level;

        hero.gainXP(xpGain);
        hero.gold += goldGain;

        const bossTag = enemy.isBoss ? ' 🐉 BOSAS NUGALĖTAS!' : '';
        addBattleLog(`Pergalė!${bossTag} Gavote ${xpGain} XP ir ${goldGain} gold.`, 'system');
        if (hero.level > levelBefore) {
            addBattleLog(`LEVEL UP! Dabar ${hero.level} lygis!`, 'system');
        }
        triggerVictory();

        updateHeroStats(hero);
        await saveHero(hero);

        // Po pergalės - automatiškai sukuriamas naujas priešas
        setTimeout(() => {
            console.log('HP prieš spawn (po pergalės):', hero.hp, '/', hero.maxHp);
            spawnEnemy();
        }, 2000);

    } else {
        // BUGFIX: HP NERESETINAMAS - žaidėjas pats turi spausti "Naujas herojus"
        // Pašalinta: hero.hp = hero.maxHp
        addBattleLog(`${hero.name} buvo nugalėtas! HP: ${hero.hp}/${hero.maxHp}. Spausk ↩ Naujas herojus.`, 'enemy');
        triggerDefeat();

        console.log('HP po pralaimėjimo (išsaugomas toks koks yra):', hero.hp, '/', hero.maxHp);
        updateHeroStats(hero);
        await saveHero(hero);
        // Po pralaimėjimo - NE automatiškai. Žaidėjas turi spausti "Naujas herojus"
    }
}
