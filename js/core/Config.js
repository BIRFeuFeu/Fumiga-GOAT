/**
 * js/core/Config.js — Constantes globais compartilhadas (beta).
 * ---------------------------------------------------------------------------
 * TILE: tamanho do grid em pixels (sprite sheets usam 16).
 * As demais tabelas de balanceamento vivem nos módulos donos (RoomBuilder,
 * entidades), mas este arquivo centraliza o que é lido por vários sistemas.
 * ---------------------------------------------------------------------------
 */
export const TILE = 16;

/** Custo de Biomassa e stats base das classes de formiga (GDD §6). */
export const ANT_CLASSES = {
    worker:    { cost: 10, hp: 30,  speed: 55, damage: 0,  armor: 0,  range: 0, sprite: 'ant_worker' },
    collector: { cost: 15, hp: 26,  speed: 60, damage: 0,  armor: 0,  range: 0, sprite: 'ant_collector' },
    scout:     { cost: 20, hp: 24,  speed: 78, damage: 0,  armor: 0,  range: 0, sprite: 'ant_scout' },
    soldier:   { cost: 25, hp: 60,  speed: 62, damage: 9,  armor: 4,  range: 1, sprite: 'ant_soldier' },
    guardian:  { cost: 30, hp: 95,  speed: 48, damage: 7,  armor: 14, range: 1, sprite: 'ant_guardian' },
    sniper:    { cost: 40, hp: 12,  speed: 58, damage: 14, armor: 0,  range: 3, sprite: 'ant_sniper' },
    spy:       { cost: 100,hp: 40,  speed: 70, damage: 0,  armor: 0,  range: 1, sprite: 'ant_spy' },
    healer:    { cost: 60, hp: 45,  speed: 55, damage: 0,  armor: 2,  range: 2, sprite: 'ant_healer' },
    digger:    { cost: 45, hp: 60,  speed: 50, damage: 4,  armor: 6,  range: 0, sprite: 'ant_digger' },
    giant:     { cost: 120,hp: 320, speed: 28, damage: 40, armor: 20, range: 1, sprite: 'ant_giant', scale: 2.2 }, // [M-05] 150→120, 900→320, 14→28, scale 10→2.2
    // novas formigas recortadas de formigas/gen-*.png (768→32x32, 8f)
    ant_new_1: { cost: 35, hp: 50, speed: 60, damage: 10, armor: 4, range: 1, sprite: 'ant_new_1' },
    ant_new_2: { cost: 35, hp: 50, speed: 60, damage: 10, armor: 4, range: 1, sprite: 'ant_new_2' },
    ant_new_3: { cost: 45, hp: 70, speed: 55, damage: 12, armor: 6, range: 1, sprite: 'ant_new_3' },
    ant_new_4: { cost: 45, hp: 70, speed: 55, damage: 12, armor: 6, range: 1, sprite: 'ant_new_4' },
    ant_new_5: { cost: 55, hp: 90, speed: 50, damage: 14, armor: 8, range: 1, sprite: 'ant_new_5' },
    ant_new_6: { cost: 55, hp: 90, speed: 50, damage: 14, armor: 8, range: 1, sprite: 'ant_new_6' },
    ant_new_7: { cost: 80, hp: 140, speed: 45, damage: 18, armor: 10, range: 1, sprite: 'ant_new_7', scale: 1.4 },
    ant_new_8: { cost: 80, hp: 140, speed: 45, damage: 18, armor: 10, range: 1, sprite: 'ant_new_8', scale: 1.4 },
    ant_new_9: { cost: 35, hp: 50, speed: 62, damage: 10, armor: 4, range: 1, sprite: 'ant_new_9' },
    ant_new_10:{ cost: 35, hp: 50, speed: 62, damage: 10, armor: 4, range: 1, sprite: 'ant_new_10' },
    ant_new_11:{ cost: 45, hp: 70, speed: 57, damage: 12, armor: 6, range: 1, sprite: 'ant_new_11' },
    ant_new_12:{ cost: 45, hp: 70, speed: 57, damage: 12, armor: 6, range: 1, sprite: 'ant_new_12' },
    ant_new_13:{ cost: 55, hp: 90, speed: 52, damage: 14, armor: 8, range: 1, sprite: 'ant_new_13' },
    ant_new_14:{ cost: 55, hp: 90, speed: 52, damage: 14, armor: 8, range: 1, sprite: 'ant_new_14' },
    ant_new_15:{ cost: 80, hp: 140, speed: 47, damage: 18, armor: 10, range: 1, sprite: 'ant_new_15', scale: 1.4 },
    ant_new_16:{ cost: 80, hp: 140, speed: 47, damage: 18, armor: 10, range: 1, sprite: 'ant_new_16', scale: 1.4 },
};

/** Stats base dos inimigos (escalados por dificuldade do bioma). */
export const ENEMY_TYPES = {
    centipede:      { hp: 40, speed: 40, damage: 6,  armor: 2,  sprite: 'enemy_centipede', biomass: 8 },
    beetle:         { hp: 60, speed: 30, damage: 11,  armor: 8,  sprite: 'enemy_beetle', biomass: 7 }, // [M-10] 9→11, 10→7
    scorpion:       { hp: 50, speed: 44, damage: 8,  armor: 4,  sprite: 'enemy_scorpion', biomass: 9 },
    fly:            { hp: 22, speed: 70, damage: 4,  armor: 0,  sprite: 'enemy_fly', biomass: 5 },
    moth:           { hp: 26, speed: 62, damage: 4,  armor: 0,  sprite: 'enemy_moth', biomass: 5 },
    termite:        { hp: 34, speed: 48, damage: 8,  armor: 3,  sprite: 'enemy_termite', biomass: 5 }, // [M-10] 6→8, 7→5
    plant:          { hp: 55, speed: 22, damage: 8,  armor: 5,  sprite: 'enemy_plant', biomass: 9 },
    ant:            { hp: 44, speed: 56, damage: 7,  armor: 3,  sprite: 'ant_enemy', biomass: 8 },
    spiderling:     { hp: 16, speed: 66, damage: 3,  armor: 0,  sprite: 'enemy_spiderling', biomass: 3 },
    boar:           { hp: 85, speed: 38, damage: 13, armor: 6,  sprite: 'enemy_boar', biomass: 12 }, // de animais/Boar
    fox:            { hp: 45, speed: 70, damage: 9,  armor: 2,  sprite: 'enemy_fox', biomass: 9 }, // de animais/Fox
    deer:           { hp: 60, speed: 55, damage: 7,  armor: 3,  sprite: 'enemy_deer', biomass: 8 }, // de animais/Deer
    hare:           { hp: 30, speed: 78, damage: 5,  armor: 1,  sprite: 'enemy_hare', biomass: 6 }, // de animais/Hare
};

/** Chefes (arquetipos disponíveis no beta). */
export const BOSS_TYPES = {
    wolf_spider:       { hp: 500, speed: 46, damage: 14, armor: 6,  sprite: 'boss_wolf_spider', jelly: 60,  name: 'Aranha-Lobo Matriarca' },
    bombardier:        { hp: 650, speed: 34, damage: 18, armor: 10, sprite: 'boss_bombardier', jelly: 70,  name: 'Besouro Bombardeiro Piroclástico' },
    putrid_centipede:  { hp: 750, speed: 40, damage: 16, armor: 8,  sprite: 'boss_putrid_centipede', jelly: 80, name: 'Centopeia Pútrida' },
    first_queen:       { hp: 1600, speed: 40, damage: 24, armor: 12, sprite: 'boss_first_queen', jelly: 300, name: 'A Primeira Rainha' }
};
