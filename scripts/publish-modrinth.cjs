const fs = require('node:fs');
const path = require('node:path');

const project = 'tnt-hopper-protect';
const version = process.env.MOD_VERSION;
const minecraft = process.env.MINECRAFT_VERSION;
const token = process.env.MODRINTH_TOKEN;
const root = process.env.ARTIFACT_DIR || 'jars';

if (!version || !minecraft || !token) throw new Error('MOD_VERSION, MINECRAFT_VERSION, and MODRINTH_TOKEN are required');

const targets = [
  ['paper', 'Paper'],
  ['fabric', 'Fabric'],
  ['forge', 'Forge'],
  ['neoforge', 'NeoForge']
];

async function main() {
  const headers = { Authorization: token, 'User-Agent': 'NodeDistro/TNTHopperProtect-release-publisher' };
  const projectInfoResponse = await fetch(`https://api.modrinth.com/v2/project/${project}`, { headers });
  if (!projectInfoResponse.ok) throw new Error(`Could not resolve Modrinth project (${projectInfoResponse.status})`);
  const projectInfo = await projectInfoResponse.json();
  const projectId = projectInfo.id;
  const existingResponse = await fetch(`https://api.modrinth.com/v2/project/${project}/version`, { headers });
  if (!existingResponse.ok) throw new Error(`Could not read existing Modrinth versions (${existingResponse.status})`);
  const existing = await existingResponse.json();
  for (const [loader, label] of targets) {
    if (existing.some(v => v.version_number === version && v.loaders?.includes(loader))) {
      console.log(`Skipping existing ${label} ${version}`);
      continue;
    }
    const file = fs.readdirSync(root).find(name => name.toLowerCase().includes(loader) && name.endsWith('.jar'));
    if (!file) throw new Error(`No ${label} jar found in ${root}`);
    const data = {
      name: `TNT Hopper Protect ${version} — ${label}`,
      version_number: version,
      changelog: `Minecraft ${minecraft} ${label} release.`,
      game_versions: [minecraft],
      loaders: [loader.toLowerCase()],
      version_type: 'release',
      status: 'listed',
      project_id: projectId,
      file_parts: ['file'],
      primary_file: 'file',
      environment: 'server_only'
    };
    const form = new FormData();
    form.append('data', JSON.stringify(data));
    form.append('file', new Blob([fs.readFileSync(path.join(root, file))]), file);
    const response = await fetch('https://api.modrinth.com/v2/version', { method: 'POST', headers, body: form });
    if (!response.ok) throw new Error(`${label} upload failed (${response.status}): ${await response.text()}`);
    console.log(`Published ${label} ${version} as ${file}`);
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
