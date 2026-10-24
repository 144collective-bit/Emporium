/*
 * The account card (account.ts does the talking): log in, sign up, forgot
 * your password, a reset link's new password, and, logged in, the account:
 * its username, private email and password to change, and Log out. Opened
 * from the header's Log in button, the walk Profile tab, the Online pill and
 * the Multiplayer menu; closes with its ×, a tap outside or Esc. It's made
 * with the page (CityMap.astro), not with the 3D city, so it works on the 2D
 * map too and before the 3D city has loaded.
 *
 * The username is the name other players see (filtered as it's typed, and
 * again by the server). The email is only ever shown to its owner, here.
 */
import { USERNAME_MAX, emailOk, passwordProblem, usernameProblem, type AuthConfig } from '../net/auth';
import { RANKS } from '../net/profile-data';
import { resetInAddress, type Account } from './account';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = new Intl.NumberFormat('en-US');

/** What the card needs from the rest of the page. The default works without the 3D city; index.ts sets its own. */
export interface AccountHooks {
  /** The card opened (walk mode frees the mouse) */
  opened(): void;
}

type View = 'login' | 'signup' | 'forgot' | 'reset';
/** What's being changed on a logged-in account */
type Edit = 'name' | 'email' | 'password' | null;

const USERNAME_HINT = `3 to ${USERNAME_MAX} letters, numbers, _ and -. Other players see it.`;
const EMAIL_HINT = 'Your password reset link goes here. Nobody else sees it.';

