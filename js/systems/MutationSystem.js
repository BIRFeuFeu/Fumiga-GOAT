/**
 * js/systems/MutationSystem.js — As 3 Cartas Genéticas  [TDD §6.1 / GDD §8]
 * ---------------------------------------------------------------------------
 * Lê o banco de dados (assets/data/mutations.json) e sorteia 3 cartas por
 * roleta com pesos. A raridade sorteada depende da Sorte do jogador.
 * `applyTo(mods, mutation)` aplica a matemática sobre o objeto de modificadores
 * da Run (GameManager.runMods). Formigas já vivas são atualizadas pela cena
 * via evento `mutationApplied` (GDD: Group.getChildren().forEach(...)).
 * ---------------------------------------------------------------------------
 */
export class MutationSystem {
    constructor(data) {
        this.rarities = data.rarities || {};
        this.mutations = data.mutations || [];
    }

    /** Cria um objeto de modificadores "virgem". */
    static freshMods() {
        return {
            damage: 1,
            speed: 1,
            hp: 1,
            armor: 0,
            armorAdd: 0,
            flags: {}
        };
    }

    /** Sorteia uma raridade pela roleta de pesos (luck desloca p/ cima). */
    rollRarity(luck = 0, rng = Math.random) {
        const entries = Object.entries(this.rarities).map(([id, r]) => ({
            id,
            weight: r.weight * (id === 'comum' ? 1 : 1 + luck) // sorte eleva as raras
        }));
        const total = entries.reduce((a, e) => a + e.weight, 0);
        let roll = rng() * total;
        for (const e of entries) {
            roll -= e.weight;
            if (roll <= 0) return e.id;
        }
        return entries[0].id;
    }

    /**
     * Sorteia `count` cartas (padrão 3, GDD). Evita duplicar ids quando possível.
     * Retorna array de objetos { ...mutation, rarityColor }.
     */
    rollMutations(luck = 0, count = 3, rng = Math.random) {
        // [D-02] filtra gigantismo só stage>=2
        let pool = [...this.mutations];
        try {
            const stage = (typeof GameManager !== 'undefined' && GameManager.biome() && GameManager.biome().stage) || 0;
            if (stage < 2) pool = pool.filter(m => m.id !== 'gigantismo');
        } catch {}
        const out = [];
        for (let i = 0; i < count; i++) {
            const rarity = this.rollRarity(luck, rng);
            let candidates = pool.filter((m) => m.rarity === rarity);
            if (candidates.length === 0) {
                candidates = pool.filter((m) => !out.find((o) => o.id === m.id));
            }
            if (candidates.length === 0) candidates = pool.length ? pool : this.mutations;
            const pick = candidates[Math.floor(rng() * candidates.length)];
            const idx = pool.indexOf(pick);
            if (idx >= 0) pool.splice(idx, 1);
            out.push({ ...pick, rarityColor: (this.rarities[pick.rarity] || {}).color || '#fff' });
        }
        return out;
    }

    /** Aplica a matemática de uma mutação sobre `mods` (mutação in-place + retorno). */
    static applyTo(mods, mutation) {
        const e = mutation.effect;
        if (!e) return mods;
        const applyOne = (stat, mult, add) => {
            if (mult) mods[stat] = (mods[stat] ?? 1) * mult;
            if (add) mods[stat] = (mods[stat] ?? 0) + add;
        };
        if (e.type === 'stat') applyOne(e.stat, e.mult, e.add);
        else if (e.type === 'multi') for (const s of e.stats) applyOne(s.stat, s.mult, s.add);
        else if (e.type === 'flag') mods.flags[e.flag] = (mods.flags[e.flag] || 0) + (e.value || 1);
        return mods;
    }

    applyMutation(mods, mutationId) {
        const m = this.mutations.find((x) => x.id === mutationId);
        if (!m) return mods;
        return MutationSystem.applyTo(mods, m);
    }
}
