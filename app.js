// Step 6 polish: selection highlight, keyboard nav, robust logo fallback, save/delete kept

function qs(sel) {
  const list = Array.isArray(sel) ? sel : [sel];
  for (const s of list) { const el = document.querySelector(s); if (el) return el; }
  return null;
}
function statusBanner(text, ok = true) {
  let bar = document.getElementById('lab02-status');
  if (!bar) {
    bar = document.createElement('div');
    Object.assign(bar, { id: 'lab02-status' });
    Object.assign(bar.style, {
      position: 'fixed', top: '0', left: '0', right: '0', zIndex: '9999',
      padding: '6px 10px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '12px', color: '#fff', pointerEvents: 'none',
      background: ok ? 'rgba(24,160,88,.9)' : 'rgba(200,64,64,.95)'
    });
    document.body.appendChild(bar);
  }
  bar.textContent = text;
}
function toArray(maybe) {
  try {
    if (Array.isArray(maybe)) return maybe;
    if (typeof maybe === 'string') return JSON.parse(maybe);
    if (maybe && Array.isArray(maybe.data)) return maybe.data;
  } catch (e) { console.error('parse error:', e); }
  return [];
}

function renderUserList(users, selectedId = null) {
  const ul = qs('.user-list');
  if (!ul) return;
  ul.setAttribute('role', 'listbox');
  ul.innerHTML = '';
  users.forEach(({ user, id }) => {
    const li = document.createElement('li');
    li.textContent = `${user?.lastname ?? ''}, ${user?.firstname ?? ''}`;
    li.dataset.id = String(id ?? '');
    li.tabIndex = 0;
    li.setAttribute('role', 'option');
    if (String(id) === String(selectedId)) {
      li.classList.add('selected');
      li.setAttribute('aria-selected', 'true');
    }
    ul.appendChild(li);
  });
}

function fillUserForm(data) {
  const blank = { user:{ firstname:'', lastname:'', address:'', city:'', email:'' }, id:'' };
  const { user, id } = data || blank;
  const set = (sel, val) => { const el = qs(sel); if (el) el.value = val ?? ''; };
  set('#userID', id);
  set('#firstname', user?.firstname);
  set('#lastname',  user?.lastname);
  set('#address',   user?.address);
  set('#city',      user?.city);
  set('#email',     user?.email);
}
function clearUserForm() {
  ['#userID','#firstname','#lastname','#address','#city','#email'].forEach(s=>{
    const el = qs(s); if (el) el.value = '';
  });
}

function renderPortfolio(user, stocks) {
  const box = qs('.portfolio-list');
  if (!box) return;

  box.innerHTML = '';
  const h1 = document.createElement('h3'); h1.textContent = 'Symbol';
  const h2 = document.createElement('h3'); h2.textContent = '# Shares';
  const h3 = document.createElement('h3'); h3.textContent = 'Actions';
  box.append(h1, h2, h3);

  const list = user?.portfolio ?? [];
  list.forEach(({ symbol, owned }) => {
    const sym = document.createElement('p');      sym.textContent = symbol;
    const sh  = document.createElement('p');      sh.textContent  = owned;
    const btn = document.createElement('button'); btn.textContent = 'View';
    btn.className = 'view-btn';
    btn.dataset.symbol = symbol;
    box.append(sym, sh, btn);
  });
}
function clearPortfolio() {
  const box = qs('.portfolio-list');
  if (!box) return;
  box.innerHTML = '';
  const h1 = document.createElement('h3'); h1.textContent = 'Symbol';
  const h2 = document.createElement('h3'); h2.textContent = '# Shares';
  const h3 = document.createElement('h3'); h3.textContent = 'Actions';
  box.append(h1, h2, h3);
}

