// ── Žaidimo būsena ──
let hero          = null;
let currentBattle = null;
let battleInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('[main.js] DOMContentLoaded - pradedu registruoti event listener\'us');

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
    document.getElementById('startBtn').addEventListener('click', () => {
        console.log('[startBtn] Paspaustas');

        const name      = document.getElementById('heroName').value.trim();
        const heroClass = document.querySelector('input[name="heroClass"]:checked').value;

        try {
            hero = new Hero(name, heroClass);
        } catch (e) {
            document.getElementById('creationError').textContent = e.message;
            return;
        }

        document.getElementById('battleLog').innerHTML = '';
        updateHeroStats(hero);
        showBattleScreen();
        spawnEnemy();
    });

    // ── "Pradėti kovą" mygtukas ──
    document.getElementById('fightBtn').addEventListener('click', () => {
        console.log('[fightBtn] Paspaustas, battleInterval:', battleInterval);
        if (battleInterval) return;

        document.getElementById('fightBtn').disabled = true;
        addBattleLog('Kova prasideda!', 'system');
        battleInterval = setInterval(runTurn, 1500);
    });

    // ── "Naujas herojus" mygtukas ──
    document.getElementById('newHeroBtn').addEventListener('click', () => {
        console.log('[newHeroBtn] Paspaustas');
        clearInterval(battleInterval);
        battleInterval = null;
        hero           = null;
        currentBattle  = null;

        document.getElementById('heroName').value = '';
        document.querySelectorAll('input[name="heroClass"]').forEach(r => r.checked = false);
        document.getElementById('startBtn').disabled = true;
        document.getElementById('battleLog').innerHTML = '';

        showCreationScreen();
    });

    console.log('[main.js] Visi event listener\'ai užregistruoti');
});

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

    addBattleLog(`─── Naujas priešas: ${enemy.name} (lygis ${enemy.level}) ───`, 'system');
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

    const heroDmg  = heroPrevHp - hero.hp;
    const enemyDmg = enemyPrevHp - currentBattle.enemy.hp;

    addBattleLog(`── Turas ${log.turn - 1} ──`, 'turn');
    log.events.forEach((msg, i) => addBattleLog(msg, i === 0 ? 'hero' : 'enemy'));

    // Canvas efektai
    animateAttack('hero');
    triggerHitFlash('enemy');
    spawnDamageNumber('enemy', enemyDmg);

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
function finishBattle(winner) {
    const enemy = currentBattle.enemy;

    if (winner === 'hero') {
        const xpGain      = 30 + hero.level * 10;
        const goldGain    = 10 + hero.level * 5;
        const levelBefore = hero.level;

        hero.gainXP(xpGain);
        hero.gold += goldGain;

        addBattleLog(`Pergalė! Gavote ${xpGain} XP ir ${goldGain} gold.`, 'system');
        if (hero.level > levelBefore) {
            addBattleLog(`LEVEL UP! Dabar ${hero.level} lygis!`, 'system');
        }
        triggerVictory();
    } else {
        addBattleLog(`${hero.name} buvo nugalėtas... Pabandyk dar kartą!`, 'enemy');
        hero.hp = Math.floor(hero.maxHp * 0.3);
        triggerDefeat();
    }

    updateHeroStats(hero);
    setTimeout(spawnEnemy, 2000);
}
