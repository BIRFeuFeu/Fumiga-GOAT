# DECISIONS_IA — Log de Escolhas da IA Autônoma

Este arquivo registra decisões pré-aprovadas para não travar execução.

| Sprint | Decisão | Escolha IA | Motivo |
|--------|---------|------------|--------|
| IA-0 | Telemetria | Analytics 40 LOC + fila 100 localStorage | Leve, não bloqueia update |
| IA-1.A | Threshold pausa | 14px + 80ms histerese + vibrate | J-01 2→14, jitter 8px não cancela |
| IA-1.A | Anel progresso | Graphics arc 0→360 300ms | Feedback visual HOLDING |
| IA-1.A | WASD | sp*dt simétrico + SHIFT 1.8x | Fix W 0.015 vs S 0.016 |
| IA-1.B | Barra Rainha | 6px sempre 20% → 100% se <70% + pulse + arrow off-screen | D-01 |
| IA-1.B | Economia | biomass 140, max 260, resource 12, count 48, pantry +120, passive 0.1 | A-01 |
| IA-1.C | ROCK | Digger 2.8s, requestDig(requester) | M-04 |
| IA-1.C | Giant | scale 2.2, hp 320, speed 28*0.5, cost 120, hitbox 18 | M-05 |
| IA-1.C | Fly | alpha 0.5 sobre SOLID, speed*0.7, não atravessa ROCK | G-03 |
| IA-1.C | Mutações | 8 fantasma → mutations_disabled.json (16 ativas) | M-12 |
| IA-2.A | HUD | bioMax 60x4, egg 5 radial, wave ONDA x/7, damage 12 pool, reveal 5 raio | HUD-01/02/03 |
| IA-2.B | Cartas | delta ANTES→DEPOIS, reroll 10 geleia 1x, recusar +15 | D-02 |
| IA-2.B | Migração | card thumb 32 + info GEL | D-04 |
| IA-2.B | Mapa | rock 0.06, hazard 0.12, 2 ruínas 3x3 | G-02 |
| IA-2.B | Tint | light 0.08 + 12 partículas | D-07 |
| IA-3.A | Coletora | TTL 18s 2x perto, retorna pantry | M-01 |
| IA-3.A | Healer | 3 cargas 4s cura 10 | M-06 |
| IA-3.A | Sniper | norm*80 kiting | M-03 |
| IA-3.A | Soldier | aggro 14 | SoldierFix |
| IA-3.B | Sala | nursery min 0.4, VFX partículas | Room-02 |
| IA-3.B | Boss | telegrafo 0.8s ring, enrage <30%, wolf 5, bombardier 2 pulsos | Boss-01 |
| IA-3.B | Tsunami | 14s aoe 6 tiles | Mut-01 |
| IA-4 | Tutorial | Ghost hand 3 passos | A-05 |
| IA-4 | Skill | totalCost FALTAM x GEL, col/row/requires | A-02 |
| IA-4 | Share | SEED #hex + 📸 download + clipboard | A-04 |
| IA-4 | Volume | GameManager.volume persist | D-08 |
| IA-4 | AquaFix | anthill/rival walkable, pools distância >3 | AquaFix |
| IA-5 | Minimap | 96x96 RenderTexture 0.2s, casa, culling 40 tiles | J-06a/GOLD-02 |
| IA-5 | Flocking | separation 12px 0.4 | G-04 |

Métricas finais (agent 50 runs):
- walkable 50/50
- winrate sintético 100% (era 58% com rock 61 → 213)
- avgRocks 213 (3x)
- avgHaz 24 (2x)
- bossTime estimado 110s (gate rooms>=2)
- build 1440KB <1.6MB
