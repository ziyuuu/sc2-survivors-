import * as THREE from 'three';
import {configurePlatformAssetUrl} from '../../assets/manifest';
import {WeChatAssetCache,type MiniAssetManifest,type MiniPlatform} from './asset-cache';
import {WeChatSaveBackend} from './save-backend';
import {WeChatGameSession} from './game-session';

declare const __WECHAT_MANIFEST__:MiniAssetManifest;
declare const __WECHAT_ASSET_ORIGIN__:string;
declare const wx:MiniPlatform&{
 createCanvas():HTMLCanvasElement;
 getWindowInfo():{windowWidth:number;windowHeight:number;pixelRatio:number};
 showLoading(options:{title:string;mask?:boolean}):void;
 hideLoading():void;
 showModal(options:{title:string;content:string;showCancel?:boolean}):void;
};

/** This is a hardware/resource preflight, not the gameplay entry point. */
async function preflight(){
 wx.showLoading({title:'检查 3D 运行环境',mask:true});
 let renderer:THREE.WebGLRenderer|null=null;
 try{
  const canvas=wx.createCanvas(),info=wx.getWindowInfo();
  canvas.width=Math.floor(info.windowWidth*Math.min(2,info.pixelRatio));
  canvas.height=Math.floor(info.windowHeight*Math.min(2,info.pixelRatio));
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:false});
  if(!gl)throw Error('当前设备没有可用的 WebGL2 上屏画布');
  renderer=new THREE.WebGLRenderer({canvas,context:gl,antialias:false,alpha:false});
  renderer.setSize(info.windowWidth,info.windowHeight,false);
  renderer.setClearColor(0x071623);renderer.clear();
  const maxLayers=gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS) as number;
  if(maxLayers<8)throw Error('原地图至少需要 8 层纹理数组');
  const backend=new WeChatSaveBackend(wx),backups=await backend.read();
  let asset='未设置 HTTPS 下载域名';
  if(__WECHAT_ASSET_ORIGIN__){
   const cache=new WeChatAssetCache(wx,__WECHAT_MANIFEST__,__WECHAT_ASSET_ORIGIN__);
   configurePlatformAssetUrl(id=>cache.get(id));
   await cache.prepare(['map.kairos','model.marine']);
   const session=await WeChatGameSession.open(wx,cache,backend);
   asset=`原地图与枪兵模型已通过 SHA-256 校验；模拟状态 ${session.world.phase}`;
  }
  console.info('WeChat 3D preflight',{three:THREE.REVISION,canvas:[canvas.width,canvas.height],maxLayers,asset,saves:backups.filter(Boolean).length,assets:__WECHAT_MANIFEST__.assetCount});
  wx.showModal({title:'3D 适配预检',content:`WebGL2 与地图纹理能力可用。${asset}。这是工程预检包，尚未接入完整战斗界面，不能作为试玩或发布版。`,showCancel:false});
 }catch(error){
  console.error('WeChat 3D preflight failed',error);
  wx.showModal({title:'3D 适配预检失败',content:String((error as Error).message),showCancel:false});
 }finally{wx.hideLoading();renderer?.dispose();}
}
void preflight();
