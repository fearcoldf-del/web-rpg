// ── Canvas konstantos ──
const CANVAS_W = 400;
const CANVAS_H = 300;

// ── Animacijos būsena ──
let _hero  = null;
let _enemy = null;
let _frameId = null;

const _dmgNums   = [];
const _particles = [];
const _flash     = { hero: 0, enemy: 0 };
const _atkPhase  = { hero: 0, enemy: 0 }; // atakos šuolio animacijos fazė
let _shakeFrames  = 0;
let _defeatAlpha  = 0;
let _victoryFrames = 0;

// ── Flash spalvos pagalbinė ──
function _fc(side, normal) {
    return _flash[side] > 0 ? (side === 'enemy' ? '#ff4444' : '#ffffff') : normal;
}

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
    document.getElementById('enemyName-display').textContent  = enemy.name;
    document.getElementById('enemyLevel-display').textContent = `Lygis ${enemy.level ?? 1}`;
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

// ── CSS panelių animacija + Canvas atakos šuolis ──

function animateAttack(side) {
    const el = document.getElementById(side === 'hero' ? 'heroPanel' : 'enemyPanel');
    el.classList.add('attacking');
    setTimeout(() => el.classList.remove('attacking'), 400);
    // Canvas šuolis į priekį
    _atkPhase[side] = 12;
    _ensureLoop();
}

// ── Viešos efektų funkcijos ──

function spawnDamageNumber(side, amount) {
    const x     = side === 'enemy' ? 320 : 80;
    const color = side === 'enemy' ? '#ff4444' : '#f0a500';
    _dmgNums.push({ x: x + (Math.random() - 0.5) * 24, y: 140, vy: -1.4, text: `-${amount}`, color, alpha: 1 });
    _ensureLoop();
}

function triggerHitFlash(side) {
    _flash[side] = 9;
    _ensureLoop();
}

function triggerShake(damageTaken) {
    _shakeFrames = Math.min(Math.ceil(damageTaken / 2.5), 18);
    _ensureLoop();
}

function triggerVictory() {
    _defeatAlpha = 0; _victoryFrames = 130;
    _ensureLoop();
}

function triggerDefeat() {
    _victoryFrames = 0; _defeatAlpha = 0.01;
    _ensureLoop();
}

function drawArena(hero, enemy) {
    _hero = hero; _enemy = enemy;
    _defeatAlpha = 0; _victoryFrames = 0;
    _ensureLoop();
}

// ── Animacijos kilpa ──

function _ensureLoop() { if (!_frameId) _tick(); }
function _stopLoop()   { if (_frameId) cancelAnimationFrame(_frameId); _frameId = null; }

function _tick() {
    _frameId = requestAnimationFrame(_tick);
    const canvas = document.getElementById('battleCanvas');
    if (!canvas || !_hero || !_enemy) return;
    const ctx = canvas.getContext('2d');

    // Screen shake
    let sx = 0, sy = 0;
    if (_shakeFrames > 0) {
        const m = Math.min(_shakeFrames, 12);
        sx = (Math.random() - 0.5) * m * 1.4;
        sy = (Math.random() - 0.5) * m * 0.5;
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

    if (_victoryFrames > 0) { _victoryFrames--; if (Math.random() < 0.65) _spawnGoldParticle(); }

    // Atakos fazių atnaujinimas
    if (_atkPhase.hero  > 0) _atkPhase.hero--;
    if (_atkPhase.enemy > 0) _atkPhase.enemy--;

    const busy = _dmgNums.length || _particles.length || _shakeFrames > 0
        || _flash.hero > 0 || _flash.enemy > 0 || _defeatAlpha > 0
        || _victoryFrames > 0 || _atkPhase.hero > 0 || _atkPhase.enemy > 0;

    if (!busy) {
        cancelAnimationFrame(_frameId); _frameId = null;
        const c = document.getElementById('battleCanvas');
        if (c && _hero && _enemy) _drawScene(c.getContext('2d'));
    }
}

// ── Scenos piešimas ──

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
    ctx.strokeStyle = '#f0a500'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, CANVAS_H - 50); ctx.lineTo(CANVAS_W, CANVAS_H - 50); ctx.stroke();

    // Žvakių glow
    [60, 340].forEach(x => {
        const g = ctx.createRadialGradient(x, CANVAS_H - 50, 0, x, CANVAS_H - 50, 30);
        g.addColorStop(0, 'rgba(240,165,0,0.3)'); g.addColorStop(1, 'rgba(240,165,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 30, CANVAS_H - 80, 60, 60);
    });

    const gy = CANVAS_H - 55;

    // Atakos šuolio ofsetai (sinusinis judėjimas)
    const heroOff  = _atkPhase.hero  > 0 ? Math.sin((1 - _atkPhase.hero  / 12) * Math.PI) * 20 : 0;
    const enemyOff = _atkPhase.enemy > 0 ? Math.sin((1 - _atkPhase.enemy / 12) * Math.PI) * 20 : 0;

    _renderUnit(ctx, _hero,  80  + heroOff,  gy,  1, 'hero');
    _renderUnit(ctx, _enemy, 320 - enemyOff, gy, -1, 'enemy');
}

