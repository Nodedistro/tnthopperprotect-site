const loginBox = document.querySelector('#admin-login');
const dashboard = document.querySelector('#admin-dashboard');
const loginForm = document.querySelector('#login-form');
const updateForm = document.querySelector('#update-form');
const loginStatus = document.querySelector('#login-status');
const publishStatus = document.querySelector('#publish-status');
const { apiUrl } = window.TNTHopperProtectApi;

async function jsonFetch(path, options={}) {
  const r = await fetch(apiUrl(path), { ...options, credentials: 'include' });
  let body = {}; try { body = await r.json(); } catch {}
  if (!r.ok) throw new Error(body.error || `Request failed (${r.status})`);
  return body;
}
async function checkSession() {
  try { await jsonFetch('/api/admin/session'); loginBox.hidden = true; dashboard.hidden = false; showApiStatus(); }
  catch { loginBox.hidden = false; dashboard.hidden = true; }
}
function showApiStatus() {
  document.querySelector('#health-status').innerHTML = `
    <div class="status-row"><span>API</span><strong>✅ Connected</strong></div>
    <div class="status-row"><span>Admin session</span><strong>✅ Authenticated</strong></div>`;
}
loginForm?.addEventListener('submit', async e => {
  e.preventDefault(); loginStatus.textContent = 'Signing in…';
  try { await jsonFetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ secret:new FormData(loginForm).get('secret') }) }); loginForm.reset(); loginStatus.textContent=''; await checkSession(); }
  catch(err) { loginStatus.textContent = err.message; }
});
updateForm?.addEventListener('submit', async e => {
  e.preventDefault(); publishStatus.textContent = 'Publishing…';
  try {
    const body = Object.fromEntries(new FormData(updateForm));
    const result = await jsonFetch('/api/admin/updates', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    publishStatus.textContent = result.discord?.sent ? 'Published successfully and sent to Discord.' : `Published successfully. Discord: ${result.discord?.reason || 'not sent'}`;
    updateForm.reset();
  } catch(err) { publishStatus.textContent = err.message; }
});
document.querySelector('#logout')?.addEventListener('click', async () => { await jsonFetch('/api/admin/logout', {method:'POST'}); await checkSession(); });
checkSession();
