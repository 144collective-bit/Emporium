/*
 * The account card (account.ts does the talking): log in, sign up, forgot
 * your password, a reset link's new password, a first sign-in's username,
 * and, logged in, the account: its username, private email and ways in
 * (password, Google, Discord, a wallet), each to add, change or take off.
 * Opened from the header's Log in button, the walk Profile tab and the
 * Multiplayer menu; closes with its ×, a tap outside or Esc. It's made with
 * the page (CityMap.astro), not with the 3D city, so it works on the 2D map
 * too and before the 3D city has loaded.
 *
 * The username is the name other players see (filtered as it's typed, and
 * again by the server). The email is only ever shown to its owner, here.
 */
import { CHAINS, PROVIDER_NAMES, USERNAME_MAX, emailOk, passwordProblem, shortAddr, usernameProblem, type AuthConfig, type Provider, type Way } from '../net/auth';
import { RANKS } from '../net/profile-data';
import { claimInAddress, type Account } from './account';
import { walletError } from './wallet';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = new Intl.NumberFormat('en-US');

/** What the card needs from the rest of the page. Defaults work without the 3D city; index.ts adds its own. */
export interface AccountHooks {
  /** The card opened (walk mode frees the mouse) */
  opened(): void;
  /** Logged in (or a first sign-in finished): the Multiplayer menu carries on */
  loggedIn(): void;
}

type View = 'login' | 'signup' | 'forgot' | 'reset' | 'wallets' | 'me';
/** What's being changed on a logged-in account */
type Edit = 'name' | 'email' | 'password' | null;

const USERNAME_HINT = `3 to ${USERNAME_MAX} letters, numbers, _ and -. Other players see it.`;

