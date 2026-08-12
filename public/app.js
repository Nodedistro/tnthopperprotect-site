const path = location.pathname;
document.querySelectorAll('[data-nav]').forEach(a => {
  const href = a.getAttribute('href');
  if ((href === '/' && path === '/') || (href !== '/' && path.startsWith(href))) a.classList.add('active');
});
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function safeUrl(s=''){ try { const u=new URL(s); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
async function loadIssues(){
  const box=document.querySelector('#issues-list'); if(!box) return;
  try{
    const r=await fetch('/api/issues'); const issues=await r.json(); if(!r.ok) throw new Error();
    if(!issues.length){box.innerHTML='<div class="card muted">No reports yet. Be the first to submit one.</div>';return;}
    box.innerHTML=issues.map(i=>`<article class="card issue"><div class="issue-top"><div><strong>#${escapeHtml(i.number)} ${escapeHtml(i.title)}</strong><div class="muted">${escapeHtml(i.category)} · ${new Date(i.createdAt).toLocaleString()}</div></div><span class="pill">${escapeHtml(i.status)}</span></div><p>${escapeHtml(i.description)}</p>${i.minecraftVersion?`<div class="muted">Minecraft: ${escapeHtml(i.minecraftVersion)}${i.serverSoftware?` · ${escapeHtml(i.serverSoftware)}`:''}</div>`:''}</article>`).join('');
  }catch{box.innerHTML='<div class="card">Could not load issue reports.</div>'}
}
async function loadUpdates(){
  const box=document.querySelector('#updates-list'); if(!box) return;
  try{
    const r=await fetch('/api/updates'); const updates=await r.json(); if(!r.ok) throw new Error();
    if(!updates.length){box.innerHTML='<div class="card muted">No updates have been published yet.</div>';return;}
    box.innerHTML=updates.map(u=>{const url=safeUrl(u.downloadUrl);return `<article class="card update-card"><div class="update-meta"><span class="pill">${escapeHtml(u.version||'Update')}</span><span class="muted">${new Date(u.createdAt).toLocaleString()}</span></div><h2>${escapeHtml(u.title)}</h2><p class="changelog">${escapeHtml(u.description).replace(/\n/g,'<br>')}</p>${u.minecraftVersion?`<div class="muted">Minecraft ${escapeHtml(u.minecraftVersion)}</div>`:''}${url?`<div class="actions"><a class="btn primary" href="${escapeHtml(url)}" target="_blank" rel="noopener">Download</a></div>`:''}</article>`}).join('');
  }catch{box.innerHTML='<div class="card">Could not load project updates.</div>'}
}
const form=document.querySelector('#issue-form');
if(form){form.addEventListener('submit',async e=>{e.preventDefault();const status=document.querySelector('#form-status');status.textContent='Submitting…';try{const data=Object.fromEntries(new FormData(form));const r=await fetch('/api/issues',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const body=await r.json();if(!r.ok){status.textContent=body.error||'Submission failed.';return;}status.textContent=`Report #${body.number} submitted successfully.`;form.reset();loadIssues();}catch{status.textContent='Submission failed.'}})}
loadIssues(); loadUpdates();
