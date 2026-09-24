#!/usr/bin/env bash
# ============================================================================
# FUMIGA — prepara o ambiente de DESENVOLVIMENTO (não faz parte do jogo)
#
# Instala o Playwright (devDependency, em node_modules/, fora do Git) e um
# Chromium headless para `npm run inspect` jogar o jogo de verdade no navegador.
#
#   bash tools/setup-dev.sh        (ou: npm run setup)
#
# Rota do navegador:
#   1. `npx playwright install chromium` — o caminho normal (PC, CI);
#   2. se o CDN do Playwright estiver bloqueado (caso do sandbox do agente),
#      usa o Chromium que vem DENTRO de um pacote npm (@sparticuz/chromium),
#      com as bibliotecas NSS que ele traz, em ~/.cache/fumiga-dev.
# Nada disso é salvo entre sessões do sandbox (node_modules e .cache ficam
# fora do snapshot): rode de novo no começo de cada sessão (~20 s).
# ============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/fumiga-dev"
SPARTICUZ_VERSION="153.0.0"   # mesma versão de Chromium do playwright 1.63.0
cd "$ROOT"

echo "▸ node $(node -v) · npm $(npm -v)"
echo "▸ instalando Playwright (devDependency)…"
npm install --no-audit --no-fund --loglevel=error

browser_ok() { node -e "
  import('playwright').then(async ({chromium}) => {
    const b = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-gpu','--no-zygote'],
      executablePath: process.env.CHROMIUM_PATH || undefined,
      env: { ...process.env, LD_LIBRARY_PATH: process.env.CHROMIUM_LIBS || process.env.LD_LIBRARY_PATH || '' } });
    console.log('  navegador: ' + b.version()); await b.close();
  }).catch((e) => { console.error('  ' + e.message.split('\n')[0]); process.exit(1); });" ; }

if [ -x "$CACHE/chromium" ] && CHROMIUM_PATH="$CACHE/chromium" CHROMIUM_LIBS="$CACHE/al2023/lib" browser_ok 2>/dev/null; then
  echo "✓ Chromium já preparado em $CACHE"
elif timeout 180 npx playwright install chromium >/tmp/fumiga-pw-install.log 2>&1 && browser_ok; then
  echo "✓ Chromium padrão do Playwright instalado"
else
  echo "▸ download padrão bloqueado — usando Chromium empacotado no npm (@sparticuz/chromium@$SPARTICUZ_VERSION)…"
  mkdir -p "$CACHE"
  npm install --prefix "$CACHE/pkg" --no-audit --no-fund --no-save --loglevel=error "@sparticuz/chromium@$SPARTICUZ_VERSION"
  BIN="$CACHE/pkg/node_modules/@sparticuz/chromium/bin"
  node -e "
    const fs = require('fs'), zlib = require('zlib');
    const [bin, out] = process.argv.slice(1);
    const un = (f) => zlib.brotliDecompressSync(fs.readFileSync(bin + '/' + f));
    fs.writeFileSync(out + '/chromium', un('chromium.br')); fs.chmodSync(out + '/chromium', 0o755);
    for (const t of ['al2023', 'swiftshader', 'fonts']) fs.writeFileSync(out + '/' + t + '.tar', un(t + '.tar.br'));
  " "$BIN" "$CACHE"
  mkdir -p "$CACHE/al2023" "$CACHE/fonts"
  tar -xf "$CACHE/al2023.tar" -C "$CACHE/al2023"
  tar -xf "$CACHE/swiftshader.tar" -C "$CACHE"     # libEGL/libGLESv2 ao lado do binário
  tar -xf "$CACHE/fonts.tar" -C "$CACHE/fonts"
  rm -f "$CACHE"/*.tar
  # fontconfig próprio: fontes do sistema (DejaVu) + as do pacote. Sem isto os
  # botões de toque (DOM) do mobile mostram "□" nas capturas — falso alarme.
  cat > "$CACHE/fonts.conf" <<CONF
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>/usr/share/fonts</dir>
  <dir>/usr/local/share/fonts</dir>
  <dir>$CACHE/fonts</dir>
  <cachedir>$CACHE/fonts-cache</cachedir>
</fontconfig>
CONF
  CHROMIUM_PATH="$CACHE/chromium" CHROMIUM_LIBS="$CACHE/al2023/lib" browser_ok
  echo "✓ Chromium empacotado pronto em $CACHE"
fi

cat <<EOF

Pronto. Comandos úteis:
  npm test              bateria headless completa, em paralelo (~45 s)
  npm run test:quick    só os testes rápidos (~10 s)
  npm run inspect       joga no navegador: PC + mobile, todas as telas, 6 mapas
                        (capturas em /tmp/fumiga-inspect, erros JS/404, FPS, glifos)
  npm run serve         servidor do preview sem cache em 0.0.0.0:8000
Modo debug no navegador: /game/?debug&tela=RUN&mapa=3&seed=42&invencivel
EOF
