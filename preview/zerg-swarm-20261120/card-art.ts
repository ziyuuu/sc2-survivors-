import {assetUrl} from '../../src/assets/manifest';
import type {ZswCard,ZswShort} from '../../src/data/zerg-swarm';
import {paintedArt} from '../../src/ui/presentation/painted-art';
import {esc} from '../../src/ui/presentation/reference-primitives';

type Motif=number|readonly [string,...string[]];
// Use the existing Zerg art sheet for abstract effects and roster pictures for cards about units.
const motifs:Record<ZswShort,Motif>={
 W01:6,W02:['zergling','zergling'],W03:10,W04:4,W05:['zergling'],W06:1,W07:['hydralisk','zergling'],W08:15,W09:['zergling','zergling','zergling'],
 G01:13,G02:['baneling','baneling'],G03:2,G04:4,G05:['hydralisk','hydralisk','hydralisk'],G06:['aberration'],G07:14,G08:1,G09:['zergling','zergling','zergling','zergling'],
 B01:7,B02:['roach','hydralisk'],B03:['baneling','roach','mutalisk'],B04:['devourer'],B05:['infestor'],B06:['swarm_host'],
 B07:['zergling','zergling','zergling','zergling','zergling','zergling'],B08:5,B09:['roach','roach'],
 P01:['ultralisk','ultralisk','ultralisk'],P02:13,P03:['zergling','zergling','zergling','zergling','zergling','zergling'],P04:['brood_lord'],P05:11,P06:['viper'],
 N01:2,N02:['hydralisk','roach','zergling'],N03:12,N04:13,N05:14,N06:6,N07:['zergling'],N08:5,N09:1,
 O01:['kerrigan'],O02:7,O03:2,
};

export function swarmCardArt(c:ZswCard){
 const motif=motifs[c.short];
 if(typeof motif==='number'){
  const sheet=assetUrl('ui.intermission.objects-zerg');
  if(!sheet)return '';
  return `<span class="imx-object" aria-hidden="true" style="background-image:url('${esc(sheet)}');background-position:${motif%4/3*100}% ${Math.floor(motif/4)/3*100}%"></span>`;
 }
 const plate=paintedArt(motif[0],c.name,motif.length,'swarm-preview-'+c.id,motif);
 if(plate)return plate;
 const portrait=assetUrl('unit.'+motif[0]);
 return portrait?`<img class="swarm-unit-portrait" src="${esc(portrait)}" alt="">`:'';
}
