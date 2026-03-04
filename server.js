require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const cron = require('node-cron');
const { DateTime } = require('luxon');

const db = require('./database');
const emailService = require('./emailService');
const templates = require('./emailTemplates');

const app = express();

const PORT = process.env.PORT || 5000;
const TZ = process.env.TIMEZONE || 'America/Chicago';
const DEAL_PRICE = Number(process.env.DEAL_PRICE || 50);
const DEFAULT_MIN = Number(process.env.DEFAULT_MIN_REQUIRED || 10);
const DEFAULT_MAX = Number(process.env.DEFAULT_MAX_ALLOWED || 20);
const FRONTEND_URL = process.env.FRONTEND_URL || '*';
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || '';
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const COUPON_CODE = process.env.FAIL_COUPON_CODE || 'JUNK10';

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: FRONTEND_URL === '*' ? true : FRONTEND_URL,
  })
);

// --- time helpers ---
function nowCT() {
  return DateTime.now().setZone(TZ);
}

function getWeekStart(dt) {
  // Luxon weekday: Mon=1 ... Sun=7
  return dt.minus({ days: dt.weekday - 1 }).startOf('day');
}

function windowForWeek(weekStart) {
  const signupOpenAt = weekStart.set({ hour: 8, minute: 0, second: 0, millisecond: 0 });
  const decisionCutoffAt = weekStart.plus({ days: 5 }).set({ hour: 21, minute: 0, second: 0, millisecond: 0 }); // Sat 9pm
  const signupCloseAt = weekStart.plus({ days: 6 }).set({ hour: 21, minute: 0, second: 0, millisecond: 0 }); // Sun 9pm

  return { signupOpenAt, decisionCutoffAt, signupCloseAt };
}

function pretty(dt) {
  return dt.setZone(TZ).toFormat("ccc, LLL d 'at' h:mma ZZZZ");
}

function labelForWeek(weekStart) {
  return `${weekStart.toFormat('LLL d')} week`;
}

// --- db helpers ---
async function getOrCreateDealWeek(weekStartDateISO) {
  const existing = await db.query('SELECT * FROM deal_week WHERE week_start = $1', [weekStartDateISO]);
  if (existing.rows.length) return existing.rows[0];

  const created = await db.query(
    `INSERT INTO deal_week (week_start, min_required, max_allowed, status)
     VALUES ($1, $2, $3, 'OPEN')
     RETURNING *`,
    [weekStartDateISO, DEFAULT_MIN, DEFAULT_MAX]
  );
  return created.rows[0];
}

async function getActiveSignupCount(dealWeekId) {
  const r = await db.query('SELECT COUNT(*)::int AS c FROM signup WHERE deal_week_id = $1 AND status = $2', [dealWeekId, 'ACTIVE']);
  return r.rows[0].c;
}

async function listActiveSignups(dealWeekId) {
  const r = await db.query(
    `SELECT id, first_name, last_name, email, manage_token
     FROM signup
     WHERE deal_week_id = $1 AND status = 'ACTIVE'
     ORDER BY created_at ASC`,
    [dealWeekId]
  );
  return r.rows;
}

