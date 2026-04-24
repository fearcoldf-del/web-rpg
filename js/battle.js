// Priešų vardai pagal lygį
const ENEMY_NAMES = ['Goblin', 'Skeleton', 'Orc', 'Troll', 'Dark Knight'];

// Sukuria NPC priešą pagal herojaus lygį
function createEnemy(level) {
    const nameIndex = Math.min(level - 1, ENEMY_NAMES.length - 1);
    return {
        name:  ENEMY_NAMES[nameIndex],
        maxHp: 50 + (level - 1) * 20,
        hp:    50 + (level - 1) * 20,
        atk:   8  + (level - 1) * 4,
        def:   3  + (level - 1) * 2,
    };
}

class Battle {
    constructor(hero, enemy) {
        this.hero  = hero;
        this.enemy = enemy;
        this.turn  = 1;
    }

    // Skaičiuoja žalą: bazė = atk - def, +/- 20% atsitiktinumas, min 1
    calculateDamage(attacker, defender) {
        const base      = Math.max(1, attacker.atk - defender.def);
        const variance  = base * 0.2;
        const damage    = Math.round(base + (Math.random() * variance * 2) - variance);
        return Math.max(1, damage);
    }

    // Hero atakuoja priešą
    heroAttack() {
        const damage = this.calculateDamage(this.hero, this.enemy);
        this.enemy.hp = Math.max(0, this.enemy.hp - damage);
        return {
            damage,
            message: `${this.hero.name} smogė ${this.enemy.name} ir padarė ${damage} žalos. (${this.enemy.hp}/${this.enemy.maxHp} HP)`,
        };
    }

    // Priešas atakuoja hero
    enemyAttack() {
        const damage = this.calculateDamage(this.enemy, this.hero);
        this.hero.hp = Math.max(0, this.hero.hp - damage);
        return {
            damage,
            message: `${this.enemy.name} smogė ${this.hero.name} ir padarė ${damage} žalos. (${this.hero.hp}/${this.hero.maxHp} HP)`,
        };
    }

    // Vykdo vieną ėjimą: hero atakuoja, paskui priešas (jei dar gyvas)
    nextTurn() {
        const log = { turn: this.turn, events: [] };

        const heroResult = this.heroAttack();
        log.events.push(heroResult.message);

        if (this.enemy.hp > 0) {
            const enemyResult = this.enemyAttack();
            log.events.push(enemyResult.message);
        }

        this.turn++;
        return log;
    }

    // Tikrina ar kova baigėsi
    isOver() {
        if (!this.hero.isAlive()) {
            return { over: true, winner: 'enemy' };
        }
        if (this.enemy.hp <= 0) {
            return { over: true, winner: 'hero' };
        }
        return { over: false, winner: null };
    }
}

if (typeof module !== 'undefined') module.exports = { Battle, createEnemy };
