import {defineConfig} from 'vite';

// QA only: archived 400 MB HTML files and temporary release trees are not app entries.
export default defineConfig({
 root:process.cwd(),base:'./',cacheDir:'.cache/p6-vite',
 optimizeDeps:{entries:['index.html']},
 server:{host:'127.0.0.1',port:12192,strictPort:true,hmr:false,watch:{ignored:['**/.cache/**','**/reports/**','**/dist/**','**/deploy/**']}},
});
