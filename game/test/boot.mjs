// Regressão de inicialização, sem dependências: sintaxe ESM real, boot normal,
// save inválido, falhas de fonte/sprite/atlas e REQUISIÇÃO PENDURADA (o caso do
// celular: o pedido nunca responde). Uso: node game/test/boot.mjs
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setImmediate as nextTurn } from "node:timers/promises";

const JS = new URL("../js/", import.meta.url);
const scenario = process.argv[2];

if (!scenario) {
  // `node --check arquivo.js` pode tratar o arquivo como CommonJS. O browser
  // usa ESM, onde declarar a mesma função exportada duas vezes é erro fatal.
  const modules = readdirSync(JS).filter((name) => name.endsWith(".js"));
  for (const name of modules) {
    const result = spawnSync(process.execPath, ["--input-type=module", "--check"], {
      input: readFileSync(new URL(name, JS)), encoding: "utf8",
    });
    assert.equal(result.status, 0, name + ": " + result.stderr);
  }
  console.log("ok    sintaxe ESM dos " + modules.length + " módulos");
  for (const name of ["normal", "save-invalido", "falha-fonte", "falha-sprite", "falha-hud", "pendurado"]) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), name], {
      encoding: "utf8", timeout: 15000,
    });
    assert.equal(result.status, 0, name + ": " + result.stdout + result.stderr);
    process.stdout.write(result.stdout);
  }
  console.log("INICIALIZAÇÃO OK — boot, save e falhas de carregamento cobertos");
} else {
  const nativeTexts = [], errors = [], listeners = [], frames = [];
  const gradient = { addColorStop() {} };
  function makeCtx() {
    return new Proxy({ canvas: { width: 960, height: 540 } }, {
      get(target, key) {
        if (key in target) return target[key];
        if (key === "createLinearGradient" || key === "createRadialGradient") return () => gradient;
        if (key === "fillText") return (text) => nativeTexts.push(text);
        if (key === "getImageData") return () => ({ data: new Uint8ClampedArray(16) });
        if (key === "measureText") return () => ({ width: 10 });
        return () => {};
      },
      set(target, key, value) { target[key] = value; return true; },
    });
  }
  const canvas = {
    width: 960, height: 540, style: {}, getContext: makeCtx,
    addEventListener: (name) => listeners.push(name),
  };
  globalThis.window = globalThis;
  globalThis.innerWidth = 1280;
  globalThis.innerHeight = 720;
  globalThis.document = {
    getElementById: () => canvas,
    createElement: () => ({ width: 0, height: 0, style: {}, getContext: makeCtx }),
  };
  globalThis.addEventListener = () => {};
  globalThis.requestAnimationFrame = (cb) => { frames.push(cb); return frames.length; };
  const saved = JSON.stringify({ essence: 314, nodes: { raiz: 1 } });
  globalThis.localStorage = {
    getItem: () => scenario === "save-invalido" ? "{incompleto" : saved,
    setItem() { assert.fail("boot não deve sobrescrever o save"); },
  };
  const requested = [];
  globalThis.Image = class {
    constructor() { this.width = this.height = 64; }
    set src(value) {
      this._src = value;
      requested.push(value);
      queueMicrotask(() => {
        const fail = scenario === "falha-fonte" && value.includes("font_big.png")
          || scenario === "falha-sprite" && value.includes("ants/worker.png")
          || scenario === "falha-hud" && value.includes("ui/lore_icons.png");
        if (scenario === "pendurado" && value.includes("ants/worker.png")) return; // engasgado
        if (fail) this.onerror?.(new Error("imagem indisponível"));
        else this.onload?.();
      });
    }
    get src() { return this._src; }
  };
  console.error = (...args) => errors.push(args);
  const unhandled = [];
  process.on("unhandledRejection", (error) => unhandled.push(error));
  const { LOAD, LOAD_CFG } = await import(new URL("assets.js", JS));
  if (scenario === "pendurado") LOAD_CFG.timeoutMs = 40;   // 12s reais não cabem num teste
  await import(new URL("main.js", JS));
  const { G } = await import(new URL("state.js", JS));
  let clock = performance.now();
  for (let i = 0; i < 12; i++) {
    await nextTurn();
    clock += 1000 / 60;
    for (const cb of frames.splice(0)) cb(clock);
  }
  await nextTurn();
  if (scenario === "pendurado") {
    // relógio de verdade: é assim que uma requisição presa se resolve (ou não)
    for (let r = 0; r < 20; r++) {
      await new Promise((res) => setTimeout(res, 25));
      clock += 1000 / 60;
      for (const cb of frames.splice(0)) cb(clock);
    }
  }
  assert.equal(unhandled.length, 0, "nenhuma rejeição assíncrona sem tratamento");
  if (scenario.startsWith("falha-") || scenario === "pendurado") {
    assert.equal(G.screen, "BOOT", "não entrar no jogo sem os recursos obrigatórios");
    assert.equal(listeners.length, 0, "controles não devem iniciar após falha");
    assert.equal(errors.length, 1, "falha registrada uma única vez");
    assert(nativeTexts.some((text) => text.startsWith("ERRO:")), "erro visível sem fonte bitmap");
    assert(nativeTexts.some((text) => text.includes("recarregue")), "instrução de recuperação visível");
    if (scenario === "falha-fonte") {
      assert(requested.every((src) => src.includes("/font/")), "parar antes de carregar sprites se a fonte falhar");
    }
    if (scenario === "pendurado") {
      // O BUG DO CELULAR: sem prazo, uma imagem que não responde deixava a barra
      // de carregamento parada PARA SEMPRE, sem erro nenhum. Tem de virar ERRO
      // dito, com o nome do arquivo, e ter saída por toque (sem teclado/F5).
      assert(nativeTexts.some((text) => text.includes("worker.png")), "dizer qual asset travou");
      assert(nativeTexts.some((text) => text.includes("TENTAR DE NOVO")), "recomeço ao alcance do dedo");
      assert(requested.filter((src) => src.includes("ants/worker.png")).length >= 2, "tentar de novo antes de desistir");
    }
  } else {
    assert.equal(G.screen, "PRETITLE");
    assert(listeners.includes("mousedown"), "controles inicializados");
    assert.equal(errors.length, 0);
    assert.equal(LOAD.done, LOAD.total, "todas as imagens do boot entraram na fila");
  }
  assert.equal(G.save.essence, scenario === "save-invalido" ? 0 : 314, "preservar essência ou usar padrão seguro");
  console.log("ok    " + scenario);
}
