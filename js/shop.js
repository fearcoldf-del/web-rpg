// ── Parduotuvės prekės ──
const SHOP_ITEMS = {
    healthPotion: {
        name:   'Gydymo eliksyras',
        cost:   50,
        effect: 'heal',
        value:  50,
        emoji:  '🧪',
        desc:   'Atgauna 50 HP',
    },
    swordUpgrade: {
        name:   'Kardo galandimas',
        cost:   150,
        effect: 'atkBoost',
        value:  5,
        emoji:  '⚔️',
        desc:   'Padidina ATK +5 (nuolat)',
    },
    shieldUpgrade: {
        name:   'Skydo sustiprinimas',
        cost:   150,
        effect: 'defBoost',
        value:  3,
        emoji:  '🛡️',
        desc:   'Padidina DEF +3 (nuolat)',
    },
    elixirOfLife: {
        name:   'Gyvybės eliksyras',
        cost:   300,
        effect: 'maxHpBoost',
        value:  30,
        emoji:  '💎',
        desc:   'Padidina max HP +30 ir atgauna HP',
    },
};

// Perka prekę: patikrina gold, pritaiko efektą
// Grąžina { success: bool, message: string }
function buyItem(hero, itemId) {
    const item = SHOP_ITEMS[itemId];
    if (!item) return { success: false, message: 'Nežinoma prekė.' };

    if (hero.gold < item.cost) {
        return {
            success: false,
            message: `Nepakanka gold! Reikia ${item.cost}, turi ${hero.gold}.`,
        };
    }

    hero.gold -= item.cost;

    switch (item.effect) {
        case 'heal':
            hero.hp = Math.min(hero.maxHp, hero.hp + item.value);
            break;
        case 'atkBoost':
            hero.atk += item.value;
            break;
        case 'defBoost':
            hero.def += item.value;
            break;
        case 'maxHpBoost':
            hero.maxHp += item.value;
            hero.hp     = Math.min(hero.hp + item.value, hero.maxHp);
            break;
    }

    return {
        success: true,
        message: `${item.emoji} ${item.name} nupirkta! Likę gold: ${hero.gold}.`,
    };
}

// Generuoja shop modal'o turinio HTML
function getShopHTML(hero) {
    const rows = Object.entries(SHOP_ITEMS).map(([id, item]) => {
        const canAfford = hero.gold >= item.cost;
        return `
        <div class="shop-item ${canAfford ? '' : 'shop-item--poor'}">
            <span class="shop-emoji">${item.emoji}</span>
            <div class="shop-info">
                <span class="shop-name">${item.name}</span>
                <span class="shop-desc">${item.desc}</span>
            </div>
            <div class="shop-right">
                <span class="shop-cost">💰 ${item.cost}</span>
                <button class="btn btn-shop"
                    data-item="${id}"
                    ${canAfford ? '' : 'disabled'}>
                    Pirkti
                </button>
            </div>
        </div>`;
    }).join('');

    return `
        <div class="shop-gold-bar">Tavo gold: <strong>💰 ${hero.gold}</strong></div>
        <div class="shop-list">${rows}</div>
    `;
}