function _renderUnit(ctx, unit, cx, gy, faceX, side) {
    ctx.globalAlpha = unit.hp > 0 ? 1 : 0.35;

    let topY;
    if (side === 'hero') {
        switch (unit.heroClass) {
            case 'mage':   topY = _drawMage(ctx, cx, gy, faceX, side);   break;
            case 'archer': topY = _drawArcher(ctx, cx, gy, faceX, side); break;
            default:       topY = _drawWarrior(ctx, cx, gy, faceX, side);
        }
    } else {
        switch (unit.name) {
            case 'Giant Rat':   topY = _drawGiantRat(ctx, cx, gy, faceX, side);  break;
            case 'Orc Warrior': topY = _drawOrc(ctx, cx, gy, faceX, side);       break;
            case 'Dark Mage':   topY = _drawDarkMage(ctx, cx, gy, faceX, side);  break;
            case 'Troll':       topY = _drawTroll(ctx, cx, gy, faceX, side);     break;
            case 'Dragon':      topY = _drawDragon(ctx, cx, gy, faceX, side);    break;
            default:            topY = _drawGoblin(ctx, cx, gy, faceX, side);
        }
    }

    _drawUnitBar(ctx, unit, cx, topY);
    ctx.globalAlpha = 1;
    if (_flash[side] > 0) _flash[side]--;
}

function _drawUnitBar(ctx, unit, cx, topY) {
    const barW = 56, barH = 6, barX = cx - barW / 2, barY = topY - 16;
    const pct  = Math.max(0, unit.hp / unit.maxHp);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1a0808'; ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = pct > 0.5 ? '#e63946' : pct > 0.25 ? '#f4a261' : '#ff0000';
    ctx.fillRect(barX, barY, barW * pct, barH);
    ctx.fillStyle = '#ddd'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(unit.name, cx, barY - 3);
}

// ══════════════════════════════
// ── HERO SPRITES ──
// ══════════════════════════════

function _drawWarrior(ctx, cx, gy, faceX, side) {
    const body = _fc(side, '#4a90d9');
    const dark = _fc(side, '#2c5f8a');
    const slvr = _fc(side, '#c0c0c0');
    const shld = _fc(side, '#78909c');
    const fl   = _flash[side] > 0;

    // Glow pod figūra
    const glow = ctx.createRadialGradient(cx, gy - 30, 0, cx, gy - 30, 38);
    glow.addColorStop(0, '#4a90d933'); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(cx - 40, gy - 68, 80, 68);

    // Kojos
    ctx.fillStyle = dark;
    ctx.fillRect(cx - 9, gy - 15, 8, 15);
    ctx.fillRect(cx + 1,  gy - 15, 8, 15);

    // Kūnas (torso)
    ctx.fillStyle = body;
    ctx.fillRect(cx - 11, gy - 46, 22, 31);

    // Šarvų detalės
    if (!fl) {
        ctx.fillStyle = dark;
        ctx.fillRect(cx - 11, gy - 41, 22, 7);  // krūtinės plokštelė
        ctx.fillRect(cx - 11, gy - 28, 22, 4);  // pilvo juosta
        ctx.strokeStyle = '#6ab4f5'; ctx.lineWidth = 1;
        ctx.strokeRect(cx - 8, gy - 39, 16, 5);
    }

    // Rankos
    ctx.fillStyle = body;
    ctx.fillRect(cx - 16, gy - 46, 5, 22);
    ctx.fillRect(cx + 11,  gy - 46, 5, 22);
    ctx.fillStyle = dark;
    ctx.fillRect(cx - 16, gy - 27, 5, 8); // pirštinė K
    ctx.fillRect(cx + 11,  gy - 27, 5, 8); // pirštinė D

    // Galva
    ctx.beginPath(); ctx.arc(cx, gy - 57, 11, 0, Math.PI * 2);
    ctx.fillStyle = body; ctx.fill();

    // Šalmo skydelis
    if (!fl) { ctx.fillStyle = dark; ctx.fillRect(cx - 9, gy - 61, 18, 5); }

    // Šalmo viršus (trikampis)
    ctx.beginPath();
    ctx.moveTo(cx - 12, gy - 68); ctx.lineTo(cx + 12, gy - 68); ctx.lineTo(cx, gy - 82);
    ctx.closePath(); ctx.fillStyle = dark; ctx.fill();

    // Skydas (priešinga pusė nuo veido)
    const sx = faceX > 0 ? cx - 23 : cx + 13;
    ctx.fillStyle = shld; ctx.fillRect(sx, gy - 44, 10, 20);
    if (!fl) { ctx.fillStyle = '#546e7a'; ctx.fillRect(sx + 3, gy - 38, 4, 10); }

    // Kardas (veido pusė)
    const swx = faceX > 0 ? cx + 13 : cx - 18;
    ctx.fillStyle = slvr; ctx.fillRect(swx, gy - 54, 5, 34);
    const cgx = faceX > 0 ? cx + 10 : cx - 21;
    ctx.fillStyle = dark; ctx.fillRect(cgx, gy - 47, 11, 4); // kryžmuo

    return gy - 82;
}

