/**
 * js/scenes/Tutorial.js — Ghost hand 3 passos [A-05]
 * STEP_DIG → STEP_PANTRY → STEP_COLLECT → DONE, salvo em tutorialDone
 */
export class TutorialManager {
    constructor(scene){
        this.scene = scene;
        this.step = 0; // 0: dig, 1: pantry, 2: collect
        this.hand = null;
        this.text = null;
        this.done = false;
        if(scene.gameRef.gm.save.tutorialDone) return;
        this.createHand();
        this.nextStep();
        scene.events.on('roomBuilt', (d)=> this.onRoom(d));
        scene.gameRef.pheromone.events.on('dropped', (z)=> this.onPheromone(z));
        scene.events.on('enemyDied',()=>{});
    }
    createHand(){
        const s=this.scene;
        try{
            this.hand = s.add.image(s.scale.width/2, s.scale.height/2, 'ui_icons', 0).setScale(1.5).setDepth(20).setScrollFactor(0);
            this.text = s.add.bitmapText(s.scale.width/2, s.scale.height/2 + 30, 'fumiga', '',8).setOrigin(0.5).setDepth(20).setScrollFactor(0);
            s.tweens.add({targets:this.hand, x: '+=10', duration:600, yoyo:true, repeat:-1});
        }catch{}
    }
    nextStep(){
        if(this.done) return;
        const msgs = ['SEGURE AQUI → CAVAR', 'CONSTRUA DESPENSA', 'SOLTE FEROMÔNIO COLETAR'];
        if(this.text) this.text.setText(msgs[this.step] || '');
        if(this.hand){
            const W=this.scene.scale.width, H=this.scene.scale.height;
            const pos = [ {x:W/2, y:H/2}, {x:W/2+40, y:H/2-20}, {x:W/2, y:H/2+40}];
            const p = pos[this.step] || pos[0];
            this.hand.setPosition(p.x,p.y);
        }
    }
    onRoom(d){
        if(this.step===0 && d.id==='dig' || this.step===0){
            // actually dig is not room, but we check pendingJobs?
        }
        if(this.step===1 && d.id==='pantry'){
            this.step=2; this.nextStep();
        }
    }
    onPheromone(z){
        if(this.step===2 && z.type==='collect'){
            this.complete();
        }
    }
    // também escuta escavação
    onDig(){
        if(this.step===0){ this.step=1; this.nextStep(); }
    }
    complete(){
        this.done=true;
        try{
            const gm=this.scene.gameRef.gm;
            gm.save.tutorialDone=true;
            gm.save.royalJelly+=5;
            gm.persist();
            this.scene.gameRef.economy.add(20);
        }catch{}
        if(this.hand) this.hand.destroy();
        if(this.text) this.text.destroy();
        this.scene.events.emit('tutorialDone');
    }
    // chamado externamente quando cavar
    checkDig(tile){
        if(this.step===0) { this.step=1; this.nextStep(); }
    }
}
