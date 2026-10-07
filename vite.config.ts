import {defineConfig} from 'vite';
import openingPlugin from './tools/opening-vite-plugin.mjs';
const qa=(globalThis as unknown as {process?:{env?:Record<string,string>}}).process?.env?.SC2_QA_LOCK==='1';
export default defineConfig({base:'./',plugins:[openingPlugin()],server:{port:5173,strictPort:true,hmr:qa?false:undefined},build:{target:'es2022',sourcemap:false,assetsInlineLimit:0}});
