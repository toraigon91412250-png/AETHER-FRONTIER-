from pathlib import Path
import json
root=Path(__file__).parent
shell=(root/'demo/template.html').read_text()
module=(root/'source/aether-interactions.js').read_text()
demo=(root/'demo/demo-app.js').read_text()
# Deployable offline-build-free demo files. Both use exactly Three.js 0.160.0.
external=shell.replace('/* MODULE_SOURCE */',"import { createAetherModule } from '../source/aether-interactions.js';").replace('/* DEMO_SOURCE */',demo)
(root/'demo/index.html').write_text(external)
standalone=shell.replace('/* MODULE_SOURCE */',module.replace('export function createAetherModule','function createAetherModule',1)).replace('/* DEMO_SOURCE */',demo)
(root/'AETHER_No20_MeridianVault_STANDALONE.html').write_text(standalone)
print('standalone',len(standalone.encode()),'demo',len(external.encode()),'module',len(module.encode()))
