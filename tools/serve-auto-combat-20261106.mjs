/** Local 1.2 review entry; isolated from 1.1 and production. */
process.env.SC2_TUTORIAL_DIST_ROOT='dist/auto-combat-1.2-20261106';
process.env.SC2_TUTORIAL_WORK_ROOT='reports/local/auto-combat-20261106';
const {serveTutorial}=await import('./serve-short-tutorial-candidate.mjs');
const server=await serveTutorial({port:Number(process.env.SC2_REVIEW_PORT??18916)});
console.log('1.2 local candidate: http://127.0.0.1:'+server.address().port+'/');
