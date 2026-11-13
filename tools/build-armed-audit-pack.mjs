/** Local audit candidate. Reuse sealed resources and run the existing packers on new source assets. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {PROVENANCE_FILE, sha256, verifyCompressedProvenance, verifySourceManifest} from './compressed-resource-provenance.mjs';
import {prepareImageManifest} from './prepare-shared-image-manifest.mjs';

const baseline = path.resolve('sites/size-optimized-site/public');
const web = path.resolve(process.argv[2] ?? 'dist/v14-armed-audit-fixes-20261112/web');
const out = path.join(path.dirname(web), 'packed');
const audit = path.resolve('reports/local/v14-armed-audit-fixes-20261112');
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const write = (file, obj) => fs.writeFile(file, JSON.stringify(obj));
const indexAt = async dir => JSON.parse((await fs.readFile(path.join(dir, 'sites-pack-index.js'), 'utf8'))
  .replace(/^self\.SC2_PACK_INDEX=/, '').replace(/;\s*$/, ''));
const old = await read(path.join(baseline, 'web-release.json'));
const fresh = await read(path.join(web, 'web-release.json'));
const src = await read(path.join(web, fresh.manifest));
const proof = await read(path.join(baseline, PROVENANCE_FILE));
const prior = verifyCompressedProvenance(proof, old, {release:proof.sourceRelease},
  await fs.readFile(path.join(baseline, old.manifest)), {version:1, release:proof.sourceRelease, assets:proof.sources},
  await fs.readFile(path.join(baseline, 'sites-pack-index.js')));
verifySourceManifest(fresh, src);
for (const [id, row] of Object.entries(proof.sources)) assert.deepEqual(src.assets[id], row, id);
const additions = Object.fromEntries(Object.entries(src.assets).filter(([id]) => !proof.sources[id]));
async function packAdditions(work) {
  const count = Object.keys(additions).length;
  if (count === 0) return {newRows:{}, deltaIndex:{}, delta:null};
  assert.equal(count, 20, 'Expected the reviewed armed support resource delta');
  const staging = path.join(work, 'sites/v04-original-staging'), high = path.join(work, 'sites/v04-compact-r2/dist');
  const tiers = path.join(work, 'tiers'), delta = path.join(tiers, 'public');
  await fs.mkdir(path.join(staging, 'assets'), {recursive:true});
  for (const row of Object.values(additions)) {
    const bytes = await fs.readFile(path.join(web, row.url));
    assert.equal(sha256(bytes), row.sha256);
    await fs.writeFile(path.join(staging, row.url), bytes);
  }
  await write(path.join(staging, fresh.manifest), {...src, assets:additions});
  await write(path.join(staging, 'web-release.json'), fresh);
  await fs.copyFile(path.join(web, 'index.html'), path.join(staging, 'index.html'));
  const pythonEnv = {...process.env, PYTHONPATH:[path.resolve('sites/v04-compression-tools'), process.env.PYTHONPATH].filter(Boolean).join(path.delimiter)};
  for (const file of ['v04-compress-r2.py','v04-align-models-r2.py']) {
    execFileSync('python', [path.resolve('sites', file)], {cwd:work, env:pythonEnv, stdio:'inherit'});
  }
  const highRows = (await read(path.join(high, fresh.manifest))).assets;
  const indexRows = Object.values(highRows).map(r => [r.url, [path.basename(r.url),0,r.bytes,r.mime,false]]);
  await fs.writeFile(path.join(high, 'sites-pack-index.js'), 'self.SC2_PACK_INDEX='+JSON.stringify(Object.fromEntries(indexRows))+';');
  execFileSync(process.execPath, ['--import','tsx','tools/build-quality-assets.mjs', high, tiers], {stdio:'inherit'});
  const inventoryFile = path.join(tiers, 'quality-input.json'), inventory = await read(inventoryFile);
  inventory.records = inventory.records.filter(r => Object.hasOwn(additions, r.id));
  for (const r of inventory.records) r.packedFile = path.join(web, additions[r.id].url);
  await write(inventoryFile, inventory);
  execFileSync('python', ['tools/build-quality-assets.py', inventoryFile], {stdio:'inherit'});
  await prepareImageManifest(delta);
  const deltaRelease = await read(path.join(delta, 'web-release.json'));
  const newRows = (await read(path.join(delta, deltaRelease.manifest))).assets;
  return {newRows, deltaIndex:await indexAt(delta), delta};
}

await fs.mkdir(audit, {recursive:true});
const work = await fs.mkdtemp(path.join(audit, 'pack-work-'));
try {
  const {newRows, deltaIndex, delta} = await packAdditions(work);
  const index = await indexAt(baseline);
  const assets = {...prior.assets, ...newRows};
  const allRows = Object.values(assets).flatMap(row => [row, ...Object.values(row.variants??{})]).concat(Object.values(prior.gpuTextures??{}));
  const files = new Map(Object.values(index).map(([name]) => ['assets/'+name, baseline]));
  for (const row of Object.values(newRows).flatMap(row => [row,...Object.values(row.variants??{})])) {
    const [name, offset, length, , zipped] = deltaIndex[row.url];
    const bundle = await fs.readFile(path.join(delta, 'assets', name)), slice = bundle.subarray(offset, offset+length);
    const bytes = zipped ? gunzipSync(slice) : slice;
    assert.equal(bytes.length, row.bytes);
    assert.equal(sha256(bytes), row.sha256);
    if (index[row.url]) row.bundle = index[row.url][0];
    else {
      files.set('assets/'+name, delta);
      index[row.url] = deltaIndex[row.url];
    }
  }
  for (const r of allRows) if (!index[r.url]) files.set(r.url, baseline);
  await fs.mkdir(path.join(out, 'assets'), {recursive:true});
  let packedBytes = 0;
  for (const [name, dir] of files) {
    assert.ok(/^assets\/[\w.-]+$/.test(name));
    const srcFile = path.join(dir, name), destFile = path.join(out, name);
    try { await fs.copyFile(srcFile, destFile, fs.constants.COPYFILE_EXCL); } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      assert.equal(sha256(await fs.readFile(destFile)), sha256(await fs.readFile(srcFile)), name);
    }
    packedBytes += (await fs.stat(srcFile)).size;
  }
  const release = sha256(JSON.stringify(assets)), manifest = 'asset-manifest.'+release+'.json';
  const manifestBytes = Buffer.from(JSON.stringify({...prior, release, assets}));
  const indexBytes = Buffer.from('self.SC2_PACK_INDEX='+JSON.stringify(index)+';\n');
  const unique = new Map(allRows.map(r => [r.url,r.bytes]));
  const logicalBytes = allRows.reduce((n,r) => n+r.bytes, 0), assetBytes = [...unique.values()].reduce((n,b) => n+b, 0);
  await fs.writeFile(path.join(out, manifest), manifestBytes);
  await fs.writeFile(path.join(out, 'sites-pack-index.js'), indexBytes);
  await write(path.join(out, PROVENANCE_FILE), {version:1, sourceRelease:fresh.release, packedRelease:release,
    packedManifestSha256:sha256(manifestBytes), packIndexSha256:sha256(indexBytes), sources:src.assets});
  await write(path.join(out, 'web-release.json'), {...old, manifest, release, sourceWebRelease:fresh.release,
    assetCount:Object.keys(assets).length, fileCount:unique.size, logicalBytes, assetBytes, sharedBytes:logicalBytes-assetBytes,
    packedBytes, variantRecordCount:allRows.length-Object.keys(assets).length-Object.keys(prior.gpuTextures??{}).length});
  await write(path.join(out, 'runtime-config.json'), {assetBaseUrl:''});
  execFileSync(process.execPath, ['tools/update-compressed-game.mjs', out, web], {stdio:'inherit'});
  console.log(JSON.stringify({out, reused:Object.keys(prior.assets).length, added:Object.keys(newRows).length,
    newVariants:Object.values(newRows).reduce((n,r) => n+Object.keys(r.variants??{}).length,0), packedBytes}));
} finally {
  const temp = await fs.realpath(work);
  if (path.dirname(temp) !== await fs.realpath(audit) || !path.basename(temp).startsWith('pack-work-')) {
    throw new Error('Unexpected audit scratch directory');
  }
  await fs.rm(temp, {recursive:true, force:true});
}
