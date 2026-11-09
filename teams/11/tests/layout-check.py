from pathlib import Path
import re
from playwright.sync_api import sync_playwright
html = Path('AF11_SERAPH_11_DEMO.html').read_text()
html = re.sub(r'<script type="module">.*?</script>', '', html, flags=re.S)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-gpu'])
    for name, w, h in [('desktop',1440,900),('mobile',390,844),('compact',375,667)]:
        page = browser.new_page(viewport={'width':w,'height':h}, device_scale_factor=1)
        page.set_content(html, wait_until='load')
        page.locator('#boot').evaluate('(e)=>e.style.display="none"')
        page.screenshot(path=f'tests/screenshot-{name}.png', full_page=True)
        positions=page.locator('.control-dock button').evaluate_all('(nodes)=>nodes.map(n=>({name:n.textContent,x:Math.round(n.getBoundingClientRect().left),y:Math.round(n.getBoundingClientRect().top),right:Math.round(n.getBoundingClientRect().right),bottom:Math.round(n.getBoundingClientRect().bottom)}))')
        overflow=[x for x in positions if x['x']<0 or x['right']>w or x['bottom']>h]
        print(name, 'buttons=', len(positions),'overflow=',overflow)
        assert not overflow
        print('dock',page.locator('.control-dock').bounding_box())
        page.close()
    browser.close()
