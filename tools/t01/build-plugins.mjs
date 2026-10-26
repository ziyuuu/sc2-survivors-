import fs from 'node:fs/promises';
export const draftInspectionPlugin=()=>({name:'t01-native-draft-inspection',setup(build){build.onLoad({filter:/[\\/]simulation[\\/]progression[\\/]expedition-drafts\.ts$/},async args=>({loader:'ts',contents:await fs.readFile(args.path,'utf8')+`
// T01 build-only exports. Original candidate, price and quote implementations remain intact.
export function t01NativePool(ctx:ExpeditionDraftContext){return reinforcementPool(ctx,true);}
export function t01NativeQuote(ctx:ExpeditionDraftContext,id:string){const c=reinforcementPool(ctx,true).find(c=>c.id===id);if(!c)throw Error('Native candidate unavailable: '+id);return quote(ctx,c,'random',c.effect.kind==='funShop'?funShopQuote(ctx.funShop!,c.effect.item,c.effect.level,c.effect.expected)!:shopPrice(c));}
`}));}});