function _drawMage(ctx, cx, gy, faceX, side) {
    const robe  = _fc(side, '#8b5cf6');
    const dark  = _fc(side, '#6d28d9');
    const staff = _fc(side, '#fbbf24');
    const fl    = _flash[side] > 0;

    // Glow
    const glow = ctx.createRadialGradient(cx, gy - 35, 0, cx, gy - 35, 40);
    glow.addColorStop(0, '#8b5cf633'); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(cx - 42, gy - 75, 84, 75);

    // Apsiauto apačia (trikampis platėja žemyn)
    ctx.beginPath();
    ctx.moveTo(cx - 10, gy - 48);
    ctx.lineTo(cx + 10,  gy - 48);
    ctx.lineTo(cx + 18,  gy);
    ctx.lineTo(cx - 18,  gy);
    ctx.closePath();
    ctx.fillStyle = dark; ctx.fill();

    // Apsiautas (torso)
    ctx.beginPath();
    ctx.moveTo(cx - 13, gy - 50);
    ctx.lineTo(cx + 13,  gy - 50);
    ctx.lineTo(cx + 10,  gy - 16);
    ctx.lineTo(cx - 10,  gy - 16);
    ctx.closePath();
    ctx.fillStyle = robe; ctx.fill();

    // Rankovės (trikampiai šonuose)
    ctx.beginPath();
    ctx.moveTo(cx - 13, gy - 48);
    ctx.lineTo(cx - 24,  gy - 26);
    ctx.lineTo(cx - 10,  gy - 26);
    ctx.closePath();
    ctx.fillStyle = dark; ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 13, gy - 48);
    ctx.lineTo(cx + 24,  gy - 26);
    ctx.lineTo(cx + 10,  gy - 26);
    ctx.closePath();
    ctx.fillStyle = dark; ctx.fill();

    // Apsiauto juosta
    if (!fl) {
        ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - 12, gy - 40); ctx.lineTo(cx + 12, gy - 40); ctx.stroke();
    }

    // Galva
    ctx.beginPath(); ctx.arc(cx, gy - 60, 11, 0, Math.PI * 2);
    ctx.fillStyle = robe; ctx.fill();

    // Skrybėlė (aukštas trikampis)
    ctx.beginPath();
    ctx.moveTo(cx - 12, gy - 71);
    ctx.lineTo(cx + 12,  gy - 71);
    ctx.lineTo(cx,       gy - 94);
    ctx.closePath(); ctx.fillStyle = dark; ctx.fill();
    // Skrybėlės kraštinė
    if (!fl) {
        ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - 14, gy - 71); ctx.lineTo(cx + 14, gy - 71); ctx.stroke();
    }

    // Personalas (veido pusė)
    const stx = faceX > 0 ? cx + 18 : cx - 18;
    ctx.strokeStyle = staff; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(stx, gy); ctx.lineTo(stx, gy - 60); ctx.stroke();

    // Žvaigždė personalos viršuje
    if (!fl) { _drawStar(ctx, stx, gy - 65, 7, staff); }
    else {
        ctx.beginPath(); ctx.arc(stx, gy - 65, 5, 0, Math.PI * 2);
        ctx.fillStyle = staff; ctx.fill();
    }

    return gy - 94;
}

