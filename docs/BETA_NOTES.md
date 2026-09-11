# FUMIGA — Notas do Beta (implementado vs. simplificado)

O beta prioriza um **core loop completo e jogável** seguindo o TDD. Abaixo, o status de cada sistema.

## ✅ Implementado fielmente
- **Arquitetura de diretórios e módulos** do TDD (`js/scenes|core|ai|entities|world|systems`, `css/`, `assets/`, `index.html`, `capacitor.config.json`).
- **Config do Phaser** (§3.1): WEBGL, FIT/CENTER_BOTH, `pixelArt`, `antialias:false`, arcade physics.
- **AStarGrid** (§5.1): matriz 0/1/2/3 (+extensões 4=superfície, 5=céu), heurística de Manhattan, `version` p/ recálculo.
- **BehaviorTree** (§5.2) com as 4 prioridades (Combate → Obediência → Sobrevivência → Idle).
- **PheromoneSystem** (§5.3): zonas `{type, radius, ttl}`.
- **TimeController** (§3.2): long-press 300ms/delta10px → `timeScale=0.1` + `physics.world.timeScale=10` + vinheta.
- **SaveManager** (§3.3): IndexedDB → localStorage → memória; estrutura `{royalJelly, skillTree, discoveredBiomes}`.
- **RoomBuilder** (§6.2): custos do GDD, Túnel Falso = Zone de lentidão (overlap), Fungos = renda passiva, Berçário = spawn.
- **MutationSystem** (§6.1): roleta por pesos + Sorte; `applyTo` aplica a matemática em `runMods`.
- **AudioManager** (§8): pool ≤3 + detune aleatório.
- **WebGLShaders** (§7.2): pipeline ChromaKey registrado (WebGL); assets já saem com alpha, então nada depende dele por padrão.
- **HUD minimalista + Menu Radial em fatias** (doc de refação): sup. esquerdo Biomassa/Geleia, sup. direito engrenagem, HP da Rainha oculto por padrão.
- **Rainha**: fila de spawn, pânico (<5 blocos), game over; **Espiã** troca de facção e envenena a rainha rival sem aggro.

## 🟡 Simplificado no beta (funcional, mas reduzido)
- **Sprites/áudio procedurais** em vez de sheets gerados por IA de imagem (mantém offline e o estilo 16-bit). Troque depois em `assets/` mantendo o `manifest.json`.
- **Chefes**: 4 arquétipos com ataques especiais (invocar, AoE, sopro tóxico, feromônios) mapeados aos 15 biomas; a Arena usa `A Primeira Rainha`.
- **Névoa de guerra**: revelada por Exploradoras e ao redor da base (RenderTexture + erase).
- **Assimilação da Espiã**: ao matar a rainha rival, inimigos viram Biomassa (conversão total de tropas fica p/ depois).
- **Água/mobilidade do Jardim Flutuante**: tiles de água bloqueiam caminhada terrestre.
- Algumas mutações cósmicas/deus aplicam flags lidas pelo combate (ex.: `boss_exec`, `projectile`, `poison`); efeitos puramente visuais/complexos (ex.: Buraco Negro engolindo projéteis) estão como flags preparadas.

## 🚧 Fora do escopo do beta
- Build `.apk` executado (config Capacitor pronta, mas compilação requer Android SDK local).
- Shaders de bloom/ iluminação dinâmica avançada (usamos contraste + partículas + vinheta).
