/**
 * js/entities/CollectorAnt.js — Coletora (M-01) [GDD §6.2]
 * ---------------------------------------------------------------------------
 * Retorna à despensa mais próxima (ou rainha) quando carrying>0, TTL 18s (2x se <3 tiles de despensa).
 * Ciclo coleta 14s (era 22s).
 * ---------------------------------------------------------------------------
 */
import { TILE } from '../core/Config.js';
import { AntBase } from './AntBase.js';

export class CollectorAnt extends AntBase {
    constructor(scene, x, y, cfg) {
        super(scene, x, y, 'ant_collector', cfg, 'collector');
        this.fleeRadius = 4;
        this.canFight = false;
        this.pheromoneTypes = ['collect','retreat'];
        this.carrying = 0;
        this.ttl = 18; // [M-01] TTL 18s
        this.collectTimer = 0;
    }
    doIdle(ctx){
        const g = this.scene.gameRef;
        // se carregando, volta para despensa mais próxima ou rainha
        if(this.carrying>0){
            let target = null;
            let bestD=Infinity;
            for(const r of g.rooms.rooms){
                if(r.id==='pantry'){
                    const d=(r.x - this.tile().x)**2 + (r.y - this.tile().y)**2;
                    if(d<bestD){bestD=d; target=r;}
                }
            }
            const tx = target?target.x : g.queenTile.x;
            const ty = target?target.y : g.queenTile.y;
            if(this.setPathTo(tx,ty)){
                this.followPath(this.scene.gameDelta/1000);
                // entrega quando perto
                if(Math.hypot(tx*TILE+8 - this.x, ty*TILE+8 - this.y) < TILE*1.2){
                    this.carrying=0;
                    g.economy.add(12); // valor recurso 12
                    g.statsBiomass(12);
                }
            }
            // TTL 2x se perto de despensa
            this.ttl -= this.scene.gameDelta/1000 * (bestD < 9 ? 0.5 : 1);
            if(this.ttl<=0){ this.carrying=0; this.ttl=18; }
            return 'running';
        }
        // busca recurso via feromônio ou nearest
        const res = this.scene.findResourceNear(this.tile().x, this.tile().y);
        if(res && !res.taken){
            this.setPathTo(res.x,res.y);
            this.followPath(this.scene.gameDelta/1000);
            if(Math.hypot(res.x*TILE+8 - this.x, res.y*TILE+8 - this.y) < TILE){
                this.scene.removeResource(res);
                this.carrying = res.value || 12;
                g.economy.add(this.carrying);
                this.ttl=18;
            }
            return 'running';
        }
        return 'success';
    }
}