function _drawArcher(ctx, cx, gy, faceX, side) {
    const body  = _fc(side, '#10b981');
    const dark  = _fc(side, '#065f46');
    const bow   = _fc(side, '#92400e');
    const arrow = _fc(side, '#d97706');
    const fl    = _flash[side] > 0;

    // Glow
    const glow = ctx.createRadialGradient(cx, gy - 30, 0, cx, gy - 30, 36);
    glow.addColorStop(0, '#10b98133'); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(cx - 38, gy - 66, 76, 66);

    // Kojos
    ctx.fillStyle = dark;
    ctx.fillRect(cx - 8, gy - 14, 7, 14);
    ctx.fillRect(cx + 1,  gy - 14, 7, 14);

    // Kūnas
    ctx.fillStyle = body;
    ctx.fillRect(cx - 10, gy - 44, 20, 30);

    // Šarvų detalės
    if (!fl) {
        ctx.fillStyle = dark;
        ctx.fillRect(cx - 10, gy - 44, 20, 4);  // pečių juosta
        ctx.fillRect(cx - 10, gy - 28, 20, 3);  // diržas
        ctx.fillStyle = '#6ee7b7';
        ctx.fillRect(cx - 3,  gy - 26, 6, 2);   // sagtis
    }

    // Rankos
    ctx.fillStyle = body;
    ctx.fillRect(cx - 15, gy - 43, 5, 20);
    ctx.fillRect(cx + 10,  gy - 43, 5, 20);

    // Galva
    ctx.beginPath(); ctx.arc(cx, gy - 55, 10, 0, Math.PI * 2);
    ctx.fillStyle = body; ctx.fill();

    // Kepurė (pusapskritimis + kraštinė)
    ctx.beginPath(); ctx.arc(cx, gy - 63, 11, Math.PI, 0);
    ctx.fillStyle = dark; ctx.fill();
    if (!fl) {
        ctx.fillStyle = '#6ee7b7';
        ctx.fillRect(cx - 12, gy - 65, 24, 3); // kepurės kraštinė
    }

    // Lankas (priešinga pusė)
    const bx = faceX > 0 ? cx - 20 : cx + 20;
    const bcpx = faceX > 0 ? cx - 30 : cx + 30;
    ctx.strokeStyle = bow; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx, gy - 46);
    ctx.quadraticCurveTo(bcpx, gy - 28, bx, gy - 10);
    ctx.stroke();
    // Lanko styga
    ctx.strokeStyle = fl ? bow : '#d4a574'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx, gy - 46); ctx.lineTo(bx, gy - 10); ctx.stroke();

    // Strėlė (horizontali, veido kryptimi)
    const arwStart = faceX > 0 ? cx - 18 : cx - 8;
    const arwEnd   = faceX > 0 ? cx + 14 : cx - 40;
    ctx.strokeStyle = arrow; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(arwStart, gy - 28); ctx.lineTo(arwEnd, gy - 28); ctx.stroke();
    // Strėlgalis
    ctx.beginPath();
    ctx.moveTo(arwEnd, gy - 28);
    ctx.lineTo(arwEnd - faceX * 6, gy - 31);
    ctx.lineTo(arwEnd - faceX * 6, gy - 25);
    ctx.closePath(); ctx.fillStyle = dark; ctx.fill();

    return gy - 76;
}

// ══════════════════════════════
// ── ENEMY SPRITES ──
// ══════════════════════════════

