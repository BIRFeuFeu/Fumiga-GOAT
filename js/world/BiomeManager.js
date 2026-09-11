/**
 * js/world/BiomeManager.js — Os 15 biomas + rotas de migração + Arena [GDD §7]
 * ---------------------------------------------------------------------------
 * Progressão em rede: o jogador escolhe a rota ao vencer o Chefe de um bioma.
 * Estágio 1 -> Estágio 2 -> Estágio 3 -> Arena Fixa (A Primeira Rainha).
 * Cada bioma define terreno, inimigos, chefe, efeito de perigo e paleta de luz.
 * ---------------------------------------------------------------------------
 */
export const BIOMES = {
    bosque_umido: { name: 'Bosque Úmido', stage: 1, terrain: { rock: 0.05, hazard: 0.04 }, effect: 'none', enemies: ['centipede', 'beetle'], boss: 'wolf_spider', light: '#7ad26a', fog: '#0d1408' },
    prado_fogo: { name: 'Prado de Fogo', stage: 1, terrain: { rock: 0.06, hazard: 0.1 }, effect: 'burn', enemies: ['ant', 'beetle'], boss: 'bombardier', light: '#ff7a2a', fog: '#180a04' },
    deserto_escaldante: { name: 'Deserto Escaldante', stage: 1, terrain: { rock: 0.08, hazard: 0.12 }, effect: 'sand', enemies: ['scorpion', 'termite'], boss: 'bombardier', light: '#ffd07a', fog: '#181004' },
    pantano_toxico: { name: 'Pântano Tóxico', stage: 1, terrain: { rock: 0.05, hazard: 0.14 }, effect: 'poison', enemies: ['fly', 'centipede'], boss: 'putrid_centipede', light: '#9dff3c', fog: '#0a1204' },
    cemiterio_troncos: { name: 'Cemitério de Troncos', stage: 1, terrain: { rock: 0.14, hazard: 0.06 }, effect: 'hardrock', enemies: ['termite', 'beetle'], boss: 'wolf_spider', light: '#c8a05a', fog: '#120c06' },

    floresta_fungos: { name: 'Floresta de Fungos', stage: 2, terrain: { rock: 0.06, hazard: 0.1 }, effect: 'zombie', enemies: ['fly', 'ant', 'centipede'], boss: 'putrid_centipede', light: '#b44ad2', fog: '#120618' },
    cavernas_cristal: { name: 'Cavernas de Cristal', stage: 2, terrain: { rock: 0.22, hazard: 0.08 }, effect: 'hardrock', enemies: ['spiderling', 'scorpion'], boss: 'bombardier', light: '#7ad2ff', fog: '#041018' },
    tundra_congelada: { name: 'Tundra Congelada', stage: 2, terrain: { rock: 0.08, hazard: 0.1 }, effect: 'slow', enemies: ['moth', 'fly'], boss: 'wolf_spider', light: '#dff2ff', fog: '#081018' },
    oasis_carnivoro: { name: 'Oásis Carnívoro', stage: 2, terrain: { rock: 0.06, hazard: 0.14 }, effect: 'flora', enemies: ['plant', 'centipede'], boss: 'putrid_centipede', light: '#c82a5a', fog: '#12040a' },
    jardim_flutuante: { name: 'Jardim Flutuante', stage: 2, terrain: { rock: 0.05, hazard: 0.06, water: 0.5 }, effect: 'none', enemies: ['fly', 'moth'], boss: 'wolf_spider', light: '#2a7ad2', fog: '#040a12' },

    abismo_bioluminescente: { name: 'Abismo Bioluminescente', stage: 3, terrain: { rock: 0.1, hazard: 0.08 }, effect: 'dark', enemies: ['centipede', 'spiderling'], boss: 'putrid_centipede', light: '#4affe0', fog: '#020208' },
    vale_ossos: { name: 'Vale de Ossos', stage: 3, terrain: { rock: 0.1, hazard: 0.12 }, effect: 'hoard', enemies: ['termite', 'scorpion', 'beetle'], boss: 'putrid_centipede', light: '#d8d2b8', fog: '#100e08' },
    fosso_teias: { name: 'Fosso das Teias Infinitas', stage: 3, terrain: { rock: 0.08, hazard: 0.16 }, effect: 'slow', enemies: ['spiderling', 'ant'], boss: 'wolf_spider', light: '#e8e8f0', fog: '#0c0c10' },
    canyon_geleia: { name: 'Cânion de Geleia Real', stage: 3, terrain: { rock: 0.08, hazard: 0.14 }, effect: 'mutation', enemies: ['ant', 'beetle'], boss: 'bombardier', light: '#ffc832', fog: '#140c02' },
    prisao_ambar: { name: 'Prisão de Âmbar', stage: 3, terrain: { rock: 0.12, hazard: 0.14 }, effect: 'slow', enemies: ['fly', 'termite'], boss: 'bombardier', light: '#ffae1e', fog: '#140e02' },

    nucleo_primordial: { name: 'O Núcleo Primordial', stage: 4, terrain: { rock: 0.1, hazard: 0.08 }, effect: 'arena', enemies: ['ant', 'spiderling', 'centipede'], boss: 'first_queen', light: '#fff3b0', fog: '#0a0608' }
};

export class BiomeManager {
    static byId(id) {
        return BIOMES[id];
    }
    static stage(id) {
        return BIOMES[id].stage;
    }
    static ofStage(stage) {
        return Object.entries(BIOMES)
            .filter(([, b]) => b.stage === stage)
            .map(([id]) => id);
    }
    /** Rotas de migração: a partir do estágio atual, escolhe o próximo. */
    static nextChoices(currentId) {
        const stage = BIOMES[currentId].stage;
        if (stage >= 3) return ['nucleo_primordial'];
        return BiomeManager.ofStage(stage + 1);
    }
    static isFinal(id) {
        return id === 'nucleo_primordial';
    }
    /** Dificuldade crescente por estágio (multiplica HP/dano de inimigos). */
    static difficulty(id) {
        return 1 + (BIOMES[id].stage - 1) * 0.45;
    }
}
