const express = require('express');
const helmet = require('helmet');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'issues.json');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

async function readIssues() {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeIssues(issues) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(issues, null, 2));
}

app.get('/api/issues', async (_req, res) => {
  try {
    const issues = await readIssues();
    res.json(issues.slice().reverse());
  } catch {
    res.status(500).json({ error: 'Unable to load issues.' });
  }
});

app.post('/api/issues', async (req, res) => {
  const { title, category, description, minecraftVersion, serverSoftware, contact } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  const issue = {
    id: crypto.randomUUID(),
    number: Date.now().toString().slice(-7),
    title: String(title).trim().slice(0, 120),
    category: String(category || 'Bug').trim().slice(0, 40),
    description: String(description).trim().slice(0, 5000),
    minecraftVersion: String(minecraftVersion || '').trim().slice(0, 40),
    serverSoftware: String(serverSoftware || '').trim().slice(0, 80),
    contact: String(contact || '').trim().slice(0, 120),
    status: 'Open',
    createdAt: new Date().toISOString()
  };

  try {
    const issues = await readIssues();
    issues.push(issue);
    await writeIssues(issues);
    res.status(201).json(issue);
  } catch {
    res.status(500).json({ error: 'Unable to save this report.' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/wiki', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'wiki.html'));
});

app.get('/issues', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'issues.html'));
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TNT Hopper Protect site running on http://localhost:${PORT}`);
});
