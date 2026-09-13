/**
 * js/scenes/Minimap.js — Minimapa 96x96 [J-06a]
 * RenderTexture downscaled, túneis marrom, superfície verde, Rainha amarela pulsante, boss vermelho.
 * Atualiza a cada 0.2s, culling, fog.
 */
export class Minimap {
    constructor(scene){
        this.scene = scene;
        this.size = 96;
        this.enabled = true;
        this.rt = null;
        this.bg = null;
        this.queenIcon = null;
        this.bossIcon = null;
        this.nextUpdate = 0;
    }
    create(){
        const s = this.scene;
        const W = s.scale.width, H = s.scale.height;
        const x = W - 108, y = H - 108;
        // fundo
        this.bg = s.add.graphics().setDepth(12).setScrollFactor(0);
        this.bg.fillStyle(0x0b0705,0.9).fillRect(x-2,y-2,this.size+4,this.size+4);
        this.bg.lineStyle(1,0xc8912a,0.6).strokeRect(x-2,y-2,this.size+4,this.size+4);
        this.rt = s.add.renderTexture(x,y,this.size,this.size).setDepth(13).setScrollFactor(0);
        this.rt.setInteractive({useHandCursor:true});
        this.rt.on('pointerdown',()=>{
            try{
                const q = s.gameRef.queenTile;
                s.cam.pan((q.x+0.5)*16, (q.y+0.5)*16, 300, 'Sine.easeInOut');
            }catch{}
        });
        // botão casa
        const home = s.add.bitmapText(x+this.size/2, y+this.size+6, 'fumiga', '[CASA]',6).setOrigin(0.5).setTint(0xc8ff5a).setDepth(14).setScrollFactor(0).setInteractive({useHandCursor:true});
        home.on('pointerdown',()=>{
            try{
                const q = s.gameRef.queenTile;
                s.cam.pan((q.x+0.5)*16, (q.y+0.5)*16, 300);
            }catch{}
        });
        // ícone rainha
        this.queenIcon = s.add.graphics().setDepth(14).setScrollFactor(0);
        this.bossIcon = s.add.graphics().setDepth(14).setScrollFactor(0);
        s.time.addEvent({delay:200, loop:true, callback:()=>this.update()});
        this.update();
    }
    update(){
        if(!this.scene.gameRef || !this.scene.gameRef.grid) return;
        const g = this.scene.gameRef.grid;
        const W = this.scene.scale.width, H=this.scene.scale.height;
        const x = W - 108, y = H -108;
        this.rt.clear();
        const scale = this.size / g.width;
        // desenha tiles
        for(let ty=0; ty<g.height; ty++){
            for(let tx=0; tx<g.width; tx++){
                const v=g.get(tx,ty);
                let col=0x1a0f0a; // SOLID
                if(v===1) col=0x4a3520; // WALK
                if(v===2) col=0x6a4a33; // ROOM
                if(v===4) col=0x7ad26a; // SURFACE
                if(v===3) col=0x2a2a2a; // ROCK
                this.rt.fill(tx*scale, ty*scale, Math.ceil(scale), Math.ceil(scale), col, 1);
            }
        }
        // hazards ponto piscante
        try{
            const hazards = this.scene.map.hazards;
            if(hazards){
                const t = Date.now()/400 %1;
                if(t<0.5){
                    for(const key of hazards){
                        const [hx,hy]=key.split(',').map(Number);
                        this.rt.fill(hx*scale, hy*scale, 2,2, 0xff4b2e, 0.9);
                    }
                }
            }
        }catch{}
        // rainha amarela pulsante
        try{
            const q = this.scene.gameRef.queenTile;
            const pulse = 0.7 + Math.sin(Date.now()/300)*0.3;
            this.queenIcon.clear();
            this.queenIcon.fillStyle(0xffc832, pulse).fillRect(x + q.x*scale -1, y + q.y*scale -1, 3,3);
        }catch{}
        // boss vermelho pulsante
        try{
            const boss = this.scene.boss;
            if(boss && !boss.dead){
                const bTile = {x: Math.floor(boss.x/16), y: Math.floor(boss.y/16)};
                const pulse = 0.6 + Math.sin(Date.now()/200)*0.4;
                this.bossIcon.clear();
                this.bossIcon.fillStyle(0xe03a3a, pulse).fillRect(x + bTile.x*scale -1, y + bTile.y*scale -1, 3,3);
            } else this.bossIcon.clear();
        }catch{}
    }
}
