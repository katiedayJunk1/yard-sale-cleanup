// Frontend logic (plain HTML + JS)

const API_BASE = (window.JUNKDEAL_API_BASE || '').replace(/\/$/, '');

const el = {
  statusBadge: document.getElementById('statusBadge'),
  statusText: document.getElementById('statusText'),
  progressBar: document.getElementById('progressBar'),
  progressNumbers: document.getElementById('progressNumbers'),
  deadlines: document.getElementById('deadlines'),
  signupHelp: document.getElementById('signupHelp'),
  signupForm: document.getElementById('signupForm'),
  signupBtn: document.getElementById('signupBtn'),
  formMsg: document.getElementById('formMsg'),
};

function setMsg(text, ok = false) {
  el.formMsg.textContent = text;
  el.formMsg.className = ok ? 'form-msg ok' : 'form-msg';
}

function badge(status) {
  const s = String(status || '').toUpperCase();
  el.statusBadge.textContent = s || '—';
  el.statusBadge.className = 'badge ' + (s === 'ON' ? 'on' : s === 'FAILED' ? 'fail' : s === 'CLOSED' ? 'closed' : 'open');
}

async function fetchCurrentDeal() {
  if (!API_BASE || API_BASE.includes('YOUR-BACKEND')) {
    el.signupHelp.textContent = 'Admin: set your backend URL in config.js (window.JUNKDEAL_API_BASE).';
    badge('CONFIG');
    el.statusText.textContent = '';
    return null;
  }

  const r = await fetch(`${API_BASE}/api/deal/current`);
  if (!r.ok) throw new Error(`Failed to load deal status (${r.status})`);
  return r.json();
}

function renderDeal(d) {
  badge(d.status);

  const active = d.active_signups;
  const minReq = d.min_required;
  const maxAllowed = d.max_allowed;
  const spotsLeft = d.spots_left;

  // Progress: before ON -> progress toward min; once ON -> capacity bar
  const denom = d.status === 'ON' ? maxAllowed : minReq;
  const pct = denom ? Math.min(1, active / denom) * 100 : 0;
  el.progressBar.style.width = `${pct}%`;

  if (d.status === 'ON') {
    el.statusText.textContent = `Deal is ON 🎉 Spots left: ${spotsLeft}`;
    el.progressNumbers.textContent = `${active} / ${maxAllowed} signed up`;
  } else if (d.status === 'OPEN') {
    el.statusText.textContent = `We need ${Math.max(0, minReq - active)} more signups for the deal to go live.`;
    el.progressNumbers.textContent = `${active} / ${minReq} to turn deal ON (max ${maxAllowed})`;
  } else if (d.status === 'FAILED') {
    el.statusText.textContent = `This week’s deal did not reach the ${minReq}-signup minimum by Saturday at 9:00 PM, so signups are now closed.`;
    el.progressNumbers.textContent = `${active} / ${minReq} by the Saturday deadline`;
  } else if (d.status === 'CLOSED') {
    el.statusText.textContent = `Signups are closed for this week.`;
    el.progressNumbers.textContent = `${active} signups recorded`;
  }

  el.deadlines.textContent = `Minimum deadline: ${d.display.decision_cutoff_at} • Final signup close if deal is ON: ${d.display.signup_close_at}`;

  if (d.can_signup && spotsLeft > 0) {
    el.signupHelp.textContent = 'Signups are open.';
    el.signupBtn.disabled = false;
  } else if (!d.can_signup) {
    el.signupHelp.textContent = 'This week’s deal is closed because the Saturday 9:00 PM minimum signup deadline has passed.';
    el.signupBtn.disabled = true;
  } else {
    el.signupHelp.textContent = 'This week is full (max signups reached).';
    el.signupBtn.disabled = true;
  }
}

async function refresh() {
  try {
    const d = await fetchCurrentDeal();
    if (d) renderDeal(d);
  } catch (e) {
    badge('ERROR');
    el.statusText.textContent = e.message;
    el.signupHelp.textContent = 'Could not reach the backend. Double-check your Railway URL in config.js.';
    el.signupBtn.disabled = true;
  }
}

el.signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('Submitting…');
  el.signupBtn.disabled = true;

  try {
    const data = Object.fromEntries(new FormData(el.signupForm).entries());
    const r = await fetch(`${API_BASE}/api/deal/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || `Signup failed (${r.status})`);

    setMsg('You are on the list! Your pickup is not confirmed until the group minimum is reached and your invoice is paid. Check your email for your manage/cancel link.', true);
    el.signupForm.reset();
    await refresh();
  } catch (e2) {
    setMsg(e2.message);
    el.signupBtn.disabled = false;
  }
});

// Start
refresh();
setInterval(refresh, 30000);
