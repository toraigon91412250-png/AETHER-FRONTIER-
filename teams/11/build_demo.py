from pathlib import Path
root = Path(__file__).resolve().parent
style = (root/'src/demo-style.css').read_text()
module = (root/'src/aether-drone.js').read_text()
pilot = (root/'src/drone-pilot.js').read_text()
app = (root/'src/demo-app.js').read_text()
markup = (root/'docs/markup.html').read_text()
# Standalone: all first-party code and CSS are embedded in one HTML file; only Three.js is fetched from a pinned CDN.
for name, quality in [('AF11_SERAPH_11_LITE.html', 'low'), ('AF11_SERAPH_11_HIGH.html', 'high'), ('AF11_SERAPH_11_DEMO.html', 'auto')]:
    script = '<script type="module">\n' + module + '\n' + pilot + '\n' + app + '\n</script>'
    content = markup.replace('__PRESET__', quality).replace('__STYLE__', '<style>\n' + style + '\n</style>').replace('__SCRIPT__', script)
    (root/name).write_text(content)
# Source index: CSS and first-party JavaScript separate, easy to merge with host game.
index_script = """<script type=\"module\">\nimport { createAetherModule } from './src/aether-drone.js';\nimport { createDronePilot } from './src/drone-pilot.js';\n""" + app + '\n</script>'
index_content = markup.replace('__PRESET__', 'auto').replace('__STYLE__', '<link rel="stylesheet" href="./src/demo-style.css">').replace('__SCRIPT__', index_script)
(root/'index.html').write_text(index_content)
print('Built', [(p.name, p.stat().st_size) for p in root.glob('*.html')])