function clearStockDetails() {
  ['#stockName','#stockSector','#stockIndustry','#stockAddress'].forEach(s=>{
    const el = qs(s); if (el) el.textContent = '';
  });
  const logo = qs('#logo'); if (logo) logo.removeAttribute('src'), logo.style.display = '';
  const fb = document.getElementById('logoFallback'); if (fb) fb.style.display = 'none';
}
function showLogoFallback(symbol) {
  const container = qs('.logoContainer');
  if (!container) return;
  let fb = document.getElementById('logoFallback');
  if (!fb) {
    fb = document.createElement('div');
    fb.id = 'logoFallback';
    Object.assign(fb.style, {
      width: '64px', height: '64px', display: 'grid', placeItems: 'center',
      border: '1px solid #ccc', borderRadius: '8px', fontWeight: '600'
    });
    container.appendChild(fb);
  }
  fb.textContent = symbol || '—';
  fb.style.display = 'grid';
}
function viewStock(symbol, stocks) {
  if (!symbol) return;
  const stock = stocks.find(s => String(s.symbol).toUpperCase() === String(symbol).toUpperCase());
  const setText = (sel, val) => { const el = qs(sel); if (el) el.textContent = val ?? ''; };

  setText('#stockName',     stock?.name);
  setText('#stockSector',   stock?.sector);
  setText('#stockIndustry', stock?.subIndustry ?? stock?.industry ?? '');
  setText('#stockAddress',  stock?.address);

  const logo = qs('#logo');
  if (logo) {
    const onerr = () => { logo.removeAttribute('src'); logo.style.display = 'none'; showLogoFallback(symbol); };
    logo.onerror = onerr;
    logo.onload  = () => { const fb = document.getElementById('logoFallback'); if (fb) fb.style.display = 'none'; logo.style.display = ''; };
    logo.src = `logos/${symbol}.svg`;
    // in case it fails instantly (cache/missing), onerror will run
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // pull globals declared via `const` in classic scripts
  let rawUsers, rawStocks, usersKey = null, stocksKey = null;
  try { rawUsers = userContent;  usersKey  = 'userContent'; } catch {}
  try { rawStocks = stockContent; stocksKey = 'stockContent'; } catch {}

  const userData   = toArray(rawUsers);
  const stocksData = toArray(rawStocks);

  statusBanner(
    `Detected users="${usersKey || 'N/A'}" (${userData.length}) | stocks="${stocksKey || 'N/A'}" (${stocksData.length})`,
    userData.length + stocksData.length > 0
  );

  let currentId = null;
  renderUserList(userData, currentId);

  // selection helper
  function selectUserById(id) {
    const u = userData.find(x => x.id == id);
    if (!u) return;
    currentId = String(u.id);
    fillUserForm(u);
    renderPortfolio(u, stocksData);
    clearStockDetails();
    renderUserList(userData, currentId); // update highlight
  }

  // click selection
  const ul = qs('.user-list');
  if (ul) {
    ul.addEventListener('click', (evt) => {
      const li = evt.target.closest('li');
      if (li?.dataset.id) selectUserById(li.dataset.id);
    });

    // keyboard: ↑/↓ to move focus; Enter/Space to select
    ul.addEventListener('keydown', (evt) => {
      const items = [...ul.querySelectorAll('li')];
      const focusedIndex = items.findIndex(el => el === document.activeElement);
      const selectedIndex = currentId ? items.findIndex(el => el.dataset.id === currentId) : -1;
      const base = focusedIndex >= 0 ? focusedIndex : (selectedIndex >= 0 ? selectedIndex : 0);

      if (evt.key === 'ArrowDown') {
        evt.preventDefault();
        const next = Math.min(base + 1, items.length - 1);
        items[next]?.focus();
      } else if (evt.key === 'ArrowUp') {
        evt.preventDefault();
        const prev = Math.max(base - 1, 0);
        items[prev]?.focus();
      } else if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        const id = document.activeElement?.dataset.id;
        if (id) selectUserById(id);
      }
    });
  }

  // portfolio: view stock
  const portfolioBox = qs('.portfolio-list');
  if (portfolioBox) {
    portfolioBox.addEventListener('click', (evt) => {
      const btn = evt.target.closest('button.view-btn');
      if (!btn) return;
      viewStock(btn.dataset.symbol, stocksData);
    });
  }

  // SAVE
  const saveBtn = qs('#btnSave');
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = qs('#userID')?.value;
      if (!id) return;
      const idx = userData.findIndex(u => u.id == id);
      if (idx === -1) return;

      userData[idx].user.firstname = qs('#firstname')?.value || '';
      userData[idx].user.lastname  = qs('#lastname')?.value  || '';
      userData[idx].user.address   = qs('#address')?.value   || '';
      userData[idx].user.city      = qs('#city')?.value      || '';
      userData[idx].user.email     = qs('#email')?.value     || '';

      renderUserList(userData, id);
      selectUserById(id);
      statusBanner('Saved user changes ✔︎', true);
    });
  }

  // DELETE
  const delBtn = qs('#btnDelete');
  if (delBtn) {
    delBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = qs('#userID')?.value;
      if (!id) return;
      const idx = userData.findIndex(u => u.id == id);
      if (idx === -1) return;

      // compute a next selection (next or previous)
      const nextUser = userData[idx + 1] ?? userData[idx - 1] ?? null;

      userData.splice(idx, 1);
      renderUserList(userData, nextUser?.id ?? null);

      if (nextUser) {
        selectUserById(nextUser.id);
      } else {
        currentId = null;
        clearUserForm();
        clearPortfolio();
        clearStockDetails();
      }
      statusBanner('Deleted user ✔︎', true);
    });
  }

  console.log('Polish applied: selection highlight, keyboard nav, logo fallback, save & delete.');
});