function _drawGoblin(ctx, cx, gy, faceX, side) {
    const body = _fc(side, '#4ade80');
    const dark = _fc(side, '#16a34a');
    const fl   = _flash[side] > 0;

    // Glow
    const glow = ctx.createRadialGradient(cx, gy - 25, 0, cx, gy - 25, 28);
    glow.addColorStop(0, '#4ade8033'); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(cx - 30, gy - 53, 60, 53);

    // Kojos (mažytės)
    ctx.fillStyle = dark;
    ctx.fillRect(cx - 6, gy - 10, 5, 10);
    ctx.fillRect(cx + 1,  gy - 10, 5, 10);

    // Kūnas (mažas stačiakampis)
    ctx.fillStyle = body;
    ctx.fillRect(cx - 8, gy - 32, 16, 22);

    // Galva (didelė, apvali)
    ctx.beginPath(); ctx.arc(cx, gy - 42, 13, 0, Math.PI * 2);
    ctx.fillStyle = body; ctx.fill();

    // Didelės ausys (ovalai šonuose)
    if (!fl) {
        ctx.fillStyle = dark;
        // K ausis
        ctx.beginPath(); ctx.ellipse(cx - 17, gy - 42, 5, 9, -0.3, 0, Math.PI * 2); ctx.fill();
        // D ausis
        ctx.beginPath(); ctx.ellipse(cx + 17, gy - 42, 5, 9, 0.3, 0, Math.PI * 2); ctx.fill();
        // Vidinis ausies sluoksnis
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.ellipse(cx - 17, gy - 42, 3, 6, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 17, gy - 42, 3, 6, 0.3, 0, Math.PI * 2); ctx.fill();
        // Akys
        ctx.fillStyle = '#ff0000';
        ctx.beginPath(); ctx.arc(cx - 5, gy - 44, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 5, gy - 44, 2.5, 0, Math.PI * 2); ctx.fill();
        // Nosies skylutės
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.arc(cx - 2, gy - 40, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 2, gy - 40, 1, 0, Math.PI * 2); ctx.fill();
    }

    // Peilis
    const kx = faceX > 0 ? cx - 14 : cx + 9;
    ctx.fillStyle = _fc(side, '#94a3b8');
    ctx.fillRect(kx, gy - 26, 5, 16);

    return gy - 55;
}

