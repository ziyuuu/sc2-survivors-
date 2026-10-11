import type {HudMode} from './frames';
/** One shared breakpoint policy for the native HUD and battlefield framing. */
export function hudMode(width:number,height:number,coarse:boolean):HudMode{
 const mobile=coarse||width<=700||width<=1100&&height<=600;
 return !mobile?'pc':width>height?'landscape':'portrait';
}
