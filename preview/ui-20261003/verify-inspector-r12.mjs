import fs from 'node:fs';
import crypto from 'node:crypto';
const root=new URL('../../reports/local/ui-redesign-20261003/',import.meta.url),evidence=new URL('r12-evidence/',root);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
// The browser returns JPEG bytes. Earlier iteration captures kept their .png
// filenames; terminal copies use the actual format without re-encoding them.
function dimensions(b){
 if(b.readUInt16BE(0)!==0xffd8)throw Error('Unexpected screenshot format');
 let p=2;
 while(p<b.length){if(b[p++]!==255)throw Error('Invalid JPEG marker');while(b[p]===255)p++;const m=b[p++];if(m===0xd9||m===0xda)break;const n=b.readUInt16BE(p);if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(m))return {width:b.readUInt16BE(p+5),height:b.readUInt16BE(p+3)};p+=n;}
 throw Error('Missing screenshot dimensions');
}
const cases=[
 ['desktop-unit-panel-final',1280,720,'desktop','陆战队员',0,0,0],
 ['desktop-elite-panel-final',1280,720,'desktop','精英杀手',0,0,0],
 ['portrait-protoss-hero-final',390,844,'mobile','阿塔尼斯',0,0,1],
 ['portrait-zerg-regrowing-final',390,844,'mobile','跳虫再生',0,0,1],
 ['landscape-medical-final',844,390,'mobile','精英救护',0,0,1],
 ['small-portrait-medical-final',320,568,'mobile','精英救护',0,122,1],
 ['narrow-desktop-battle-final',540,900,'desktop','返回战场',0,0,0]
];
const terminalChecks=cases.map(([name,width,height,device,subject,xOverflow,yOverflow,joysticks])=>{
 const bytes=fs.readFileSync(new URL(name+'.png',evidence)),size=dimensions(bytes);
 if(size.width!==width||size.height!==height)throw Error('Screenshot size mismatch '+name);
 fs.writeFileSync(new URL(name+'.jpg',evidence),bytes);
 return {name,viewport:size,device,subject,bodyOverflow:[xOverflow,yOverflow],visibleJoysticks:joysticks,consoleRows:'44px 44px',battlefieldText:'',screenshot:name+'.jpg',screenshotSha256:hash(bytes)};
});
const meta=JSON.parse(fs.readFileSync(new URL('artifact-r12.json',root),'utf8'));
if(hash(fs.readFileSync(new URL(meta.artifact,root)))!==meta.sha256)throw Error('Artifact hash mismatch');
const report={artifactSha256:meta.sha256,method:'Terminal summary transcribed from actual read-only CUA DOM outputs; screenshot sizes and hashes independently verified from saved image bytes. No browser state was read through this script.',terminalChecks,interactionChecks:{fromPortrait:true,unitSwitch:true,rosterJump:true,abilityAccordion:true,keyboardTabs:true,tabFocusLoop:true,escapeReturnsToSelectedHero:'查看雷诺详情',heroReturnPage:'2 / 2',sceneInertWhileOpen:true,sceneInertAfterClose:false,reducedMotionAnimations:['none','none','none'],smallPortraitFooterHorizontalOverflow:0,mobileTouchTargets:'Close, arrows and adjacent portraits measured at 44 by 44',smallPortraitEndScroll:122.66666412353516,regrowingLife:'0 / 73',twinBodySizeBothCounts:[219.63990267639903,224]},console:{errors:0,warnings:0},notes:['Only the explicitly listed terminal screenshots identify the terminal deliverable. Earlier screenshots remain iteration evidence.','Small portrait intentionally scrolls content inside fixed controls.','Real physical devices, real gamepads and production runtime were not exercised.']};
fs.writeFileSync(new URL('browser-verification.json',evidence),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({terminalScreenshots:terminalChecks.length,dimensionsVerified:true,artifactSha256:meta.sha256}));