export function createAccountUI(root: HTMLElement, account: Account, d: AccountHooks) {
  const card = root.querySelector<HTMLElement>('[data-account]')!;
  const body = card.querySelector<HTMLElement>('[data-account-body]')!;
  const navBtn = document.querySelector<HTMLButtonElement>('[data-account-nav]');
  const openers = [...root.querySelectorAll<HTMLButtonElement>('[data-account-open]'), ...(navBtn ? [navBtn] : [])];
  let view: View = 'login';
  let edit: Edit = null;
  let busy = '';
  let error = '';
  let note = '';
  let resetToken = '';
  let config: AuthConfig | null = null;
  /** What's typed in the fields, kept across repaints */
  const vals: Record<string, string> = {};
  let lastFocus: HTMLElement | null = null;

  function paintButtons() {
    const name = account.me?.username ?? (account.token ? 'Account' : '');
    if (navBtn) {
      const label = navBtn.querySelector('[data-account-label]')!;
      label.textContent = name || 'Log in';
      navBtn.classList.toggle('is-in', !!account.token);
      navBtn.setAttribute('aria-label', account.token ? `Your account: ${name}` : 'Log in or make an account');
    }
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-account-open]')) {
      b.hidden = false;
      b.textContent = account.token ? `Account · ${name}` : 'Log in';
    }
  }

  /* ---------- Pieces ---------- */

  const head = (kicker: string, title: string) =>
    `<p class="kicker"><span class="kicker-num">Account</span> ${esc(kicker)}</p><h2 class="city-panel-title" id="account-title">${title}</h2>`;
  const err = () => (error ? `<p class="account-error" role="alert">${esc(error)}</p>` : '') + (note ? `<p class="account-note" role="status">${esc(note)}</p>` : '');
  const field = (f: string, label: string, type: string, auto: string, hint = '') =>
    `<label class="acct-field"><span>${esc(label)}</span><input type="${type}" data-f="${f}" name="${f}" autocomplete="${auto}" value="${esc(vals[f] ?? '')}" ${type === 'text' ? 'autocapitalize="off" spellcheck="false"' : ''} required>${hint ? `<small data-hint="${f}">${esc(hint)}</small>` : ''}</label>`;
  const submit = (label: string) => `<button type="submit" class="btn-pulse acct-submit" ${busy ? 'disabled' : ''}>${esc(busy || label)}</button>`;
  const cancel = '<button type="button" class="acct-link" data-acct="cancel-edit">Cancel</button>';

  /* ---------- The views ---------- */

  function loginView() {
    return `${head('Multiplayer', 'Log in')}
      <p class="city-panel-text">Playing online needs an account. Single player never does.</p>
      <form class="acct-form" data-form="login">
        ${field('name', 'Username or email', 'text', 'username')}
        ${field('password', 'Password', 'password', 'current-password')}
        ${err()}
        ${submit('Log in')}
      </form>
      <button type="button" class="acct-link" data-acct="forgot">Forgot your password?</button>
      <p class="city-panel-fine">New here? <button type="button" class="acct-link" data-acct="signup">Make an account</button></p>`;
  }

  function signupView() {
    const problem = vals.username ? usernameProblem(vals.username) : null;
    return `${head('Multiplayer', 'Make an account')}
      <form class="acct-form" data-form="signup">
        ${field('username', 'Username', 'text', 'username', problem ?? USERNAME_HINT)}
        ${field('email', 'Email', 'email', 'email', EMAIL_HINT)}
        ${field('password', 'Password', 'password', 'new-password', '8 characters or more.')}
        ${err()}
        ${submit('Make my account')}
      </form>
      <p class="city-panel-fine">Got one? <button type="button" class="acct-link" data-acct="login">Log in</button></p>`;
  }

  function forgotView() {
    if (config && !config.email)
      return `${head('Password', 'Forgot your password?')}
        <p class="city-panel-text">Resetting a password by email is coming soon.</p>
        <button type="button" class="acct-link" data-acct="login">Back to Log in</button>`;
    return `${head('Password', 'Forgot your password?')}
      <p class="city-panel-text">We'll email a link to your account's email address to pick a new one. It works for 30 minutes.</p>
      <form class="acct-form" data-form="forgot">
        ${field('name', 'Username or email', 'text', 'username')}
        ${err()}
        ${note ? '' : submit('Send the link')}
      </form>
      <button type="button" class="acct-link" data-acct="login">Back to Log in</button>`;
  }

  function resetView() {
    return `${head('Password', 'Pick a new password')}
      <form class="acct-form" data-form="reset">
        ${field('password', 'New password', 'password', 'new-password', '8 characters or more.')}
        ${err()}
        ${submit('Save and log in')}
      </form>`;
  }

  function meView() {
    const me = account.me;
    if (!me) return `${head('Logged in', 'Your account')}<p class="city-panel-text">Loading your account…</p>${err()}
      <div class="city-panel-actions"><button type="button" class="chip-link" data-acct="logout">Log out</button></div>`;
    const rank = RANKS.find((k) => k.id === me.profile.rank) ?? RANKS[0];
    const row = (label: string, value: string, what: Edit) =>
      `<div class="acct-row"><dt>${esc(label)}</dt><dd><span>${value}</span><span class="acct-acts"><button type="button" class="acct-link" data-acct-edit="${what}">Change</button></span></dd></div>`;
    let form = '';
    if (edit === 'name') form = `<form class="acct-form" data-form="name">${field('username', 'New username', 'text', 'username', USERNAME_HINT)}${err()}${submit('Save')}${cancel}</form>`;
    else if (edit === 'email')
      form = `<form class="acct-form" data-form="email">${field('email', 'New email', 'email', 'email', EMAIL_HINT)}${field('current', 'Your password', 'password', 'current-password')}${err()}${submit('Save')}${cancel}</form>`;
    else if (edit === 'password')
      form = `<form class="acct-form" data-form="password">${field('current', 'Current password', 'password', 'current-password')}${field('password', 'New password', 'password', 'new-password', '8 characters or more.')}${err()}${submit('Save')}${cancel}</form>`;
    return `${head('Logged in', `<span class="account-name">${esc(me.username)}</span>`)}
      <span class="mp-rank" data-rank="${esc(rank.id)}">${esc(rank.name)}</span>
      <dl class="plot-facts account-facts">
        <div><dt>Lifetime score</dt><dd>${fmt.format(me.profile.total)}</dd></div>
      </dl>
      ${edit ? form : err()}
      <dl class="acct-rows">
        ${row('Username', esc(me.username), 'name')}
        ${row('Email', esc(me.email), 'email')}
        ${row('Password', '••••••••', 'password')}
      </dl>
      <p class="city-panel-fine">Only you see your email. Other players see your username.</p>
      <div class="city-panel-actions"><button type="button" class="chip-link" data-acct="logout">Log out</button></div>`;
  }

  function render() {
    paintButtons();
    if (card.hidden) return;
    const focused = (document.activeElement as HTMLElement | null)?.dataset?.f;
    const reset = view === 'reset' && resetToken;
    body.innerHTML = account.token && !reset ? meView() : { login: loginView, signup: signupView, forgot: forgotView, reset: resetView }[view]();
    // Keep the caret in the field it was in, else the first empty field
    const again = focused && body.querySelector<HTMLInputElement>(`[data-f="${focused}"]`);
    const first = [...body.querySelectorAll<HTMLInputElement>('input[data-f]')].find((i) => !i.value);
    (again || first)?.focus({ preventScroll: true });
  }

  function show(v: View) {
    view = v;
    edit = null;
    error = '';
    note = '';
    render();
  }

  function open(v?: View) {
    if (v) view = v;
    error = '';
    note = '';
    if (card.hidden) {
      lastFocus = document.activeElement as HTMLElement;
      card.hidden = false;
      d.opened();
      if (account.token) account.refresh();
    }
    account.config().then((c) => {
      config = c;
      render();
    });
    render();
    if (!body.querySelector('input')) card.querySelector<HTMLButtonElement>('[data-account-close]')?.focus({ preventScroll: true });
  }
  function close() {
    if (card.hidden) return false;
    card.hidden = true;
    edit = null;
    for (const k of Object.keys(vals)) if (k !== 'name' && k !== 'username' && k !== 'email') delete vals[k];
    lastFocus?.focus?.({ preventScroll: true });
    return true;
  }

  /** Run a request with the button showing `label`; errors show in the card */
  async function act(label: string, fn: () => Promise<unknown>, after?: () => void) {
    if (busy) return;
    busy = label;
    error = '';
    note = '';
    render();
    try {
      await fn();
      busy = '';
      after?.();
    } catch (e) {
      busy = '';
      // (fetch throws a TypeError when the server can't be reached)
      error = e instanceof TypeError ? "Can't reach the game server right now. Try again in a moment." : e instanceof Error ? e.message : String(e);
    }
    render();
  }
  /** Logged in: the card's done (the Multiplayer menu, listening to the account, carries on) */
  const done = () => {
    for (const k of Object.keys(vals)) delete vals[k];
    resetToken = '';
    view = 'login';
    close();
  };

  function submitForm(form: string) {
    const v = (k: string) => (vals[k] ?? '').trim();
    const stop = (problem: string) => ((error = problem), render());
    switch (form) {
      case 'login':
        return act('Logging in…', () => account.login(v('name'), vals.password ?? ''), done);
      case 'signup': {
        const problem = usernameProblem(v('username')) ?? (emailOk(v('email')) ? null : "That doesn't look like an email address.") ?? passwordProblem(vals.password, v('username'));
        if (problem) return stop(problem);
        return act('Making your account…', () => account.signup(v('username'), v('email'), vals.password ?? ''), done);
      }
      case 'forgot':
        return act('Sending…', async () => {
          const r = await account.forgot(v('name'));
          if (r.soon) config = { email: false };
          else note = 'If that account exists, a link is on its way to its email. Check your inbox (and spam).';
        });
      case 'reset': {
        const problem = passwordProblem(vals.password);
        if (problem) return stop(problem);
        return act('Saving…', () => account.reset(resetToken, vals.password ?? ''), done);
      }
      case 'name': {
        const problem = usernameProblem(v('username'));
        if (problem) return stop(problem);
        return act('Saving…', () => account.setUsername(v('username')), () => (edit = null));
      }
      case 'email':
        if (!emailOk(v('email'))) return stop("That doesn't look like an email address.");
        return act('Saving…', () => account.setEmail(v('email'), vals.current ?? ''), () => {
          edit = null;
          delete vals.current;
          note = 'Email saved.';
        });
      case 'password': {
        const problem = passwordProblem(vals.password, account.me?.username);
        if (problem) return stop(problem);
        return act('Saving…', () => account.setPassword(vals.password ?? '', vals.current ?? ''), () => {
          edit = null;
          delete vals.current;
          delete vals.password;
          note = 'Password saved.';
        });
      }
    }
  }

  for (const b of openers) b.addEventListener('click', () => open());
  // Esc closes the card first (before it can leave walk or build mode: nothing after this sees it)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && close()) e.stopImmediatePropagation();
  });
  // While it's open, keys typed in it are its own (walk mode never hears W A S D in a password)
  card.addEventListener('keydown', (e) => e.key !== 'Escape' && e.stopPropagation());
  card.addEventListener('input', (e) => {
    const i = e.target as HTMLInputElement;
    const f = i.dataset.f;
    if (!f) return;
    vals[f] = i.value;
    // The username's hint says what's wrong as it's typed
    if (f === 'username') {
      const hint = card.querySelector<HTMLElement>('[data-hint="username"]');
      const problem = i.value ? usernameProblem(i.value) : null;
      if (hint) {
        hint.textContent = problem ?? USERNAME_HINT;
        hint.classList.toggle('is-bad', !!problem);
      }
    }
  });
  card.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = (e.target as HTMLFormElement).dataset.form;
    if (form) submitForm(form);
  });
  card.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === card) return void close();
    const btn = t.closest<HTMLButtonElement>('button');
    if (!btn || btn.type === 'submit') return;
    const ds = btn.dataset;
    if ('accountClose' in ds) close();
    else if (ds.acctEdit) {
      edit = edit === ds.acctEdit ? null : (ds.acctEdit as Edit);
      error = '';
      note = '';
      if (edit === 'name') vals.username = account.me?.username ?? '';
      render();
    } else
      switch (ds.acct) {
        case 'login':
        case 'signup':
        case 'forgot':
          return show(ds.acct);
        case 'cancel-edit':
          edit = null;
          error = '';
          return render();
        case 'logout':
          view = 'login';
          return act('Logging out…', () => account.logout());
      }
  });
  account.subscribe(() => render());
  paintButtons();

  // Opened from a password reset link
  const reset = resetInAddress();
  if (reset) {
    resetToken = reset;
    open('reset');
  }
  // Tapped before this script was ready (the header remembers it)
  if (navBtn?.dataset.wanted) {
    delete navBtn.dataset.wanted;
    open();
  }

  return {
    get isOpen() {
      return !card.hidden;
    },
    /** Open on Log in or Make an account (logged in: the account) */
    open,
    close,
    /** Repaint (the city's Online switch moved) */
    refresh() {
      render();
    },
  };
}

export type AccountUI = ReturnType<typeof createAccountUI>;
