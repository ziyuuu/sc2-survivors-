import fs from 'node:fs/promises';
const root=new URL('./',import.meta.url);
let app=await fs.readFile(new URL('app.mjs',root),'utf8');
if(app.includes('createIntermissionUI'))throw Error('R9 source migration already applied');
app="import {createIntermissionUI} from './card-ui-r9.mjs';\n"+app;
function replaceBetween(start,end,value){const a=app.indexOf(start),b=app.indexOf(end,a+start.length);if(a<0||b<0)throw Error('Missing replacement anchor '+start);app=app.slice(0,a)+value+'\n'+app.slice(b);}
replaceBetween('function development(){','function shop(){','function development(){return intermissionUI.development();}');
replaceBetween('function shop(){','function heroes(){','function shop(){return intermissionUI.shop();}');
replaceBetween('function heroes(){','const lineNames=','function heroes(){return intermissionUI.heroes();}\nfunction cardLibrary(){return intermissionUI.library();}\nfunction intermissionServices(){return intermissionUI.services();}');
replaceBetween('const eliteCatalog={','const renderers=','function elitePreview(){return intermissionUI.elitePreview();}');
app=app.replace("['endless','无尽整备']","['endless','无尽整备'],['cards','关间卡片图鉴'],['rest','战地休整']");
app=app.replace('let talents=[],talentCopy={},','let cardFixture={},talents=[],talentCopy={},');
app=app.replace('const renderers={home,',"const intermissionUI=createIntermissionUI({state,frame,img,money,svg,button,esc,modalShell,pushModal,popModal,go,render,renderModal,toast,coverAsset,getFixture:()=>cardFixture});\nconst renderers={cards:cardLibrary,rest:intermissionServices,home,");
app=app.replace('const modals={details,','const modals={card:()=>intermissionUI.details(),details,');
app=app.replaceAll("['unit','details','elite','load-preview','talent']","['card','unit','details','elite','load-preview','talent']");
app=app.replace('function handle(action,b){','function handle(action,b){\n if(intermissionUI.handle(action,b))return;');
// Superseded static transactions; the new preview uses current source prices.
replaceBetween(" if(action==='development-direction')"," if(action==='talent-race')",'');
app=app.replace("frame.addEventListener('input',e=>{","frame.addEventListener('input',e=>{if(e.target.dataset.imFilter==='query'){intermissionUI.change(e);return;}");
app=app.replace("frame.addEventListener('change',e=>{","frame.addEventListener('change',e=>{if(intermissionUI.change(e))return;");
app=app.replace("if(state.page==='battle'||state.page==='talents')","if(['battle','talents','cards'].includes(state.page))");
app=app.replace('try{talents=',"try{cardFixture=window.__UI_CARDS__||await(await fetch(new URL('cards-r9.json',root))).json();}catch(e){console.error('Card data unavailable',e);}\ntry{talents=");
await fs.writeFile(new URL('app.mjs',root),app);
let html=await fs.readFile(new URL('index.html',root),'utf8');html=html.replace('<link rel="stylesheet" href="./style-r8.css">','<link rel="stylesheet" href="./style-r8.css">\n <link rel="stylesheet" href="./style-r9.css">');await fs.writeFile(new URL('index.html',root),html);
console.log('Applied R9 static card presentation');