export function createAccountUI(root: HTMLElement, account: Account, d: AccountHooks) {
  const card = root.querySelector<HTMLElement>('[data-account]')!;
  const body = card.querySelector<HTMLElement>('[data-account-body]')!;
  const navBtn = document.querySelector<HTMLButtonElement>('[data-account-nav]');
  const openers = [...root.querySelectorAll<HTMLButtonElement>('[data-account-open]'), ...(navBtn ? [navBtn] : [])];
  let view: View = 'login';
  let edit: Edit = null;
  /** The wallets view links a wallet to the account (not a sign-in) */
  let linking = false;
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

  /** Google, Discord (when the server has them) and a wallet */
  function otherWays(verb: 'Continue' | 'Link') {
    const p = (['google', 'discord'] as Provider[]).filter((id) => config?.[id]);
    return `<div class="acct-ways">
      ${p.map((id) => `<button type="button" class="acct-way" data-acct-provider="${id}" ${busy ? 'disabled' : ''}>${verb} with ${PROVIDER_NAMES[id]}</button>`).join('')}
      <button type="button" class="acct-way" data-acct="wallets" ${busy ? 'disabled' : ''}>${verb === 'Link' ? 'Link a wallet' : 'Connect wallet'}</button>
    </div>`;
  }

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
      <p class="acct-or"><span>or</span></p>
      ${otherWays('Continue')}
      <p class="city-panel-fine">New here? <button type="button" class="acct-link" data-acct="signup">Make an account</button></p>`;
  }

  function signupView() {
    return `${head('Multiplayer', 'Make an account')}
      <form class="acct-form" data-form="signup">
        ${field('username', 'Username', 'text', 'username', usernameProblem(vals.username) && vals.username ? usernameProblem(vals.username)! : USERNAME_HINT)}
        ${field('email', 'Email', 'email', 'email', 'Only for resetting your password. Nobody else sees it.')}
        ${field('password', 'Password', 'password', 'new-password', '8 characters or more.')}
        ${err()}
        ${submit('Make my account')}
      </form>
      <p class="acct-or"><span>or</span></p>
      ${otherWays('Continue')}
      <p class="city-panel-fine">Got one? <button type="button" class="acct-link" data-acct="login">Log in</button></p>`;
  }

  function finishView() {
    const way = account.pending!;
    const how = way === 'wallet' ? 'your wallet' : PROVIDER_NAMES[way as Provider];
    return `${head('Almost there', 'Pick a username')}
      <p class="city-panel-text">Signed in with ${esc(how)}. One more thing: the name other players see.</p>
      <form class="acct-form" data-form="finish">
        ${field('username', 'Username', 'text', 'username', USERNAME_HINT)}
        ${err()}
        ${submit('Make my account')}
      </form>
      <button type="button" class="acct-link" data-acct="cancel-pending">Cancel</button>`;
  }

  function forgotView() {
    if (config && !config.email)
      return `${head('Password', 'Forgot your password?')}
        <p class="city-panel-text">Resetting a password by email is coming soon.</p>
        <p class="city-panel-fine">If you linked Google, Discord or a wallet, log in with it and set a new password from your account.</p>
        <button type="button" class="acct-link" data-acct="login">Back to Log in</button>`;
    return `${head('Password', 'Forgot your password?')}
      <p class="city-panel-text">We'll email a link to pick a new one (it works for 30 minutes).</p>
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

  async function walletsView() {
    const list = await account.wallets();
    const back = `<button type="button" class="acct-link" data-acct="${linking ? 'me' : 'login'}">Back</button>`;
    if (busy)
      return `${head('Wallet', 'Check your wallet')}
        <p class="city-panel-text">Your wallet is showing a short message to sign. It only proves you hold the wallet: no transaction, no gas.</p>`;
    return list.length
      ? `${head('Wallet', linking ? 'Link a wallet' : 'Connect wallet')}
         <div class="wallet-picks">${list.map((w) => `<button type="button" class="wallet-pick" data-acct-wallet="${esc(w.id)}">${w.icon ? `<img src="${esc(w.icon)}" alt="" width="24" height="24">` : ''}<span><b>${esc(w.name)}</b>${w.note ? `<small>${esc(w.note)}</small>` : ''}</span></button>`).join('')}</div>
         ${err()}
         <p class="city-panel-fine">Your wallet asks you to sign a short message: no transaction, no gas.</p>${back}`
      : `${head('Wallet', 'No wallet found')}
         <p class="city-panel-text">Connecting needs a crypto wallet that works with PulseChain.</p>
         <p class="city-panel-fine">On a phone, open this page in your wallet app's own browser. On a computer, add a wallet extension to your browser, then reload this page.</p>${back}`;
  }

  function meView() {
    const me = account.me;
    if (!me) return `${head('Logged in', 'Your account')}<p class="city-panel-text">Loading your account…</p>${err()}
      <div class="city-panel-actions"><button type="button" class="chip-link" data-acct="logout">Log out</button></div>`;
    const p = me.profile;
    const rank = RANKS.find((k) => k.id === p.rank) ?? RANKS[0];
    const w = me.ways;
    const count = [w.password, w.google, w.discord, !!w.wallet].filter(Boolean).length;
    const off = (way: Way) => (count > 1 ? `<button type="button" class="acct-link" data-acct-unlink="${way}">Take off</button>` : '');
    const row = (label: string, value: string, actions: string) => `<div class="acct-row"><dt>${esc(label)}</dt><dd><span>${value}</span><span class="acct-acts">${actions}</span></dd></div>`;

    let form = '';
    if (edit === 'name')
      form = `<form class="acct-form" data-form="name">${field('username', 'New username', 'text', 'username', USERNAME_HINT)}${err()}${submit('Save')}<button type="button" class="acct-link" data-acct="cancel-edit">Cancel</button></form>`;
    else if (edit === 'email')
      form = `<form class="acct-form" data-form="email">${field('email', 'New email', 'email', 'email', 'Only for resetting your password. Nobody else sees it.')}${w.password ? field('current', 'Your password', 'password', 'current-password') : ''}${err()}${submit('Save')}<button type="button" class="acct-link" data-acct="cancel-edit">Cancel</button></form>`;
    else if (edit === 'password')
      form = `<form class="acct-form" data-form="password">${w.password ? field('current', 'Current password', 'password', 'current-password') : ''}${field('password', 'New password', 'password', 'new-password', '8 characters or more.')}${me.email ? '' : field('email', 'Email', 'email', 'email', 'Needed to reset a password. Nobody else sees it.')}${err()}${submit('Save')}<button type="button" class="acct-link" data-acct="cancel-edit">Cancel</button></form>`;

    const chain = CHAINS[me.chain];
    const providers = (['google', 'discord'] as Provider[])
      .filter((id) => w[id] || config?.[id])
      .map((id) => row(PROVIDER_NAMES[id], w[id] ? 'Linked' : '<span class="acct-dim">Not linked</span>', w[id] ? off(id) : `<button type="button" class="acct-link" data-acct-provider="${id}">Link</button>`))
      .join('');
    return `${head('Logged in', `<span class="account-name">${esc(me.username)}</span>`)}
      <span class="mp-rank" data-rank="${esc(rank.id)}">${esc(rank.name)}</span>
      <dl class="plot-facts account-facts">
        <div><dt>Lifetime score</dt><dd>${fmt.format(p.total)}</dd></div>
      </dl>
      ${edit ? form : `${err()}`}
      <dl class="acct-rows">
        ${row('Username', esc(me.username), `<button type="button" class="acct-link" data-acct-edit="name">Change</button>`)}
        ${row('Email', me.email ? esc(me.email) : '<span class="acct-dim">None</span>', `<button type="button" class="acct-link" data-acct-edit="email">${me.email ? 'Change' : 'Add'}</button>`)}
        ${row('Password', w.password ? 'Set' : '<span class="acct-dim">Not set</span>', `<button type="button" class="acct-link" data-acct-edit="password">${w.password ? 'Change' : 'Set one'}</button>${w.password ? off('password') : ''}`)}
        ${providers}
        ${row('Wallet', w.wallet ? `<span class="account-addr">${esc(shortAddr(w.wallet))}</span>${chain ? ` <small>${esc(chain.short)}</small>` : ''}` : '<span class="acct-dim">Not linked</span>', w.wallet ? off('wallet') : '<button type="button" class="acct-link" data-acct="link-wallet">Link</button>')}
      </dl>
      <p class="city-panel-fine">Only you see your email and wallet. Other players see your username.</p>
      <div class="city-panel-actions"><button type="button" class="chip-link" data-acct="logout">Log out</button></div>`;
  }

  async function render() {
    paintButtons();
    if (card.hidden) return;
    const focused = (document.activeElement as HTMLElement | null)?.dataset?.f;
    let html: string;
    if (account.pending) html = finishView();
    else if (view === 'wallets') html = await walletsView();
    else if (account.token) html = meView();
    else html = { login: loginView, signup: signupView, forgot: forgotView, reset: resetView, me: loginView }[view]();
    if (card.hidden) return;
    body.innerHTML = html;
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
    else if (!account.token && view === 'me') view = 'login';
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
    render().then(() => !body.querySelector('input') && card.querySelector<HTMLButtonElement>('[data-account-close]')?.focus({ preventScroll: true }));
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
      error = e instanceof TypeError ? "Can't reach the game server right now. Try again in a moment." : walletError(e);
    }
    render();
  }
  /** Logged in: the card's done, the menu carries on */
  const done = () => {
    for (const k of Object.keys(vals)) delete vals[k];
    if (account.pending) return;
    close();
    d.loggedIn();
  };

  function submitForm(form: string) {
    const v = (k: string) => (vals[k] ?? '').trim();
    switch (form) {
      case 'login':
        return act('Logging in…', () => account.login(v('name'), vals.password ?? ''), done);
      case 'signup': {
        const problem = usernameProblem(v('username')) ?? (emailOk(v('email')) ? null : "That doesn't look like an email address.") ?? passwordProblem(vals.password, v('username'));
        if (problem) return ((error = problem), render());
        return act('Making your account…', () => account.signup(v('username'), v('email'), vals.password ?? ''), done);
      }
      case 'finish': {
        const problem = usernameProblem(v('username'));
        if (problem) return ((error = problem), render());
        return act('Making your account…', () => account.finish(v('username')), done);
      }
      case 'forgot':
        return act('Sending…', async () => {
          const r = await account.forgot(v('name'));
          if (r.soon) config = { ...(config ?? { google: false, discord: false, chain: 943 }), email: false };
          else note = 'If that account has an email, a link is on its way. Check your inbox (and spam).';
        });
      case 'reset': {
        const problem = passwordProblem(vals.password);
        if (problem) return ((error = problem), render());
        return act('Saving…', () => account.reset(resetToken, vals.password ?? ''), done);
      }
      case 'name': {
        const problem = usernameProblem(v('username'));
        if (problem) return ((error = problem), render());
        return act('Saving…', () => account.setUsername(v('username')), () => (edit = null));
      }
      case 'email':
        if (!emailOk(v('email'))) return ((error = "That doesn't look like an email address."), render());
        return act('Saving…', () => account.setEmail(v('email'), vals.current), () => ((edit = null), delete vals.current));
      case 'password': {
        const problem = passwordProblem(vals.password, account.me?.username);
        if (problem) return ((error = problem), render());
        if (!account.me?.email && !emailOk(v('email'))) return ((error = 'Add your email: it is only used to reset your password.'), render());
        return act('Saving…', () => account.setPassword(vals.password ?? '', vals.current, account.me?.email ? undefined : v('email')), () => {
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
    else if (ds.acctProvider) {
      const linkIt = !!account.token;
      act(`Off to ${PROVIDER_NAMES[ds.acctProvider as Provider]}…`, () => account.provider(ds.acctProvider as Provider, linkIt));
    } else if (ds.acctWallet) {
      const linkIt = linking;
      act('Check your wallet', () => (linkIt ? account.linkWallet(ds.acctWallet) : account.wallet(ds.acctWallet)), () => {
        view = 'me';
        linking = false;
        if (!linkIt) done();
      });
    } else if (ds.acctUnlink) act('Saving…', () => account.unlink(ds.acctUnlink as Way));
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
        case 'wallets':
          linking = false;
          return show('wallets');
        case 'link-wallet':
          linking = true;
          return show('wallets');
        case 'me':
          linking = false;
          return show('me');
        case 'cancel-edit':
          edit = null;
          error = '';
          return render();
        case 'cancel-pending':
          account.cancelPending();
          return show('login');
        case 'logout':
          view = 'login';
          return act('Logging out…', () => account.logout());
      }
  });
  account.subscribe(() => render());
  paintButtons();

  // Back from Google or Discord, or from a reset link
  const back = claimInAddress();
  if (back?.reset) {
    resetToken = back.reset;
    open('reset');
  } else if (back?.login) {
    // Signing in, or (already logged in) linking Google or Discord to the account
    const linked = !!account.token;
    open(linked ? 'me' : 'login');
    act(linked ? 'Linking…' : 'Signing in…', () => account.claim(back.login!), linked ? undefined : done);
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
    /** Open on a view (Log in, Make an account), or wherever it was */
    open,
    close,
    /** Repaint (the city's Online switch moved) */
    refresh() {
      render();
    },
  };
}

export type AccountUI = ReturnType<typeof createAccountUI>;