async function updateDealStatus(dealWeekId, status, triggeredAt = null) {
  const r = await db.query(
    `UPDATE deal_week
     SET status = $2,
         triggered_at = COALESCE($3, triggered_at),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [dealWeekId, status, triggeredAt]
  );
  return r.rows[0];
}

function computeStatus({ deal, activeCount, now, decisionCutoffAt, signupCloseAt }) {
  // Once ON, keep ON until signupCloseAt; then CLOSED.
  if (deal.status === 'ON') {
    return now > signupCloseAt ? 'CLOSED' : 'ON';
  }

  // If already failed/closed, keep it.
  if (deal.status === 'FAILED') return now > signupCloseAt ? 'CLOSED' : 'FAILED';
  if (deal.status === 'CLOSED') return 'CLOSED';

  // Not ON yet.
  if (now > decisionCutoffAt) {
    return 'FAILED';
  }

  // Before cutoff: still OPEN until threshold hit.
  return activeCount >= deal.min_required ? 'ON' : 'OPEN';
}

async function ensureStatusUpToDate(deal, now, windows, activeCount) {
  const nextStatus = computeStatus({ deal, activeCount, now, ...windows });

  if (nextStatus !== deal.status) {
    if (nextStatus === 'ON') {
      deal = await updateDealStatus(deal.id, 'ON', now.toISO());
      await sendDealOnEmails(deal);
    } else {
      deal = await updateDealStatus(deal.id, nextStatus);
    }
  }

  return deal;
}

// --- email helpers ---
async function alreadySent(dealWeekId, signupId, emailType) {
  const r = await db.query(
    'SELECT 1 FROM email_log WHERE deal_week_id = $1 AND signup_id = $2 AND email_type = $3 LIMIT 1',
    [dealWeekId, signupId, emailType]
  );
  return r.rows.length > 0;
}

async function logSent(dealWeekId, signupId, emailType) {
  await db.query(
    'INSERT INTO email_log (deal_week_id, signup_id, email_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [dealWeekId, signupId, emailType]
  );
}

function buildManageUrl(token) {
  if (!PUBLIC_SITE_URL) return '';
  const base = PUBLIC_SITE_URL.replace(/\/$/, '');
  return `${base}/manage.html?token=${encodeURIComponent(token)}`;
}

async function sendDealOnEmails(deal) {
  const signups = await listActiveSignups(deal.id);
  const label = labelForWeek(getWeekStart(nowCT()));

  for (const s of signups) {
    const type = 'DEAL_ON';
    if (await alreadySent(deal.id, s.id, type)) continue;

    const t = templates.dealIsOn({
      firstName: s.first_name,
      price: DEAL_PRICE,
      weekLabel: label,
      manageUrl: buildManageUrl(s.manage_token),
    });

    await emailService.sendEmail(s.email, t.subject, t.text, t.html);
    await logSent(deal.id, s.id, type);
  }
}

async function sendThursdayStatusEmails() {
  const now = nowCT();
  const weekStart = getWeekStart(now);
  const windows = windowForWeek(weekStart);
  const deal = await getOrCreateDealWeek(weekStart.toISODate());
  const activeCount = await getActiveSignupCount(deal.id);
  const updatedDeal = await ensureStatusUpToDate(deal, now, windows, activeCount);

  const signups = await listActiveSignups(updatedDeal.id);
  const remainingNeeded = Math.max(0, updatedDeal.min_required - activeCount);
  const spotsLeft = Math.max(0, updatedDeal.max_allowed - activeCount);
  const label = labelForWeek(weekStart);

  for (const s of signups) {
    const type = 'THU_STATUS';
    if (await alreadySent(updatedDeal.id, s.id, type)) continue;

    const t = templates.thursdayStatus({
      firstName: s.first_name,
      weekLabel: label,
      dealOn: updatedDeal.status === 'ON',
      remainingNeeded,
      spotsLeft,
      decisionCutoffLabel: pretty(windows.decisionCutoffAt),
    });

    await emailService.sendEmail(s.email, t.subject, t.text, t.html);
    await logSent(updatedDeal.id, s.id, type);
  }
}

async function sendSaturdayFailureEmailsIfNeeded() {
  const now = nowCT();
  const weekStart = getWeekStart(now);
  const windows = windowForWeek(weekStart);
  const deal = await getOrCreateDealWeek(weekStart.toISODate());
  const activeCount = await getActiveSignupCount(deal.id);

  // If it's already ON, nothing to do.
  if (deal.status === 'ON' || activeCount >= deal.min_required) {
    await ensureStatusUpToDate(deal, now, windows, activeCount);
    return;
  }

  // At/after cutoff, mark FAILED and email.
  if (now >= windows.decisionCutoffAt) {
    const updatedDeal = await updateDealStatus(deal.id, 'FAILED');
    const signups = await listActiveSignups(updatedDeal.id);
    const label = labelForWeek(weekStart);

    for (const s of signups) {
      const type = 'FAIL_SAT';
      if (await alreadySent(updatedDeal.id, s.id, type)) continue;

      const t = templates.dealFailed({
        firstName: s.first_name,
        weekLabel: label,
        couponCode: COUPON_CODE,
      });

      await emailService.sendEmail(s.email, t.subject, t.text, t.html);
      await logSent(updatedDeal.id, s.id, type);
    }
  }
}

// --- auth helper ---
function requireAdmin(req, res, next) {
  if (!ADMIN_KEY) return res.status(500).json({ error: 'ADMIN_KEY not configured on server' });
  const key = req.header('x-admin-key');
  if (!key || key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  return next();
}

// --- routes ---
app.get('/api/health', async (req, res) => {
  res.json({ status: 'OK' });
});

app.get('/api/deal/current', async (req, res, next) => {
  try {
    const now = nowCT();
    const weekStart = getWeekStart(now);
    const windows = windowForWeek(weekStart);

    let deal = await getOrCreateDealWeek(weekStart.toISODate());
    const activeCount = await getActiveSignupCount(deal.id);
    deal = await ensureStatusUpToDate(deal, now, windows, activeCount);

    const canSignup =
      now >= windows.signupOpenAt &&
      now <= windows.signupCloseAt &&
      (now <= windows.decisionCutoffAt || deal.status === 'ON');

    const spotsLeft = Math.max(0, deal.max_allowed - activeCount);

    res.json({
      week_start: deal.week_start,
      status: deal.status,
      min_required: deal.min_required,
      max_allowed: deal.max_allowed,
      active_signups: activeCount,
      spots_left: spotsLeft,
      can_signup: canSignup,
      signup_open_at: windows.signupOpenAt.toISO(),
      decision_cutoff_at: windows.decisionCutoffAt.toISO(),
      signup_close_at: windows.signupCloseAt.toISO(),
      display: {
        signup_open_at: pretty(windows.signupOpenAt),
        decision_cutoff_at: pretty(windows.decisionCutoffAt),
        signup_close_at: pretty(windows.signupCloseAt),
      },
    });
  } catch (e) {
    next(e);
  }
});

app.post('/api/deal/signup', async (req, res, next) => {
  try {
    const now = nowCT();
    const weekStart = getWeekStart(now);
    const windows = windowForWeek(weekStart);

    const { first_name, last_name, email, phone, street_address, city, state, zip } = req.body || {};

    const missing = [];
    for (const [k, v] of Object.entries({ first_name, last_name, email, phone, street_address, city, zip })) {
      if (!v || String(v).trim() === '') missing.push(k);
    }
    if (missing.length) return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });

    let deal = await getOrCreateDealWeek(weekStart.toISODate());
    const activeCount = await getActiveSignupCount(deal.id);
    deal = await ensureStatusUpToDate(deal, now, windows, activeCount);

    if (now < windows.signupOpenAt) {
      return res.status(403).json({ error: `Signups open ${pretty(windows.signupOpenAt)}.` });
    }
    if (now > windows.signupCloseAt) {
      return res.status(403).json({ error: 'Signups are closed.' });
    }

    // After Sat 9pm, only allow signups if deal is ON.
    if (now > windows.decisionCutoffAt && deal.status !== 'ON') {
      return res.status(403).json({ error: 'The deal did not go live. Signups are closed for this week.' });
    }

    if (activeCount >= deal.max_allowed) {
      return res.status(409).json({ error: 'This week is full (max signups reached).' });
    }

    const manageToken = crypto.randomBytes(24).toString('hex');

    await db.query(
      `INSERT INTO signup (
        deal_week_id, first_name, last_name, email, phone, street_address, city, state, zip, manage_token
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        deal.id,
        String(first_name).trim(),
        String(last_name).trim(),
        String(email).trim(),
        String(phone).trim(),
        String(street_address).trim(),
        String(city).trim(),
        state ? String(state).trim() : null,
        String(zip).trim(),
        manageToken,
      ]
    );

    // Confirmation email
    const label = labelForWeek(weekStart);
    const t = templates.signupConfirmation({
      firstName: String(first_name).trim(),
      minRequired: deal.min_required,
      price: DEAL_PRICE,
      manageUrl: buildManageUrl(manageToken),
      weekLabel: label,
    });
    await emailService.sendEmail(String(email).trim(), t.subject, t.text, t.html);

    // Recount and possibly trigger deal ON (only before Sat 9pm)
    const newCount = await getActiveSignupCount(deal.id);
    if (deal.status !== 'ON' && now <= windows.decisionCutoffAt && newCount >= deal.min_required) {
      deal = await updateDealStatus(deal.id, 'ON', now.toISO());
      await sendDealOnEmails(deal);
    }

    res.json({ ok: true, manage_token: manageToken });
  } catch (e) {
    next(e);
  }
});

