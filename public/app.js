const path = location.pathname;
document.querySelectorAll('[data-nav]').forEach(a => {
  const href = a.getAttribute('href');
  if ((href === '/' && path === '/') || (href !== '/' && path.startsWith(href))) a.classList.add('active');
});

async function loadIssues(){
  const box=document.querySelector('#issues-list');
  if(!box) return;
  try{
    const r=await fetch('/api/issues');
    const issues=await r.json();
    if(!issues.length){box.innerHTML='<div class="card muted">No reports yet. Be the first to submit one.</div>';return;}
    box.innerHTML=issues.map(i=>`<article class="card issue"><div class="issue-top"><div><strong>#${escapeHtml(i.number)} ${escapeHtml(i.title)}</strong><div class="muted">${escapeHtml(i.category)} &middot; ${new Date(i.createdAt).toLocaleString()}</div></div><span class="pill">${escapeHtml(i.status)}</span></div><p>${escapeHtml(i.description)}</p>${i.minecraftVersion?`<div class="muted">Minecraft: ${escapeHtml(i.minecraftVersion)}${i.serverSoftware?` &middot; ${escapeHtml(i.serverSoftware)}`:''}</div>`:''}</article>`).join('');
  }catch{box.innerHTML='<div class="card">Could not load issue reports.</div>'}
}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

const form=document.querySelector('#issue-form');
if(form){
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const status=document.querySelector('#form-status');
    status.textContent='Submitting...';
    const data=Object.fromEntries(new FormData(form));
    const r=await fetch('/api/issues',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const body=await r.json();
    if(!r.ok){status.textContent=body.error||'Submission failed.';return;}
    status.textContent=`Report #${body.number} submitted successfully.`;
    form.reset();
    loadIssues();
  });
}
loadIssues();
