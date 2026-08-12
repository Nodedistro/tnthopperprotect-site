const express = require('express');
const helmet = require('helmet');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ISSUES_FILE = path.join(DATA_DIR, 'issues.json');
const UPDATES_FILE = path.join(DATA_DIR, 'updates.json');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '96kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const isVercel = Boolean(process.env.VERCEL);
const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

function clean(value, max = 5000) {
  return String(value ?? '').trim().slice(0, max);
}

async function readJson(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (err) { if (err.code === 'ENOENT') return []; throw err; }
}
async function writeJson(file, rows) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(rows, null, 2));
}

async function supabaseRequest(table, options = {}) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${table}${options.query || ''}`;
  const headers = {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: options.prefer || 'return=representation'
  };
  const r = await fetch(url, { method: options.method || 'GET', headers, body: options.body ? JSON.stringify(options.body) : undefined });
  if (!r.ok) throw new Error(`Supabase ${table}: ${r.status} ${await r.text()}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

async function listIssues() {
  if (hasSupabase) return supabaseRequest('issues', { query: '?select=*&order=createdAt.desc' });
  return (await readJson(ISSUES_FILE)).slice().reverse();
}
async function insertIssue(issue) {
  if (hasSupabase) return (await supabaseRequest('issues', { method: 'POST', body: issue }))[0];
  if (isVercel) throw new Error('Persistent storage is not configured. Add Supabase environment variables.');
  const rows = await readJson(ISSUES_FILE); rows.push(issue); await writeJson(ISSUES_FILE, rows); return issue;
}
async function listUpdates() {
  if (hasSupabase) return supabaseRequest('updates', { query: '?select=*&order=createdAt.desc' });
  return (await readJson(UPDATES_FILE)).slice().reverse();
}
async function insertUpdate(update) {
  if (hasSupabase) return (await supabaseRequest('updates', { method: 'POST', body: update }))[0];
  if (isVercel) throw new Error('Persistent storage is not configured. Add Supabase environment variables.');
  const rows = await readJson(UPDATES_FILE); rows.push(update); await writeJson(UPDATES_FILE, rows); return update;
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(x => x.trim()).filter(Boolean).map(x => {
    const i = x.indexOf('='); return i === -1 ? [x, ''] : [x.slice(0, i), decodeURIComponent(x.slice(i + 1))];
  }));
}
function signSession(payload) {
  const secret = process.env.ADMIN_SECRET || '';
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}
function verifySession(token) {
  if (!token || !process.env.ADMIN_SECRET) return false;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return false;
  const expected = crypto.createHmac('sha256', process.env.ADMIN_SECRET).update(encoded).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    return payload.exp > Date.now();
  } catch { return false; }
}
function requireAdmin(req, res, next) {
  if (!verifySession(parseCookies(req).nd_admin)) return res.status(401).json({ error: 'Admin login required.' });
  next();
}

async function sendDiscordUpdate(update) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_UPDATE_CHANNEL_ID;
  if (!token || !channelId) return { sent: false, reason: 'Discord is not configured.' };

  const fields = [];
  if (update.version) fields.push({ name: 'Version', value: update.version, inline: true });
  if (update.minecraftVersion) fields.push({ name: 'Minecraft', value: update.minecraftVersion, inline: true });
  if (update.downloadUrl) fields.push({ name: 'Download', value: `[Open download page](${update.downloadUrl})`, inline: false });

  const body = {
    embeds: [{
      title: `🛒 ${update.title || 'TNT Hopper Protect Update'}`,
      description: update.description || 'A new TNT Hopper Protect update has been published.',
      fields,
      color: 16731438,
      timestamp: update.createdAt,
      footer: { text: 'NodeDistro MC Plugins • TNT Hopper Protect' }
    }],
    allowed_mentions: { parse: [] }
  };

  const r = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Discord API ${r.status}: ${await r.text()}`);
  return { sent: true };
}

app.get('/api/issues', async (_req, res) => {
  try {
    const issues = await listIssues();
    res.json(issues.map(({ contact, ...publicIssue }) => publicIssue));
  }
  catch (err) { console.error(err); res.status(500).json({ error: 'Unable to load issues.' }); }
});

app.post('/api/issues', async (req, res) => {
  const { title, category, description, minecraftVersion, serverSoftware, contact } = req.body;
  if (!clean(title) || !clean(description)) return res.status(400).json({ error: 'Title and description are required.' });
  const issue = {
    id: crypto.randomUUID(), number: Date.now().toString().slice(-7),
    title: clean(title, 120), category: clean(category || 'Bug', 40), description: clean(description, 5000),
    minecraftVersion: clean(minecraftVersion, 40), serverSoftware: clean(serverSoftware, 80), contact: clean(contact, 120),
    status: 'Open', createdAt: new Date().toISOString()
  };
  try { res.status(201).json(await insertIssue(issue)); }
  catch (err) { console.error(err); res.status(500).json({ error: err.message.includes('Persistent storage') ? err.message : 'Unable to save this report.' }); }
});

app.get('/api/updates', async (_req, res) => {
  try { res.json(await listUpdates()); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Unable to load updates.' }); }
});

app.post('/api/admin/login', (req, res) => {
  const supplied = clean(req.body.secret, 300);
  const expected = process.env.ADMIN_SECRET || '';
  if (!expected) return res.status(503).json({ error: 'ADMIN_SECRET is not configured.' });
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Invalid admin secret.' });
  const token = signSession({ exp: Date.now() + 8 * 60 * 60 * 1000 });
  res.setHeader('Set-Cookie', `nd_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === 'production' || isVercel ? '; Secure' : ''}`);
  res.json({ ok: true });
});
app.post('/api/admin/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'nd_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});
app.get('/api/admin/session', requireAdmin, (_req, res) => res.json({ authenticated: true }));

app.post('/api/admin/updates', requireAdmin, async (req, res) => {
  const title = clean(req.body.title, 120), description = clean(req.body.description, 3500);
  if (!title || !description) return res.status(400).json({ error: 'Title and description are required.' });
  const update = {
    id: crypto.randomUUID(), title, description,
    version: clean(req.body.version, 40), minecraftVersion: clean(req.body.minecraftVersion, 40),
    downloadUrl: clean(req.body.downloadUrl, 500), createdAt: new Date().toISOString()
  };
  try {
    const saved = await insertUpdate(update);
    let discord;
    try { discord = await sendDiscordUpdate(saved); }
    catch (err) { console.error(err); discord = { sent: false, reason: err.message }; }
    res.status(201).json({ update: saved, discord });
  } catch (err) {
    console.error(err); res.status(500).json({ error: err.message.includes('Persistent storage') ? err.message : 'Unable to publish update.' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true, storage: hasSupabase ? 'supabase' : (isVercel ? 'not-configured' : 'local-json'), discord: Boolean(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_UPDATE_CHANNEL_ID) }));

app.get('/wiki', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'wiki.html')));
app.get('/issues', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'issues.html')));
app.get('/updates', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'updates.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.get('/*splat', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

if (require.main === module) app.listen(PORT, () => console.log(`TNT Hopper Protect site running on http://localhost:${PORT}`));
module.exports = app;
