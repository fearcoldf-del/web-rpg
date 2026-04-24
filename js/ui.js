// ── Canvas konstantos ──
const CANVAS_W = 400;
const CANVAS_H = 300;
const CLASS_COLOR = { warrior: '#4fc3f7', mage: '#ce93d8', archer: '#a5d6a7' };

// ── Animacijos būsena ──
let _hero  = null;
let _enemy = null;
let _frameId = null;

const _dmgNums  = [];  // { x, y, vy, text, color, alpha }
const _particles = []; // { x, y, vx, vy, alpha, color, r }
const _flash = { hero: 0, enemy: 0 }; // flash likusių kadrų skaičius
let _shakeFrames  = 0;
let _defeatAlpha  = 0;
let _victoryFrames = 0;

// ── DOM: stats atnaujinimas ──

function updateHeroStats(hero) {
    document.getElementById('heroName-display').textContent = hero.name;
    document.getElementById('heroClass-display').textContent = hero.heroClass;
    const pct = Math.max(0, (hero.hp / hero.maxHp) * 100);
    const bar = document.getElementById('heroHpBar');
    bar.style.width = pct + '%';
    bar.classList.toggle('hp-critical', pct < 25);
    document.getElementById('heroHpText').textContent = `${hero.hp}/${hero.maxHp}`;
    document.getElementById('heroAtk').textContent = hero.atk;
    document.getElementById('heroDef').textContent = hero.def;
    document.getElementById('heroLvl').textContent = hero.level;
    document.getElementById('heroXp').textContent  = `${hero.xp}/${hero.level * 100}`;
    document.getElementById('heroGold').textContent = hero.gold;
}

function updateEnemyStats(enemy) {
    document.getElementById('enemyName-display').textContent   = enemy.name;
    document.getElementById('enemyLevel-display').textContent  = `Lygis ${enemy.level ?? 1}`;
    const pct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
    const bar = document.getElementById('enemyHpBar');
    bar.style.width = pct + '%';
    bar.classList.toggle('hp-critical', pct < 25);
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
    _stopLoop();
}

// ── CSS panelių animacija (shake) ──

function animateAttack(side) {
    const id = side === 'hero' ? 'heroPanel' : 'enemyPanel';
    const el = document.getElementById(id);
    el.classList.add('attacking');
    setTimeout(() => el.classList.remove('attacking'), 400);
}

// ── Viešos efektų funkcijos ──

// Skraidantis žalos skaičius. side: 'hero'|'enemy', amount: skaičius
function spawnDamageNumber(side, amount) {
    const x     = side === 'enemy' ? 320 : 80;
    // Raudona kai enemy gauna žalos, geltona kai hero gauna žalos
    const color = side === 'enemy' ? '#ff4444' : '#f0a500';
    _dmgNums.push({
        x: x + (Math.random() - 0.5) * 24,
        y: 140,
        vy: -1.4,
        text: `-${amount}`,
        color,
        alpha: 1,
    });
    _ensureLoop();
}

// Hit flash efektas. side: 'hero'|'enemy'
function triggerHitFlash(side) {
    _flash[side] = 9;
    _ensureLoop();
}

// Canvas drebėjimas. Naudoti kai hero gauna didelį smūgį
function triggerShake(damageTaken) {
    _shakeFrames = Math.min(Math.ceil(damageTaken / 2.5), 18);
    _ensureLoop();
}

// Auksiniai dalelių efektai - pergalei
function triggerVictory() {
    _defeatAlpha   = 0;
    _victoryFrames = 130;
    _ensureLoop();
}

// Tamsinimo efektas - pralaimėjimui
function triggerDefeat() {
    _victoryFrames = 0;
    _defeatAlpha   = 0.01;
    _ensureLoop();
}

// Nustato dabartines kovos figūras ir paleidžia piešimą
function drawArena(hero, enemy) {
    _hero  = hero;
    _enemy = enemy;
    _defeatAlpha   = 0;
    _victoryFrames = 0;
    _ensureLoop();
}

// ── Animacijos kilpa ──

function _ensureLoop() {
    if (!_frameId) _tick();
}

function _stopLoop() {
    if (_frameId) cancelAnimationFrame(_frameId);
    _frameId = null;
}

function _tick() {
    _frameId = requestAnimationFrame(_tick);
    const canvas = document.getElementById('battleCanvas');
    if (!canvas || !_hero || !_enemy) return;
    const ctx = canvas.getContext('2d');

    // Shake poslinkis
    let sx = 0, sy = 0;
    if (_shakeFrames > 0) {
        const mag = Math.min(_shakeFrames, 12);
        sx = (Math.random() - 0.5) * mag * 1.4;
        sy = (Math.random() - 0.5) * mag * 0.5;
        _shakeFrames--;
    }

    ctx.save();
    ctx.translate(sx, sy);
    _drawScene(ctx);
    ctx.restore();

    _renderDmgNums(ctx);
    _renderParticles(ctx);
    _renderDefeat(ctx);

    _stepDmgNums();
    _stepParticles();
    _stepDefeat();

    // Pergalės dalelių generavimas
    if (_victoryFrames > 0) {
        _victoryFrames--;
        if (Math.random() < 0.65) _spawnGoldParticle();
    }

    // Sustabdyti kilpą kai nėra aktyvių efektų
    const busy = _dmgNums.length || _particles.length || _shakeFrames > 0
        || _flash.hero > 0 || _flash.enemy > 0
        || _defeatAlpha > 0 || _victoryFrames > 0;

    if (!busy) {
        cancelAnimationFrame(_frameId);
        _frameId = null;
        // Galutinis švarus kadras
        const c = document.getElementById('battleCanvas');
        if (c && _hero && _enemy) _drawScene(c.getContext('2d'));
    }
}

