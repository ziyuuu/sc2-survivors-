import {MemoryStorage} from '../../src/app/memory-storage';
// Each inspector window has its own preferences as well as its own equipment
// account. This also protects file:// game preferences from the offline tools.
for(const key of ['localStorage','sessionStorage'] as const)Object.defineProperty(window,key,{configurable:true,value:new MemoryStorage()});