app.post('/api/deal/cancel', async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Missing token' });

    const now = nowCT();
    const weekStart = getWeekStart(now);
    const windows = windowForWeek(weekStart);

    if (now > windows.signupCloseAt) {
      return res.status(403).json({ error: 'Cancellations are closed for this week.' });
    }

    const r = await db.query(
      `UPDATE signup
       SET status = 'CANCELED', canceled_at = now()
       WHERE manage_token = $1 AND status = 'ACTIVE'
       RETURNING id, deal_week_id`,
      [token]
    );

    if (!r.rows.length) return res.status(404).json({ error: 'Signup not found (or already canceled).' });

    const dealWeekId = r.rows[0].deal_week_id;
    const activeCount = await getActiveSignupCount(dealWeekId);
    res.json({ ok: true, active_signups: activeCount });
  } catch (e) {
    next(e);
  }
});

// --- admin ---
app.get('/api/admin/deal/current/signups', requireAdmin, async (req, res, next) => {
  try {
    const now = nowCT();
    const weekStart = getWeekStart(now);
    const deal = await getOrCreateDealWeek(weekStart.toISODate());

    const r = await db.query(
      `SELECT id, first_name, last_name, email, phone, street_address, city, state, zip, created_at, status
       FROM signup
       WHERE deal_week_id = $1
       ORDER BY created_at ASC`,
      [deal.id]
    );

    res.json({
      week_start: deal.week_start,
      deal_status: deal.status,
      min_required: deal.min_required,
      max_allowed: deal.max_allowed,
      signups: r.rows,
    });
  } catch (e) {
    next(e);
  }
});

