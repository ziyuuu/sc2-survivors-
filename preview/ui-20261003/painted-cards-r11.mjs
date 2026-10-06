// Painted layers only. No substitute vector body is produced by this module.
// R11 consumes inspected new paintings; R10 remains review evidence.
let paintedInstance=0;
const paintedUrls=Object.create(null);
function paintedAssetUrl(key){
 if(paintedUrls[key])return paintedUrls[key];
 const source=globalThis.__UI_PAINTED_PLATES__?.[key];
 if(!source)return null;
 // One local image object per plate. Long base64 strings are embedded once
 // in the standalone HTML, not copied into every background/body SVG href.
 const marker='data:image/webp;base64,';
 if(!source.startsWith(marker))throw new Error('Unexpected painted image format '+key);
 const decoded=atob(source.slice(marker.length)),bytes=new Uint8Array(decoded.length);
 for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);
 paintedUrls[key]=URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
 delete globalThis.__UI_PAINTED_PLATES__[key];
 return paintedUrls[key];
}
const safe=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const positions={1:[[0,0]],2:[[-48,-6],[47,10]],3:[[-88,-6],[88,-4],[0,12]],4:[[-53,-27],[52,-27],[-52,38],[53,40]],6:[[-86,-27],[0,-28],[86,-26],[-86,40],[86,42],[0,44]]};
export function paintedCardKey(card){return card.subtype==='eliteVariant'?card.sourceId:card.family??card.families?.[0]??card.heroId;}
export function cardSubtitle(card){
 if(card.subtype==='eliteVariant')return globalThis.__UI_CARD_COPY__?.[card.sourceId]??card.stat;
 if(card.group==='supply'&&card.count)return {terran:'补给抵达，火力就绪。',zerg:'巢穴已醒，虫群涌来。',protoss:'折跃就绪，听候召唤。'}[card.race];
 if(card.group==='support')return card.stat.length>26?card.stat.slice(0,25)+'…':card.stat;
 return card.stat;
}
export function paintedCard(card,bodies=1,assets=globalThis.__UI_PAINTED_CARDS__){
 const key=paintedCardKey(card),asset=assets?.[key];
 if(!asset)return null;
 if(!positions[bodies])throw new Error('Unsupported actual body count '+bodies);
 const {width,height,bodyBounds,sceneBounds}=asset,url=asset.url??paintedAssetUrl(asset.assetKey);
 if(!url||!width||!height||!bodyBounds||!sceneBounds||bodyBounds.y<sceneBounds.y+sceneBounds.height)throw new Error('Unreviewed painted plate '+key);
 const id='painted-r11-'+(++paintedInstance),sceneHeight=sceneBounds.height;
 // A painted body is normalized once from its actual alpha bounds. Body count
 // only affects translation and painter order, never the image scale.
 const bodyHeight=asset.bodyHeight??(asset.air?150:224),bodyWidth=asset.bodyWidth??(asset.air?240:184);
 const scale=Math.min(bodyWidth/bodyBounds.width,bodyHeight/bodyBounds.height);
 const drawnW=bodyBounds.width*scale,drawnH=bodyBounds.height*scale;
 const x=200-drawnW/2-bodyBounds.x*scale,y=255-drawnH-bodyBounds.y*scale;
 const sceneScale=Math.max(400/sceneBounds.width,300/sceneHeight),sceneWidth=sceneBounds.width*sceneScale;
 const sceneX=(400-sceneWidth)/2-sceneBounds.x*sceneScale,sceneY=(300-sceneHeight*sceneScale)/2-sceneBounds.y*sceneScale;
 const scene=`<defs><linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${safe(asset.skyTop??'#5b6c81')}"/><stop offset="1" stop-color="${safe(asset.skyBottom??'#2c4252')}"/></linearGradient></defs><rect width="400" height="300" fill="url(#${id}-sky)"/><g clip-path="url(#${id}-scene-frame)"><image href="${safe(url)}" x="${sceneX}" y="${sceneY}" width="${width*sceneScale}" height="${height*sceneScale}"/></g>`;
 const figures=positions[bodies].map(([dx,dy],i)=>`<g class="im-painted-unit" data-unit-index="${i+1}" data-unit-scale="1" transform="translate(${dx} ${dy})">${asset.air?'':`<ellipse cx="200" cy="258" rx="${Math.min(61,drawnW*.29)}" ry="6" fill="#01070c" opacity=".62" filter="url(#${id}-contact)"/>`}<svg x="${x+bodyBounds.x*scale}" y="${y+bodyBounds.y*scale}" width="${drawnW}" height="${drawnH}" viewBox="${bodyBounds.x} ${bodyBounds.y} ${bodyBounds.width} ${bodyBounds.height}" overflow="hidden"><image href="${safe(url)}" width="${width}" height="${height}"/></svg></g>`).join('');
 const glow=asset.atmosphere??'#7995ac';
 // The full-width panel surface supplies the bottom fade. A rectangle in
 // this aspect-preserving body SVG would leave straight letterbox edges.
 const veil=`<ellipse cx="200" cy="270" rx="173" ry="19" fill="url(#${id}-mist)"/>`;
 return `<span class="im-painting-canvas"><svg class="im-painting-scene" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><clipPath id="${id}-scene-frame"><rect width="400" height="300"/></clipPath></defs>${scene}</svg><svg class="im-unit-painting im-raster-painting" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${safe(card.name)}，${bodies} 个战士" data-family="${safe(card.family??card.families?.[0]??'')}" data-art-key="${safe(key)}" data-body-count="${bodies}" data-body-width="${drawnW}" data-body-height="${drawnH}" data-art-method="painted-raster-layers" focusable="false"><defs><clipPath id="${id}-frame"><rect width="400" height="300"/></clipPath><filter id="${id}-contact" x="-30%" y="-160%" width="160%" height="420%"><feGaussianBlur stdDeviation="3"/></filter><radialGradient id="${id}-mist"><stop stop-color="${glow}" stop-opacity=".2"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient><linearGradient id="${id}-fade" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#071622" stop-opacity="0"/><stop offset="1" stop-color="#071622" stop-opacity=".94"/></linearGradient></defs><g clip-path="url(#${id}-frame)">${figures}</g>${veil}</svg></span>`;
}