// ── Piešimo funkcijos ──

function _drawScene(ctx) {
    // Fonas
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, '#0d0d1a');
    bg.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grindys
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(0, CANVAS_H - 50, CANVAS_W, 50);
    ctx.strokeStyle = '#f0a500';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H - 50);
    ctx.lineTo(CANVAS_W, CANVAS_H - 50);
    ctx.stroke();

    // Žvakių glow
    [60, 340].forEach(x => {
        const g = ctx.createRadialGradient(x, CANVAS_H - 50, 0, x, CANVAS_H - 50, 30);
        g.addColorStop(0, 'rgba(240,165,0,0.3)');
        g.addColorStop(1, 'rgba(240,165,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 30, CANVAS_H - 80, 60, 60);
    });

    _drawFighter(ctx, _hero,  80,  CANVAS_H - 55, 'left',  CLASS_COLOR[_hero.heroClass] || '#90e0ef', 'hero');
    _drawFighter(ctx, _enemy, 320, CANVAS_H - 55, 'right', '#ff6b6b', 'enemy');
}

function _drawFighter(ctx, unit, x, groundY, facing, baseColor, side) {
    const alive = unit.hp > 0;
    const flash = _flash[side];
    ctx.globalAlpha = alive ? 1 : 0.35;

    const bodyH = 50, bodyW = 20, headR = 12;
    // Flash: balta hero smūgiui, ryški raudona enemy smūgiui
    const color = flash > 0
        ? (side === 'enemy' ? '#ff3333' : '#ffffff')
        : baseColor;

    if (alive) {
        const glow = ctx.createRadialGradient(x, groundY - bodyH / 2, 0, x, groundY - bodyH / 2, 35);
        glow.addColorStop(0, color + '55');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(x - 35, groundY - bodyH - headR * 2 - 10, 70, bodyH + headR * 2 + 20);
    }

    ctx.fillStyle = color;
    ctx.fillRect(x - bodyW / 2, groundY - bodyH, bodyW, bodyH);

    ctx.beginPath();
    ctx.arc(x, groundY - bodyH - headR, headR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    const wx = facing === 'left' ? x + bodyW / 2 : x - bodyW / 2;
    ctx.strokeStyle = flash > 0 ? color : '#f0a500';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wx, groundY - bodyH + 10);
    ctx.lineTo(wx + (facing === 'left' ? 25 : -25), groundY - bodyH - 15);
    ctx.stroke();

    // HP baras virš figūros
    const barW = 50, barH = 6;
    const barX = x - barW / 2;
    const barY = groundY - bodyH - headR * 2 - 20;
    const hpPct = Math.max(0, unit.hp / unit.maxHp);
    ctx.fillStyle = '#2a0a0a';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = hpPct > 0.5 ? '#e63946' : hpPct > 0.25 ? '#f4a261' : '#ff0000';
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    ctx.fillStyle = '#e0e0e0';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(unit.name, x, barY - 4);

    ctx.globalAlpha = 1;

    if (flash > 0) _flash[side]--;
}

// ── Damage numbers ──

function _renderDmgNums(ctx) {
    _dmgNums.forEach(d => {
        ctx.save();
        ctx.globalAlpha  = d.alpha;
        ctx.fillStyle    = d.color;
        ctx.font         = 'bold 20px sans-serif';
        ctx.textAlign    = 'center';
        ctx.shadowColor  = d.color;
        ctx.shadowBlur   = 12;
        ctx.fillText(d.text, d.x, d.y);
        ctx.restore();
    });
}

function _stepDmgNums() {
    for (let i = _dmgNums.length - 1; i >= 0; i--) {
        const d = _dmgNums[i];
        d.y    += d.vy;
        d.vy   *= 0.97;
        d.alpha -= 0.022;
        if (d.alpha <= 0) _dmgNums.splice(i, 1);
    }
}

// ── Victory dalelės ──

function _spawnGoldParticle() {
    const cols = ['#f0a500', '#ffd166', '#ffffff', '#ffe066', '#ffa500'];
    _particles.push({
        x:  Math.random() * CANVAS_W,
        y:  -6,
        vx: (Math.random() - 0.5) * 1.8,
        vy: Math.random() * 1.5 + 0.3,
        alpha: 0.95,
        color: cols[Math.floor(Math.random() * cols.length)],
        r: Math.random() * 3 + 1,
    });
}

function _renderParticles(ctx) {
    _particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle   = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = 7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function _stepParticles() {
    for (let i = _particles.length - 1; i >= 0; i--) {
        const p = _particles[i];
        p.x    += p.vx;
        p.y    += p.vy;
        p.vy   += 0.09;
        p.alpha -= 0.009;
        if (p.alpha <= 0) _particles.splice(i, 1);
    }
}

// ── Defeat overlay ──

function _renderDefeat(ctx) {
    if (_defeatAlpha <= 0) return;
    ctx.fillStyle = `rgba(0,0,0,${Math.min(_defeatAlpha, 0.65)})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function _stepDefeat() {
    if (_defeatAlpha > 0 && _defeatAlpha < 0.65) _defeatAlpha += 0.004;
}
