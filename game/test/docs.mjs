// A consolidação não pode resumir, deduplicar ou alterar o conteúdo original.
// Uso: node game/test/docs.mjs (Node puro; comparação byte a byte + SHA-256).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const ROOT = new URL("../../", import.meta.url);
const sources = [
  "REGRAS_DE_TRABALHO.md",
  "LORE.md",
  "DOCUMENTO_MEGA_ATUALIZACAO_LORE_TOTAL.md",
  "DOCUMENTO_DECISOES_MEGA_ATUALIZACAO.md",
  "PROGRESSO_MEGA_ATUALIZACAO.md",
  "DOCUMENTO_FASES_IMPLEMENTACAO.md",
];
const merged = readFileSync(new URL("MEGA_ARQUIVO.md", ROOT));
const footerAt = merged.indexOf('<a id="registro-de-integridade"></a>');
assert(footerAt >= 0, "registro de integridade presente");
const footer = merged.subarray(footerAt).toString("utf8");
const starts = merged.toString("utf8").match(/<!-- INICIO ORIGINAL: /g) || [];
const ends = merged.toString("utf8").match(/<!-- FIM ORIGINAL: /g) || [];
assert.equal(starts.length, sources.length, "todas as seis fontes presentes, sem duplicar blocos");
assert.equal(ends.length, sources.length, "todos os blocos têm fim");

let total = 0;
for (const name of sources) {
  const original = readFileSync(new URL(name, ROOT));
  const start = Buffer.from("<!-- INICIO ORIGINAL: " + name + " -->\n");
  const end = Buffer.from("\n<!-- FIM ORIGINAL: " + name + " -->");
  const startAt = merged.indexOf(start);
  assert(startAt >= 0, name + ": início encontrado");
  assert.equal(merged.indexOf(start, startAt + start.length), -1, name + ": bloco único");
  const contentAt = startAt + start.length;
  const endAt = merged.indexOf(end, contentAt);
  assert(endAt >= contentAt, name + ": fim encontrado");
  assert.equal(merged.indexOf(end, endAt + end.length), -1, name + ": fim único");
  assert(merged.subarray(contentAt, endAt).equals(original), name + ": preservar cada byte original");
  const digest = createHash("sha256").update(original).digest("hex");
  assert(footer.includes("| `" + name + "` | " + original.length + " | `" + digest + "` |"), name + ": tamanho e hash conferem");
  total += original.length;
  console.log("ok    " + name + " — " + original.length + " bytes intactos");
}
console.log("CONSOLIDAÇÃO ÍNTEGRA — " + sources.length + " documentos, " + total + " bytes originais preservados");