app.get('/api/admin/deal/current/export.csv', requireAdmin, async (req, res, next) => {
  try {
    const now = nowCT();
    const weekStart = getWeekStart(now);
    const deal = await getOrCreateDealWeek(weekStart.toISODate());

    const r = await db.query(
      `SELECT first_name, last_name, email, phone, street_address, city, state, zip, created_at, status
       FROM signup
       WHERE deal_week_id = $1
       ORDER BY created_at ASC`,
      [deal.id]
    );

    const header = ['first_name','last_name','email','phone','street_address','city','state','zip','created_at','status'];
    const rows = r.rows.map(row => header.map(h => {
      const v = row[h] == null ? '' : String(row[h]);
      if (/[\",\n]/.test(v)) return `\"${v.replace(/\"/g,'\"\"')}\"`;
      return v;
    }).join(','));

    const csv = [header.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=signups-${weekStart.toISODate()}.csv`);
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

app.patch('/api/admin/deal/current/settings', requireAdmin, async (req, res, next) => {
  try {
    const now = nowCT();
    const weekStart = getWeekStart(now);
    const windows = windowForWeek(weekStart);

    const { min_required, max_allowed } = req.body || {};
    if (min_required == null && max_allowed == null) {
      return res.status(400).json({ error: 'Provide min_required and/or max_allowed' });
    }

    const deal = await getOrCreateDealWeek(weekStart.toISODate());
    const newMin = min_required == null ? deal.min_required : Number(min_required);
    const newMax = max_allowed == null ? deal.max_allowed : Number(max_allowed);

    if (!Number.isFinite(newMin) || !Number.isFinite(newMax)) {
      return res.status(400).json({ error: 'min_required / max_allowed must be numbers' });
    }
    if (newMin < 1) return res.status(400).json({ error: 'min_required must be >= 1' });
    if (newMax < newMin) return res.status(400).json({ error: 'max_allowed must be >= min_required' });

    const updated = await db.query(
      `UPDATE deal_week
       SET min_required = $2,
           max_allowed = $3,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [deal.id, newMin, newMax]
    );

    let d = updated.rows[0];
    const activeCount = await getActiveSignupCount(d.id);

    // Only allow deal to trigger ON before Sat 9pm.
    if (d.status !== 'ON' && now <= windows.decisionCutoffAt && activeCount >= d.min_required) {
      d = await updateDealStatus(d.id, 'ON', now.toISO());
      await sendDealOnEmails(d);
    }

    res.json({
      ok: true,
      week_start: d.week_start,
      status: d.status,
      min_required: d.min_required,
      max_allowed: d.max_allowed,
      active_signups: activeCount,
    });
  } catch (e) {
    next(e);
  }
});

// error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// startup
(async () => {
  try {
    await db.connect();
    await db.initSchema();
    await emailService.initialize();

    // Scheduled emails (CT)
    cron.schedule(
      '0 10 * * 4',
      async () => {
        console.log('📧 Thursday status job running...');
        await sendThursdayStatusEmails();
      },
      { timezone: TZ }
    );

    cron.schedule(
      '0 21 * * 6',
      async () => {
        console.log('📧 Saturday cutoff job running...');
        await sendSaturdayFailureEmailsIfNeeded();
      },
      { timezone: TZ }
    );

    app.listen(PORT, () => {
      console.log(`✅ Backend running on port ${PORT}`);
    });
  } catch (e) {
    console.error('Startup failed:', e);
    process.exit(1);
  }
})();