function _drawGiantRat(ctx, cx, gy, faceX, side) {
    const body = _fc(side, '#9ca3af');
    const dark = _fc(side, '#4b5563');
    const fl   = _flash[side] > 0;

    // Glow
    const glow = ctx.createRadialGradient(cx, gy - 18, 0, cx, gy - 18, 28);
    glow.addColorStop(0, '#9ca3af33'); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(cx - 35, gy - 46, 70, 46);

    // Kūnas (ovalas, žemas)
    ctx.beginPath(); ctx.ellipse(cx - faceX * 4, gy - 18, 20, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = body; ctx.fill();

    // Galva (mažesnė, priekyje)
    const hx = cx + faceX * 14;
    ctx.beginPath(); ctx.arc(hx, gy - 20, 11, 0, Math.PI * 2);
    ctx.fillStyle = body; ctx.fill();

    // Ausys (viršuje)
    if (!fl) {
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.ellipse(hx - 5, gy - 31, 4, 6, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hx + 5, gy - 31, 4, 6, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.ellipse(hx - 5, gy - 31, 2.5, 4, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hx + 5, gy - 31, 2.5, 4, 0.2, 0, Math.PI * 2); ctx.fill();
        // Akys
        ctx.fillStyle = '#ff0000';
        ctx.beginPath(); ctx.arc(hx + faceX * 4, gy - 22, 2, 0, Math.PI * 2); ctx.fill();
        // Snukis
        ctx.fillStyle = '#d1d5db';
        ctx.beginPath(); ctx.ellipse(hx + faceX * 10, gy - 18, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
        // Ūsai
        ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(hx + faceX * 13, gy - 19); ctx.lineTo(hx + faceX * 22, gy - 22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx + faceX * 13, gy - 17); ctx.lineTo(hx + faceX * 22, gy - 14); ctx.stroke();
    }

    // Uodega (kreiva linija gale)
    const tx = cx - faceX * 22;
    ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(tx + faceX * 2, gy - 15);
    ctx.quadraticCurveTo(tx - faceX * 8, gy - 32, tx - faceX * 4, gy - 40);
    ctx.stroke();

    return gy - 42;
}

function _drawOrc(ctx, cx, gy, faceX, side) {
    const body = _fc(side, '#a16207');
    const dark = _fc(side, '#713f12');
    const bone = _fc(side, '#d4d4aa');
    const fl   = _flash[side] > 0;

    // Glow
    const glow = ctx.createRadialGradient(cx, gy - 35, 0, cx, gy - 35, 42);
    glow.addColorStop(0, '#a1620733'); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(cx - 44, gy - 77, 88, 77);

    // Kojos (storos)
    ctx.fillStyle = dark;
    ctx.fillRect(cx - 11, gy - 16, 10, 16);
    ctx.fillRect(cx + 1,   gy - 16, 10, 16);

    // Kūnas (platus)
    ctx.fillStyle = body;
    ctx.fillRect(cx - 14, gy - 50, 28, 34);

    // Šarvų detalės
    if (!fl) {
        ctx.fillStyle = dark;
        ctx.fillRect(cx - 14, gy - 50, 28, 6); // pečiai
        ctx.fillRect(cx - 14, gy - 32, 28, 5); // diržas
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(cx - 6,  gy - 30, 12, 3);
    }

    // Rankos (storos)
    ctx.fillStyle = body;
    ctx.fillRect(cx - 20, gy - 50, 6, 26);
    ctx.fillRect(cx + 14,  gy - 50, 6, 26);

    // Galva (didelė)
    ctx.beginPath(); ctx.arc(cx, gy - 62, 14, 0, Math.PI * 2);
    ctx.fillStyle = body; ctx.fill();

    // Kaukolės šalmas
    if (!fl) {
        ctx.fillStyle = bone;
        ctx.fillRect(cx - 14, gy - 76, 28, 18); // šalmo pagrindas
        // Kaukolės akiduobės
        ctx.fillStyle = '#1c1917';
        ctx.beginPath(); ctx.arc(cx - 6, gy - 68, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 6, gy - 68, 4, 0, Math.PI * 2); ctx.fill();
        // Kaukolės nosies skylutė
        ctx.beginPath(); ctx.moveTo(cx - 2, gy - 62); ctx.lineTo(cx, gy - 59); ctx.lineTo(cx + 2, gy - 62); ctx.closePath(); ctx.fill();
        // Žali orcų iltys (apatiniai)
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(cx - 6, gy - 52, 3, 5);
        ctx.fillRect(cx + 3, gy - 52, 3, 5);
    }

    // Kirvis (veido pusė)
    const ax = faceX > 0 ? cx + 16 : cx - 22;
    ctx.strokeStyle = _fc(side, '#6b7280'); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ax, gy); ctx.lineTo(ax, gy - 46); ctx.stroke();
    // Kirvio geležtė
    ctx.beginPath();
    ctx.moveTo(ax, gy - 42);
    ctx.lineTo(ax + faceX * 14, gy - 50);
    ctx.lineTo(ax + faceX * 14, gy - 34);
    ctx.closePath();
    ctx.fillStyle = _fc(side, '#94a3b8'); ctx.fill();

    return gy - 76;
}

function _drawDarkMage(ctx, cx, gy, faceX, side) {
    const robe = _fc(side, '#1f2937');
    const acc  = _fc(side, '#374151');
    const red  = _fc(side, '#ef4444');
    const fl   = _flash[side] > 0;

    // Glow (niūrus violetinis)
    const glow = ctx.createRadialGradient(cx, gy - 35, 0, cx, gy - 35, 42);
    glow.addColorStop(0, '#7c3aed33'); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(cx - 44, gy - 77, 88, 77);

    // Apsiautas (tamsus, platus)
    ctx.beginPath();
    ctx.moveTo(cx - 14, gy - 52);
    ctx.lineTo(cx + 14,  gy - 52);
    ctx.lineTo(cx + 22,  gy);
    ctx.lineTo(cx - 22,  gy);
    ctx.closePath(); ctx.fillStyle = robe; ctx.fill();

    // Rankovės
    ctx.beginPath();
    ctx.moveTo(cx - 14, gy - 50); ctx.lineTo(cx - 26, gy - 28); ctx.lineTo(cx - 10, gy - 28);
    ctx.closePath(); ctx.fillStyle = acc; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 14, gy - 50); ctx.lineTo(cx + 26, gy - 28); ctx.lineTo(cx + 10, gy - 28);
    ctx.closePath(); ctx.fillStyle = acc; ctx.fill();

    // Apsiausto ornamentai
    if (!fl) {
        ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, gy - 52); ctx.lineTo(cx, gy); ctx.stroke();
        ctx.strokeStyle = '#7c3aed';
        ctx.beginPath(); ctx.moveTo(cx - 14, gy - 40); ctx.lineTo(cx + 14, gy - 40); ctx.stroke();
    }

    // Kapišonas (tamsus, dengiantis galvą)
    ctx.beginPath(); ctx.arc(cx, gy - 62, 13, 0, Math.PI * 2);
    ctx.fillStyle = acc; ctx.fill();
    // Kapišono smailė
    ctx.beginPath();
    ctx.moveTo(cx - 14, gy - 68);
    ctx.lineTo(cx + 14,  gy - 68);
    ctx.lineTo(cx,       gy - 90);
    ctx.closePath(); ctx.fillStyle = robe; ctx.fill();

    // Raudonos akys (blizgančios)
    if (!fl) {
        ctx.fillStyle = red;
        ctx.shadowColor = red; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(cx - 5, gy - 64, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 5, gy - 64, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Personalas su raudonu orbu
    const stx = faceX > 0 ? cx + 20 : cx - 20;
    ctx.strokeStyle = _fc(side, '#4b5563'); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(stx, gy); ctx.lineTo(stx, gy - 58); ctx.stroke();

    ctx.fillStyle = red;
    if (!fl) { ctx.shadowColor = red; ctx.shadowBlur = 10; }
    ctx.beginPath(); ctx.arc(stx, gy - 62, 6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    return gy - 90;
}

function _drawTroll(ctx, cx, gy, faceX, side) {
    const body = _fc(side, '#6b7280');
    const dark = _fc(side, '#374151');
    const fl   = _flash[side] > 0;

    // Glow
    const glow = ctx.createRadialGradient(cx, gy - 38, 0, cx, gy - 38, 48);
    glow.addColorStop(0, '#6b728033'); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(cx - 50, gy - 86, 100, 86);

    // Kojos (labai storos)
    ctx.fillStyle = dark;
    ctx.fillRect(cx - 13, gy - 18, 11, 18);
    ctx.fillRect(cx + 2,   gy - 18, 11, 18);

    // Kūnas (labai platus, didelis)
    ctx.fillStyle = body;
    ctx.fillRect(cx - 16, gy - 58, 32, 40);

    // Kūno faktūra (raukšlės)
    if (!fl) {
        ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - 10, gy - 50); ctx.lineTo(cx - 10, gy - 24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 10,  gy - 50); ctx.lineTo(cx + 10,  gy - 24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 14, gy - 38); ctx.lineTo(cx + 14, gy - 38); ctx.stroke();
    }

    // Rankos (milžiniškos)
    ctx.fillStyle = body;
    ctx.fillRect(cx - 26, gy - 58, 10, 32);
    ctx.fillRect(cx + 16,  gy - 58, 10, 32);

    // Galva (masyvus blokinis form)
    ctx.fillStyle = body;
    ctx.fillRect(cx - 16, gy - 80, 32, 24);

    // Veido bruožai
    if (!fl) {
        ctx.fillStyle = dark;
        // Antakiai
        ctx.fillRect(cx - 13, gy - 74, 10, 4);
        ctx.fillRect(cx + 3,   gy - 74, 10, 4);
        // Akys
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.arc(cx - 7, gy - 70, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 7, gy - 70, 3, 0, Math.PI * 2); ctx.fill();
        // Burna (plati)
        ctx.strokeStyle = dark; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - 8, gy - 62); ctx.lineTo(cx + 8, gy - 62); ctx.stroke();
        // Iltys
        ctx.fillStyle = '#f5f5f4';
        ctx.fillRect(cx - 8, gy - 62, 4, 5);
        ctx.fillRect(cx + 4,  gy - 62, 4, 5);
    }

    // Kuoka (veido pusė)
    const clx = faceX > 0 ? cx + 18 : cx - 24;
    ctx.strokeStyle = _fc(side, '#78350f'); ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(clx, gy); ctx.lineTo(clx, gy - 50); ctx.stroke();
    ctx.lineCap = 'butt';
    // Kuokos galva (apvali)
    ctx.beginPath(); ctx.arc(clx, gy - 52, 9, 0, Math.PI * 2);
    ctx.fillStyle = _fc(side, '#92400e'); ctx.fill();
    if (!fl) {
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(clx, gy - 52, 9, 0, Math.PI * 2); ctx.stroke();
    }

    return gy - 86;
}

function _drawDragon(ctx, cx, gy, faceX, side) {
    const body  = _fc(side, '#ef4444');
    const dark  = _fc(side, '#991b1b');
    const scale = _fc(side, '#dc2626');
    const fl    = _flash[side] > 0;

    // Glow (raudonas)
    const glow = ctx.createRadialGradient(cx, gy - 40, 0, cx, gy - 40, 55);
    glow.addColorStop(0, '#ef444444'); glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(cx - 58, gy - 95, 116, 95);

    // Sparnai (du trikampiai, aukštyn)
    ctx.fillStyle = dark;
    // K sparnas
    ctx.beginPath();
    ctx.moveTo(cx - 10, gy - 60);
    ctx.lineTo(cx - 48,  gy - 95);
    ctx.lineTo(cx - 48,  gy - 40);
    ctx.closePath(); ctx.fill();
    // D sparnas
    ctx.beginPath();
    ctx.moveTo(cx + 10, gy - 60);
    ctx.lineTo(cx + 48,  gy - 95);
    ctx.lineTo(cx + 48,  gy - 40);
    ctx.closePath(); ctx.fill();

    // Sparnų vidus
    if (!fl) {
        ctx.fillStyle = '#7f1d1d88';
        ctx.beginPath();
        ctx.moveTo(cx - 12, gy - 58); ctx.lineTo(cx - 40, gy - 88); ctx.lineTo(cx - 40, gy - 44);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 12, gy - 58); ctx.lineTo(cx + 40, gy - 88); ctx.lineTo(cx + 40, gy - 44);
        ctx.closePath(); ctx.fill();
    }

    // Kūnas (stambus ovalas)
    ctx.beginPath(); ctx.ellipse(cx, gy - 38, 18, 28, 0, 0, Math.PI * 2);
    ctx.fillStyle = body; ctx.fill();

    // Žvynai
    if (!fl) {
        ctx.strokeStyle = dark; ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(cx, gy - 26 - i * 10, 12 - i * 1.5, 0.3, Math.PI - 0.3);
            ctx.stroke();
        }
    }

    // Galva
    ctx.beginPath(); ctx.arc(cx + faceX * 12, gy - 62, 14, 0, Math.PI * 2);
    ctx.fillStyle = body; ctx.fill();

    // Snukis
    const mx = cx + faceX * 24;
    ctx.beginPath(); ctx.ellipse(mx, gy - 60, 8, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = dark; ctx.fill();

    // Akis
    if (!fl) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.arc(cx + faceX * 8, gy - 66, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1c1917';
        ctx.beginPath(); ctx.arc(cx + faceX * 9, gy - 66, 2, 0, Math.PI * 2); ctx.fill();
        // Ragų poros
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(cx + faceX * 4,  gy - 76);
        ctx.lineTo(cx + faceX * 2,  gy - 90);
        ctx.lineTo(cx + faceX * 10, gy - 76);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + faceX * 12, gy - 76);
        ctx.lineTo(cx + faceX * 10, gy - 88);
        ctx.lineTo(cx + faceX * 18, gy - 76);
        ctx.closePath(); ctx.fill();
        // Uodega (garbanota linija)
        ctx.strokeStyle = dark; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - faceX * 16, gy - 20);
        ctx.quadraticCurveTo(cx - faceX * 38, gy, cx - faceX * 32, gy - 24);
        ctx.stroke();
        ctx.lineCap = 'butt';
    }

    return gy - 95;
}

