const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pendingVersions, toUpdate, sync } = require('./sync-modrinth.cjs');
const release = (id, extra = {}) => ({ id, status: 'listed', version_type: 'release', version_number: '2.1.0',
  game_versions: ['26.2'], loaders: ['fabric'], files: [{}], date_published: '2026-10-04T00:00:00Z', ...extra });
test('skip baseline, existing links, prereleases and drafts', () => {
  const versions = [release('pXERzcGT'), release('existing'), release('beta', {version_type:'beta'}),
    release('draft', {status:'draft'}), release('new')];
  assert.deepEqual(pendingVersions(versions, [{ downloadUrl: 'https://modrinth.com/plugin/tnt-hopper-protect/version/existing?x=1' }]).map(v=>v.id), ['new']);
});
test('same version number on different loaders is not deduplicated', () => {
  assert.equal(pendingVersions([release('fabric1'), release('forge1', {loaders:['forge']})], []).length, 2);
});
test('format uses actual loader, Minecraft versions and direct release link', () => {
  const update = toUpdate(release('abc'));
  assert.match(update.title, /Fabric/);
  assert.equal(update.minecraftVersion, '26.2');
  assert.match(update.downloadUrl, /version\/abc$/);
});
test('dry run never authenticates or publishes', async () => {
  let calls=0;
  const fetchImpl=async()=>({ok:true,json:async()=> ++calls===1 ? [release('new')] : []});
  assert.equal(await sync({fetchImpl,dryRun:true,log:()=>{}}),1);
  assert.equal(calls,2);
});
test('partial Discord failure stops and does not blindly retry', async () => {
  let calls=0;
  const fetchImpl=async()=> {
    calls++;
    if(calls===1) return {ok:true,json:async()=>[release('new')]};
    if(calls===3) return {ok:true,headers:{getSetCookie:()=>['nd_admin=test; HttpOnly']}};
    if(calls===5) return {ok:true,json:async()=>({discord:{sent:false}})};
    return {ok:true,json:async()=>[]};
  };
  await assert.rejects(sync({fetchImpl,secret:'test',log:()=>{}}),/Discord delivery was not confirmed/);
  assert.equal(calls,5);
});
test('already saved release from ambiguous previous attempt is skipped', async () => {
  let calls=0;
  const fetchImpl=async()=>{
    calls++;
    if(calls===1) return {ok:true,json:async()=>[release('new')]};
    if(calls===3) return {ok:true,headers:{getSetCookie:()=>['nd_admin=test']}};
    return {ok:true,json:async()=>calls===2 ? [] : [{downloadUrl:toUpdate(release('new')).downloadUrl}]};
  };
  assert.equal(await sync({fetchImpl,secret:'test',log:()=>{}}),0);
  assert.equal(calls,4);
});
