import {assetUrl} from '../../assets/manifest';
import {STARSHIP_ART_IDS} from '../../assets/starship-art.generated';

/** Resolve on demand so HTTP, offline packs and platform hosts use the same IDs. */
export function starshipImage(key:string,detail=false){
 const image=STARSHIP_ART_IDS[key];
 return image?assetUrl(detail&&image.detail?image.detail:image.src)??'':'';
}