// ── Žvaigždė (4 taškai) ──
function _drawStar(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        const len = i % 2 === 0 ? r : r * 0.4;
        i === 0 ? ctx.moveTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len)
                : ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
}

// ══════════════════════════════
// ── EFEKTAI (nepakeisti) ──
// ══════════════════════════════

function _renderDmgNums(ctx) {
    _dmgNums.forEach(d => {
        ctx.save();
        ctx.globalAlpha = d.alpha; ctx.fillStyle = d.color;
        ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
        ctx.shadowColor = d.color; ctx.shadowBlur = 12;
        ctx.fillText(d.text, d.x, d.y);
        ctx.restore();
    });
}

function _stepDmgNums() {
    for (let i = _dmgNums.length - 1; i >= 0; i--) {
        const d = _dmgNums[i];
        d.y += d.vy; d.vy *= 0.97; d.alpha -= 0.022;
        if (d.alpha <= 0) _dmgNums.splice(i, 1);
    }
}

function _spawnGoldParticle() {
    const cols = ['#f0a500', '#ffd166', '#ffffff', '#ffe066', '#ffa500'];
    _particles.push({
        x: Math.random() * CANVAS_W, y: -6,
        vx: (Math.random() - 0.5) * 1.8, vy: Math.random() * 1.5 + 0.3,
        alpha: 0.95, color: cols[Math.floor(Math.random() * cols.length)],
        r: Math.random() * 3 + 1,
    });
}

function _renderParticles(ctx) {
    _particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 7;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    });
}

function _stepParticles() {
    for (let i = _particles.length - 1; i >= 0; i--) {
        const p = _particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.alpha -= 0.009;
        if (p.alpha <= 0) _particles.splice(i, 1);
    }
}

function _renderDefeat(ctx) {
    if (_defeatAlpha <= 0) return;
    ctx.fillStyle = `rgba(0,0,0,${Math.min(_defeatAlpha, 0.65)})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function _stepDefeat() {
    if (_defeatAlpha > 0 && _defeatAlpha < 0.65) _defeatAlpha += 0.004;
}
