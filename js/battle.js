// ── Priešų duomenų bazė ──
const ENEMIES = [
    {
        name:       'Goblin',
        emoji:      '👺',
        hp:         50,
        atk:        8,
        def:        3,
        minLevel:   1,
        xpReward:   40,
        goldReward: 15,
        isBoss:     false,
    },
    {
        name:       'Giant Rat',
        emoji:      '🐀',
        hp:         35,
        atk:        6,
        def:        1,
        minLevel:   1,
        xpReward:   30,
        goldReward: 10,
        isBoss:     false,
        ability:    'doubleAttack', // atakuoja du kartus per turą
    },
    {
        name:       'Orc Warrior',
        emoji:      '👹',
        hp:         90,
        atk:        14,
        def:        6,
        minLevel:   2,
        xpReward:   70,
        goldReward: 25,
        isBoss:     false,
    },
    {
        name:       'Dark Mage',
        emoji:      '🧙',
        hp:         60,
        atk:        20,
        def:        2,
        minLevel:   2,
        xpReward:   80,
        goldReward: 30,
        isBoss:     false,
        ability:    'spellBlast', // kas 3 turą - 2x žala
    },
    {
        name:       'Troll',
        emoji:      '🧌',
        hp:         150,
        atk:        18,
        def:        10,
        minLevel:   3,
        xpReward:   120,
        goldReward: 50,
        isBoss:     false,
    },
    {
        name:       'Dragon',
        emoji:      '🐉',
        hp:         300,
        atk:        35,
        def:        15,
        minLevel:   4,
        xpReward:   400,
        goldReward: 200,
        isBoss:     true,
        ability:    'fireBreath', // kas 4 turą - 3x žala
    },
];

// Sukuria priešo kovinį objektą iš šablono
function _buildEnemy(template, heroLevel) {
    // Stats šiek tiek auga kartu su hero lygiu
    const scale = 1 + (heroLevel - template.minLevel) * 0.15;
    return {
        name:       template.name,
        emoji:      template.emoji,
        maxHp:      Math.round(template.hp * scale),
        hp:         Math.round(template.hp * scale),
        atk:        Math.round(template.atk * scale),
        def:        Math.round(template.def * scale),
        level:      heroLevel,
        xpReward:   template.xpReward,
        goldReward: template.goldReward,
        isBoss:     template.isBoss,
        ability:    template.ability || null,
    };
}

// Pagal hero lygį parenka tinkamą priešą:
// 20% tikimybė gauti bosą (Dragon tik nuo 4 lygio)
function createEnemy(heroLevel) {
    const available = ENEMIES.filter(e => !e.isBoss && e.minLevel <= heroLevel);
    const bosses    = ENEMIES.filter(e => e.isBoss  && e.minLevel <= heroLevel);

    const rollBoss = bosses.length > 0 && Math.random() < 0.20;

    if (rollBoss) {
        const boss = bosses[Math.floor(Math.random() * bosses.length)];
        return _buildEnemy(boss, heroLevel);
    }

    const pick = available[Math.floor(Math.random() * available.length)];
    return _buildEnemy(pick, heroLevel);
}

// ── Battle klasė ──

class Battle {
    constructor(hero, enemy) {
        this.hero  = hero;
        this.enemy = enemy;
        this.turn  = 1;
    }

    // Žalos skaičiavimas: bazė = atk - def, +/- 20% atsitiktinumas, min 1
    calculateDamage(attacker, defender, multiplier = 1) {
        const base     = Math.max(1, attacker.atk - defender.def);
        const variance = base * 0.2;
        const roll     = Math.round(base + (Math.random() * variance * 2) - variance);
        return Math.max(1, Math.round(roll * multiplier));
    }

    // Hero smūgiuoja priešą
    heroAttack() {
        const damage = this.calculateDamage(this.hero, this.enemy);
        this.enemy.hp = Math.max(0, this.enemy.hp - damage);
        return {
            damage,
            message: `${this.hero.name} smogė ${this.enemy.name} ir padarė ${damage} žalos. (${this.enemy.hp}/${this.enemy.maxHp} HP)`,
        };
    }

    // Priešo standartinis smūgis
    _singleEnemyAttack(multiplier = 1) {
        const damage = this.calculateDamage(this.enemy, this.hero, multiplier);
        this.hero.hp = Math.max(0, this.hero.hp - damage);
        return damage;
    }

    // Priešo ataka - taikosi specialūs gebėjimai
    enemyAttack() {
        const events = [];
        const ability = this.enemy.ability;

        if (ability === 'doubleAttack') {
            // Giant Rat: du smūgiai per turą
            const d1 = this._singleEnemyAttack();
            const d2 = this._singleEnemyAttack();
            events.push({
                damage:  d1,
                message: `${this.enemy.emoji} ${this.enemy.name} smogė du kartus! (${d1} + ${d2} žalos). Hero HP: ${this.hero.hp}/${this.hero.maxHp}`,
            });
            // Grąžiname suvestinę žalą UI animacijai
            events[0].damage = d1 + d2;

        } else if (ability === 'spellBlast' && this.turn % 3 === 0) {
            // Dark Mage: kas 3 turą - 2x žala
            const damage = this._singleEnemyAttack(2);
            events.push({
                damage,
                message: `✨ ${this.enemy.emoji} ${this.enemy.name} paleido Spell Blast! ${damage} žalos! Hero HP: ${this.hero.hp}/${this.hero.maxHp}`,
            });

        } else if (ability === 'fireBreath' && this.turn % 4 === 0) {
            // Dragon: kas 4 turą - 3x žala
            const damage = this._singleEnemyAttack(3);
            events.push({
                damage,
                message: `🔥 ${this.enemy.emoji} ${this.enemy.name} naudoja Fire Breath! ${damage} žalos! Hero HP: ${this.hero.hp}/${this.hero.maxHp}`,
            });

        } else {
            // Standartinis smūgis
            const damage = this._singleEnemyAttack();
            events.push({
                damage,
                message: `${this.enemy.emoji} ${this.enemy.name} smogė ${this.hero.name} ir padarė ${damage} žalos. (${this.hero.hp}/${this.hero.maxHp} HP)`,
            });
        }

        return events[0];
    }

    // Vykdo vieną ėjimą; grąžina log su damage info UI efektams
    nextTurn() {
        const log = { turn: this.turn, events: [] };

        const heroResult = this.heroAttack();
        log.events.push({ message: heroResult.message, damage: heroResult.damage, side: 'hero' });

        if (this.enemy.hp > 0) {
            const enemyResult = this.enemyAttack();
            log.events.push({ message: enemyResult.message, damage: enemyResult.damage, side: 'enemy' });
        }

        this.turn++;
        return log;
    }

    // Tikrina ar kova baigėsi
    isOver() {
        if (!this.hero.isAlive())  return { over: true, winner: 'enemy' };
        if (this.enemy.hp <= 0)   return { over: true, winner: 'hero'  };
        return { over: false, winner: null };
    }
}

if (typeof module !== 'undefined') module.exports = { Battle, createEnemy };
