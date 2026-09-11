/**
 * js/core/Emitter.js
 * ---------------------------------------------------------------------------
 * Emissor de eventos mínimo e sem dependências. Usado pelos managers "puros"
 * para que eles rodem no navegador E no Node (testes) sem carregar o Phaser.
 * Quando uma cena do Phaser está disponível, ela pode ainda assim plugar seu
 * próprio eventEmitter — o GameManager expõe ambos.
 * ---------------------------------------------------------------------------
 */
export class Emitter {
    constructor() {
        this._handlers = new Map();
    }
    on(event, fn, context = null) {
        if (!this._handlers.has(event)) this._handlers.set(event, []);
        this._handlers.get(event).push({ fn, context });
        return this;
    }
    once(event, fn, context = null) {
        const wrap = (...args) => {
            this.off(event, wrap);
            fn.apply(context, args);
        };
        wrap._original = fn;
        return this.on(event, wrap, context);
    }
    off(event, fn) {
        const list = this._handlers.get(event);
        if (!list) return this;
        this._handlers.set(
            event,
            list.filter((h) => h.fn !== fn && h.fn._original !== fn)
        );
        return this;
    }
    emit(event, ...args) {
        const list = this._handlers.get(event);
        if (!list) return this;
        for (const h of [...list]) h.fn.apply(h.context, args);
        return this;
    }
}
