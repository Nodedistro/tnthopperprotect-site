const PROJECT = 'tnt-hopper-protect';
const API = 'https://v5t5c85n4c.execute-api.ca-central-1.amazonaws.com/api';
const BASELINE = new Set(['pXERzcGT', 'mnWOmlkS', 'iJS8ITi0', 'YNocNPqq']);
const labels = { paper: 'Paper', fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge' };

function versionId(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== 'modrinth.com') return null;
    return u.pathname.match(/\/version\/([a-zA-Z0-9]+)\/?$/)?.[1] || null;
  } catch { return null; }
}

function pendingVersions(versions, updates) {
  if (!Array.isArray(versions) || !Array.isArray(updates)) throw new Error('Invalid release or update list');
  const seen = new Set([...BASELINE, ...updates.map(u => versionId(u.downloadUrl)).filter(Boolean)]);
  return versions.filter(v => v.status === 'listed' && v.version_type === 'release'
    && /^[a-zA-Z0-9]+$/.test(v.id) && Array.isArray(v.files) && v.files.length > 0
    && Array.isArray(v.loaders) && v.loaders.some(l => labels[l])
    && !seen.has(v.id))
    .sort((a, b) => Date.parse(a.date_published) - Date.parse(b.date_published));
}

function toUpdate(v) {
  const loader = v.loaders.map(l => labels[l] || l).join(' / ');
  return {
    title: ('TNT Hopper Protect ' + v.version_number + ' — ' + loader).slice(0, 120),
    description: (loader + ' release\n\n' + (v.changelog || 'A new release is available on Modrinth.')).slice(0, 3500),
    version: String(v.version_number).slice(0, 40),
    minecraftVersion: v.game_versions.join(', ').slice(0, 40),
    downloadUrl: 'https://modrinth.com/plugin/' + PROJECT + '/version/' + v.id
  };
}

async function sync({ fetchImpl = fetch, secret, dryRun = false, log = console.log } = {}) {
  const request = async (url, options = {}) => {
    // Never print response bodies, cookies, headers, or secrets in CI logs.
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(30000), redirect: 'error', ...options });
    if (!response.ok) throw new Error('Request failed (' + response.status + ') for ' + new URL(url).pathname);
    return response;
  };
  const versions = await (await request('https://api.modrinth.com/v2/project/' + PROJECT + '/version', {
    headers: { 'User-Agent': 'NodeDistro/TNTHopperProtect-release-sync (github.com/Nodedistro/tnthopperprotect-site)' }
  })).json();
  const updates = await (await request(API + '/api/updates')).json();
  const pending = pendingVersions(versions, updates);
  log('Found ' + pending.length + ' unannounced stable releases.');
  if (dryRun) { pending.forEach(v => log('Would publish Modrinth version ' + v.id)); return pending.length; }
  if (!secret) throw new Error('Configure the RELEASE_PUBLISH_SECRET repository Actions secret using the backend admin secret.');
  if (!pending.length) return 0;
  const login = await request(API + '/api/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret })
  });
  const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  if (!cookie) throw new Error('Login did not return a session cookie');
  let count = 0;
  for (const version of pending) {
    // Re-read immediately before posting to catch prior successful/ambiguous runs.
    const current = await (await request(API + '/api/updates')).json();
    if (!pendingVersions([version], current).length) continue;
    const result = await (await request(API + '/api/admin/updates', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(toUpdate(version))
    })).json();
    if (result.discord?.sent !== true) {
      throw new Error('Website update saved for ' + version.id + ', but Discord delivery was not confirmed. Check backend logs and send the missing Discord announcement manually; do not delete/repost the website update.');
    }
    log('Published Modrinth version ' + version.id + ' to website and Discord.');
    count++;
  }
  return count;
}

if (require.main === module) {
  sync({ secret: process.env.RELEASE_PUBLISH_SECRET, dryRun: process.argv.includes('--dry-run') })
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { pendingVersions, toUpdate, versionId, sync };
