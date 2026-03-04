function formatMoney(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

function signupConfirmation({ firstName, minRequired, price, manageUrl, weekLabel }) {
  const subject = `You're on the list ✅ (Yard Sale Leftovers Pickup)`;

  const text = [
    `Hi ${firstName},`,
    '',
    `You're signed up for this week's Yard Sale Leftovers Pickup deal (${weekLabel}).`,
    `If we reach ${minRequired} signups, your pickup will be ${formatMoney(price)}.`,
    '',
    `Manage/cancel: ${manageUrl}`,
    '',
    'Rules (quick summary):',
    '- Pickup happens next Monday between 8:00am–6:00pm',
    '- Items must be curb-ready, bundled/boxed/bagged',
    '- Trash must be clearly labeled',
    '- Everything assumed donatable unless labeled trash',
    '- Included volume: up to 4 cubic yards (about four washing machines)',
    '',
    'Thanks!',
    'The Junkluggers'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.4">
      <h2>You're on the list ✅</h2>
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>
        You're signed up for this week's <strong>Yard Sale Leftovers Pickup</strong> deal (${weekLabel}).
        If we reach <strong>${minRequired}</strong> signups, your pickup will be <strong>${formatMoney(price)}</strong>.
      </p>
      <p><a href="${manageUrl}">Manage or cancel your signup</a></p>
      <hr />
      <p><strong>Rules (quick summary):</strong></p>
      <ul>
        <li>Pickup happens next Monday between <strong>8:00am–6:00pm</strong></li>
        <li>Small items must be curb-ready, bundled/boxed/bagged</li>
        <li>Trash must be clearly labeled</li>
        <li>Everything assumed donatable unless labeled trash</li>
        <li>Included volume: up to <strong>4 cubic yards</strong> (about four washing machines)</li>
      </ul>
      <p>Thanks!<br/>The Junkluggers</p>
    </div>
  `;

  return { subject, text, html };
}

function dealIsOn({ firstName, price, weekLabel, manageUrl }) {
  const subject = `Deal is ON 🎉 (${formatMoney(price)} pickup)`;

  const text = [
    `Hi ${firstName},`,
    '',
    `Good news — the deal is ON for ${weekLabel}.`,
    `Your Yard Sale Leftovers Pickup will be ${formatMoney(price)}.`,
    '',
    `Manage/cancel: ${manageUrl}`,
    '',
    'We’ll see you next Monday between 8:00am–6:00pm.',
    'The Junkluggers'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.4">
      <h2>Deal is ON 🎉</h2>
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Good news — the deal is ON for ${weekLabel}. Your pickup will be <strong>${formatMoney(price)}</strong>.</p>
      <p>Pickup happens next Monday between <strong>8:00am–6:00pm</strong>.</p>
      <p><a href="${manageUrl}">Manage or cancel your signup</a></p>
      <p>— The Junkluggers</p>
    </div>
  `;

  return { subject, text, html };
}

function thursdayStatus({ firstName, weekLabel, dealOn, remainingNeeded, spotsLeft, decisionCutoffLabel }) {
  const subject = dealOn
    ? `Deal is ON 🎉 (spots left: ${spotsLeft})`
    : `Status: we need ${remainingNeeded} more signups`;

  const text = dealOn
    ? [
        `Hi ${firstName},`,
        '',
        `Deal is ON for ${weekLabel}!`,
        `Spots left: ${spotsLeft}`,
        '',
        `Feel free to share the link with friends before signups close.`,
        '— The Junkluggers'
      ].join('\n')
    : [
        `Hi ${firstName},`,
        '',
        `Quick update for ${weekLabel}: we still need ${remainingNeeded} more signups for the deal to go live.`,
        `Deadline: ${decisionCutoffLabel}`,
        '',
        `If you can, share the link with friends.`,
        '— The Junkluggers'
      ].join('\n');

  const html = dealOn
    ? `
      <div style="font-family:Arial,sans-serif;line-height:1.4">
        <h2>Deal is ON 🎉</h2>
        <p>Hi <strong>${firstName}</strong>,</p>
        <p>Deal is ON for ${weekLabel}. Spots left: <strong>${spotsLeft}</strong>.</p>
        <p>Feel free to share the link with friends before signups close.</p>
        <p>— The Junkluggers</p>
      </div>
    `
    : `
      <div style="font-family:Arial,sans-serif;line-height:1.4">
        <h2>Status update</h2>
        <p>Hi <strong>${firstName}</strong>,</p>
        <p>We still need <strong>${remainingNeeded}</strong> more signups for the deal to go live for ${weekLabel}.</p>
        <p><strong>Deadline:</strong> ${decisionCutoffLabel}</p>
        <p>If you can, share the link with friends.</p>
        <p>— The Junkluggers</p>
      </div>
    `;

  return { subject, text, html };
}

function dealFailed({ firstName, weekLabel, couponCode }) {
  const subject = `Update: deal didn't reach the minimum`;

  const text = [
    `Hi ${firstName},`,
    '',
    `We didn't reach enough signups for the ${weekLabel} deal, so it won't run this week.`,
    '',
    `If you'd like a regular pickup on Monday, use coupon code ${couponCode} for 10% off.`,
    '',
    '— The Junkluggers'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.4">
      <h2>Deal didn't reach the minimum</h2>
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>We didn't reach enough signups for the ${weekLabel} deal, so it won't run this week.</p>
      <p>If you'd like a regular pickup on Monday, use coupon code <strong>${couponCode}</strong> for <strong>10% off</strong>.</p>
      <p>— The Junkluggers</p>
    </div>
  `;

  return { subject, text, html };
}

module.exports = {
  signupConfirmation,
  dealIsOn,
  thursdayStatus,
  dealFailed,
};
