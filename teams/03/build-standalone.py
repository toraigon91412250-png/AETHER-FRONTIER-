#!/usr/bin/env python3
"""Builds a true single-file playable HTML using the external Three.js r160 CDN module.
No project build system is needed by the end user or Cloudflare Pages.
"""
from pathlib import Path
import re
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text(encoding='utf-8')
world=(root/'aether-sky-islands.js').read_text(encoding='utf-8')
demo=(root/'demo.js').read_text(encoding='utf-8')
world=world.replace('export function createAetherSkiff','function createAetherSkiff').replace('export function createAetherModule','function createAetherModule')
demo=re.sub(r"^import \* as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';\s*",'',demo,count=1,flags=re.M)
demo=re.sub(r"^import \{createAetherModule,createAetherSkiff\} from '\./aether-sky-islands.js';\s*",'',demo,count=1,flags=re.M)
assert not re.search(r'^import ',demo,flags=re.M),"Unexpected import in demo"
js="import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';\n"+world+"\n\n"+demo
assert '</script' not in js.lower()
(root/'tests'/'compiled-standalone.mjs').write_text(js,encoding='utf-8')
needle='<script type="module" src="./demo.js"></script>'
assert needle in html
html=html.replace(needle,'<script type="module">\n'+js+'\n</script>')
out=root/'AETHER_NO03_SkywardArchipelago_demo.html'
out.write_text(html,encoding='utf-8')
print(f'Built {out.name} ({out.stat().st_size:,} bytes)')
