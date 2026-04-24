// Pradiniai stats pagal klasę
const CLASS_STATS = {
    warrior: { hp: 120, atk: 15, def: 10 },
    mage:    { hp: 80,  atk: 25, def: 5  },
    archer:  { hp: 100, atk: 20, def: 7  },
};

// XP reikalingas kitam lygiui
const xpToNextLevel = (level) => level * 100;

class Hero {
    constructor(name, heroClass) {
        if (!CLASS_STATS[heroClass]) {
            throw new Error(`Nežinoma klasė: ${heroClass}`);
        }

        this.name     = name;
        this.heroClass = heroClass;
        this.level    = 1;
        this.xp       = 0;
        this.gold     = 0;

        const base    = CLASS_STATS[heroClass];
        this.maxHp    = base.hp;
        this.hp       = base.hp;
        this.atk      = base.atk;
        this.def      = base.def;
    }

    // Prideda XP; jei surinkta pakankamai - kyla lygis
    gainXP(amount) {
        this.xp += amount;
        while (this.xp >= xpToNextLevel(this.level)) {
            this.xp -= xpToNextLevel(this.level);
            this.levelUp();
        }
    }

    // Padidina stats ir atnaujina HP
    levelUp() {
        this.level++;
        this.maxHp += 20;
        this.hp     = this.maxHp;
        this.atk   += 5;
        this.def   += 3;
        console.log(`${this.name} pasiekė ${this.level} lygį! HP: ${this.maxHp}, ATK: ${this.atk}, DEF: ${this.def}`);
    }

    // Grąžina true jei herojus gyvas
    isAlive() {
        return this.hp > 0;
    }
}

if (typeof module !== 'undefined') module.exports = Hero;
