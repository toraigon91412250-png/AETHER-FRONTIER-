// Optional release export. The HTML entry and deploy ZIP do not require a build.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';
import {TEAM_REGISTRY} from '../../integration/team-registry.mjs';

const esbuild=process.env.AETHER_ESBUILD
  ?await import(pathToFileURL(resolve(process.env.AETHER_ESBUILD)).href)
  :await import('esbuild');
const output=process.argv[2];
if(!output)throw new Error('Pass an output .html path');
const root=fileURLToPath(new URL('../../',import.meta.url));
const here=dirname(fileURLToPath(import.meta.url));
const ids=['04','05','06','07','09','10','12','14','16','18'];
const {outputFiles}=await esbuild.build({
  entryPoints:[resolve(here,'main.js')],
  bundle:true,write:false,format:'esm',target:['safari17','chrome120'],legalComments:'inline',
  plugins:[{name:'freeze-team-imports',setup(build){
    build.onLoad({filter:/aether-compat\.mjs$/},async ({path})=>{
      const imports=ids.map(id=>`import {createAetherModule as team${id}} from '${resolve(root,TEAM_REGISTRY[id].entry)}';`);
      const registry=`const factories={${ids.map(id=>`'${id}':team${id}`).join(',')}};`;
      const source=await readFile(path,'utf8');
      return {contents:[...imports,registry,source.replace('await importTeamFactory(id,baseUrl)','factories[teamId(id)]')].join('\n'),resolveDir:dirname(path)};
    });
  }}],
});
const [html,css,license]=await Promise.all([
  readFile(resolve(here,'index.html'),'utf8'),readFile(resolve(here,'style.css'),'utf8'),
  readFile(resolve(here,'vendor/THREE-LICENSE.txt'),'utf8'),
]);
const script=outputFiles[0].text;
if(/<\/script/i.test(script))throw new Error('Inline script contains an HTML closing tag');
await writeFile(output,html.replace('<link rel="stylesheet" href="./style.css">',()=>`<style>\n${css}\n</style>`)
  .replace('<script type="module" src="./main.js"></script>',()=>`<script type="module">\n/*\n${license}\n*/\n${script}\n</script>`));
