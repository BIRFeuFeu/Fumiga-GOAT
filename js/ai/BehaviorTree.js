/**
 * js/ai/BehaviorTree.js — Máquina de estados base para formigas  [TDD §5.2]
 * ---------------------------------------------------------------------------
 * Cada formiga monta uma árvore com nós em ordem de prioridade:
 *   1. Selector (Combate)    -> EnemyInAggroRadius ? State_Attack
 *   2. Selector (Obediência) -> PheromoneSystem.hasActivePheromone ? A* até feromônio
 *   3. Selector (Sobreviv.)  -> EnemyInFleeRadius ? A* vetor oposto
 *   4. Leaf (Idle)           -> Wander / Garrison
 * `tick(agent, ctx)` roda no update() do Phaser.
 * ---------------------------------------------------------------------------
 */
export const STATUS = { SUCCESS: 'success', FAILURE: 'failure', RUNNING: 'running' };

export class Node {
    constructor(name = 'node') {
        this.name = name;
    }
    tick() {
        return STATUS.FAILURE;
    }
}

/** Tenta filhos em ordem; devolve SUCCESS na primeira que der certo. */
export class Selector extends Node {
    constructor(children = [], name = 'selector') {
        super(name);
        this.children = children;
    }
    tick(agent, ctx) {
        for (const child of this.children) {
            const r = child.tick(agent, ctx);
            if (r !== STATUS.FAILURE) return r;
        }
        return STATUS.FAILURE;
    }
}

/** Exige que todos os filhos deem certo, em ordem. */
export class Sequence extends Node {
    constructor(children = [], name = 'sequence') {
        super(name);
        this.children = children;
    }
    tick(agent, ctx) {
        for (const child of this.children) {
            const r = child.tick(agent, ctx);
            if (r === STATUS.FAILURE) return STATUS.FAILURE;
            if (r === STATUS.RUNNING) return STATUS.RUNNING;
        }
        return STATUS.SUCCESS;
    }
}

/** Folha de condição: roda `fn(agent,ctx)` booleana. */
export class Condition extends Node {
    constructor(fn, name = 'condition') {
        super(name);
        this.fn = fn;
    }
    tick(agent, ctx) {
        return this.fn(agent, ctx) ? STATUS.SUCCESS : STATUS.FAILURE;
    }
}

/** Folha de ação: roda `fn(agent,ctx)` e devolve um STATUS. */
export class Action extends Node {
    constructor(fn, name = 'action') {
        super(name);
        this.fn = fn;
    }
    tick(agent, ctx) {
        return this.fn(agent, ctx);
    }
}

export class BehaviorTree {
    constructor(root) {
        this.root = root;
    }
    tick(agent, ctx) {
        return this.root.tick(agent, ctx);
    }
}
