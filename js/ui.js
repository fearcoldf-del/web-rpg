// ── Canvas nustatymai ──
const CANVAS_W = 400;
const CANVAS_H = 300;

// Klasių spalvos herojui
const CLASS_COLOR = { warrior: '#4fc3f7', mage: '#ce93d8', archer: '#a5d6a7' };

function getCanvas() {
    return document.getElementById('battleCanvas');
}

// ── Stats atnaujinimas ──

function updateHeroStats(hero) {
    document.getElementById('heroName-display').textContent = hero.name;
    document.getElementById('heroClass-display').textContent = hero.heroClass;
    const pct = Math.max(0, (hero.hp / hero.maxHp) * 100);
    document.getElementById('heroHpBar').style.width = pct + '%';
    document.getElementById('heroHpText').textContent = `${hero.hp}/${hero.maxHp}`;
    document.getElementById('heroAtk').textContent = hero.atk;
    document.getElementById('heroDef').textContent = hero.def;
    document.getElementById('heroLvl').textContent = hero.level;
    document.getElementById('heroXp').textContent = `${hero.xp}/${hero.level * 100}`;
    document.getElementById('heroGold').textContent = hero.gold;
}

function updateEnemyStats(enemy) {
    document.getElementById('enemyName-display').textContent = enemy.name;
    document.getElementById('enemyLevel-display').textContent = `Lygis ${enemy.level ?? 1}`;
    const pct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
    document.getElementById('enemyHpBar').style.width = pct + '%';
    document.getElementById('enemyHpText').textContent = `${enemy.hp}/${enemy.maxHp}`;
    document.getElementById('enemyAtk').textContent = enemy.atk;
    document.getElementById('enemyDef').textContent = enemy.def;
}

// ── Kovos žurnalas ──

function addBattleLog(message, type = 'system') {
    const log = document.getElementById('battleLog');
    const p = document.createElement('p');
    p.className = `log-${type}`;
    p.textContent = message;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
}

// ── Ekranų valdymas ──

function showBattleScreen() {
    document.getElementById('creationScreen').classList.add('hidden');
    document.getElementById('battleScreen').classList.remove('hidden');
}

function showCreationScreen() {
    document.getElementById('battleScreen').classList.add('hidden');
    document.getElementById('creationScreen').classList.remove('hidden');
}

// ── Atakos animacija (CSS shake) ──

function animateAttack(attacker) {
    const panelId = attacker === 'hero' ? 'heroPanel' : 'enemyPanel';
    const panel = document.getElementById(panelId);
    panel.classList.add('attacking');
    setTimeout(() => panel.classList.remove('attacking'), 400);
}

// ── Canvas piešimas ──

function drawArena(hero, enemy, flashSide = null) {
    const canvas = getCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Fonas
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, '#0d0d1a');
    bg.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Arena grindys
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(0, CANVAS_H - 50, CANVAS_W, 50);
    ctx.strokeStyle = '#f0a500';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H - 50);
    ctx.lineTo(CANVAS_W, CANVAS_H - 50);
    ctx.stroke();

    // Žvakių šviesa (dekoratyviniai taškai)
    [60, 340].forEach(x => {
        const glow = ctx.createRadialGradient(x, CANVAS_H - 50, 0, x, CANVAS_H - 50, 30);
        glow.addColorStop(0, 'rgba(240,165,0,0.3)');
        glow.addColorStop(1, 'rgba(240,165,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - 30, CANVAS_H - 80, 60, 60);
    });

    // Flash efektas kai atakuoja
    if (flashSide) {
        ctx.fillStyle = flashSide === 'hero'
            ? 'rgba(144,224,239,0.15)'
            : 'rgba(255,107,107,0.15)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    drawFighter(ctx, hero,  80,  CANVAS_H - 55, 'left',  CLASS_COLOR[hero.heroClass] || '#90e0ef');
    drawFighter(ctx, enemy, 320, CANVAS_H - 55, 'right', '#ff6b6b');
}

function drawFighter(ctx, unit, x, groundY, facing, color) {
    const alive = (unit.hp ?? unit.maxHp) > 0;
    ctx.globalAlpha = alive ? 1 : 0.4;

    const bodyH = 50;
    const bodyW = 20;
    const headR = 12;

    // Glow
    const glow = ctx.createRadialGradient(x, groundY - bodyH / 2, 0, x, groundY - bodyH / 2, 35);
    glow.addColorStop(0, color + '44');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 35, groundY - bodyH - headR * 2 - 10, 70, bodyH + headR * 2 + 20);

    // Kūnas
    ctx.fillStyle = color;
    ctx.fillRect(x - bodyW / 2, groundY - bodyH, bodyW, bodyH);

    // Galva
    ctx.beginPath();
    ctx.arc(x, groundY - bodyH - headR, headR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Ginklas
    const wx = facing === 'left' ? x + bodyW / 2 : x - bodyW / 2;
    ctx.strokeStyle = '#f0a500';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wx, groundY - bodyH + 10);
    ctx.lineTo(wx + (facing === 'left' ? 25 : -25), groundY - bodyH - 15);
    ctx.stroke();

    // HP baras virš figūros
    const barW = 50;
    const barH = 6;
    const barX = x - barW / 2;
    const barY = groundY - bodyH - headR * 2 - 20;
    const hpPct = Math.max(0, unit.hp / unit.maxHp);

    ctx.fillStyle = '#2a0a0a';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = hpPct > 0.5 ? '#e63946' : hpPct > 0.25 ? '#f4a261' : '#ff0000';
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    // Vardas
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '11px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText(unit.name, x, barY - 4);

    ctx.globalAlpha = 1;
}
