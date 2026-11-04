/*
 * Connect (log in with) a wallet, and the basic profile card (account.ts
 * does the talking). Opened from the Connect wallet button in the site
 * header and from the Profile tab while walking; closes with its ×, a tap
 * outside or Esc. It's made with the page (CityMap.astro), not with the 3D
 * city, so it works before the 3D city has loaded;
 * the 3D city plugs its parts in through `hooks` once it's up (index.ts).
 *
 * The card shows the player name (a guest's from the word lists), rank
 * badge, lifetime score and the wallet (short, with its network). Only the
 * visitor sees their own wallet address; other players only ever see the
 * player name, which a wallet's player types here (Phase 4: unique, checked
 * as typed by net/names.ts, claimed by the server; Suggest one fills in a
 * word-list name). It's in the menus' kit (`.mk-modal`), over the start menu,
 * whose Connect wallet opens it (docs/account-plan.md Phase 3). Logging in
 * needs no Online switch: that's for the shared rooms. Logged in, it has Log
 * out, Log out everywhere and Delete my account (the word typed to confirm).
 */
import { RANKS } from '../net/profile-data';
import { CHAINS, shortAddr } from '../net/auth';
import type { Account } from './account';
import { walletError } from './wallet';
import { slot } from './saveslot';
import { NAME_MAX, NAME_WHY, cleanName } from '../net/names';
import { guestName } from '../net/profile-data';

/** Typed to confirm deleting the account (the server's accounts.ts DELETE_CONFIRM) */
const DELETE_WORD = 'delete';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = new Intl.NumberFormat('en-US');

/** What the card needs from the rest of the city. Defaults work without the 3D city; index.ts replaces them. */
export interface AccountHooks {
  /** The city's Online / Offline switch */
  online(): boolean;
  goOnline(): void;
  /** A new player name (through the room while walking online, so everyone sees it) */
  rename(): Promise<void> | void;
  /** The card opened (walk mode frees the mouse) */
  opened(): void;
  /** The account's name changed (the room loads the profile again, so everyone sees it) */
  named?(): void;
}

export function createAccountUI(root: HTMLElement, account: Account, d: AccountHooks) {
  const card = root.querySelector<HTMLElement>('[data-account]')!;
  const body = card.querySelector<HTMLElement>('[data-account-body]')!;
  const navBtn = document.querySelector<HTMLButtonElement>('[data-account-nav]');
  const openers = [...root.querySelectorAll<HTMLButtonElement>('[data-account-open]'), ...(navBtn ? [navBtn] : [])];
  let busy = false;
  let error = '';
  let lastFocus: HTMLElement | null = null;

  function paintButtons() {
    const me = account.me;
    const who = me ? me.profile.name : account.address ? shortAddr(account.address) : '';
    if (navBtn) {
      const label = navBtn.querySelector('[data-account-label]')!;
      if (who) label.textContent = who;
      else label.innerHTML = 'Connect<span class="nav-account-more"> wallet</span>';
      navBtn.classList.toggle('is-in', !!account.address);
      navBtn.setAttribute('aria-label', account.address ? `Your profile: ${who}` : 'Connect your wallet');
    }
    for (const b of root.querySelectorAll<HTMLButtonElement>('[data-account-open]')) {
      b.hidden = false;
      b.textContent = account.address ? `Wallet profile · ${shortAddr(account.address)}` : 'Connect wallet';
    }
  }

  /** The profile card's view: the profile, or the delete confirm */
  let view: 'main' | 'delete' = 'main';
  /** What's been typed into the delete confirm (kept over a repaint) */
  let typed = '';
  /** What's been typed into the name field (null: nothing yet, it shows the account's name) */
  let typedName: string | null = null;
  /** A word under the name field: why a name won't do, or that it was saved */
  let nameNote = '';
  let nameSaved = false;
  /** Whose game this page plays (saveslot.ts): a login that ran out still plays the wallet's */
  const playing = slot().address;

  async function render() {
    paintButtons();
    if (card.hidden) return;
    const head = (kicker: string, title: string) => `<p class="modal-kicker">${kicker}</p><h2 class="modal-title" id="account-title">${title}</h2>`;
    const err = error ? `<p class="account-error" role="alert">${esc(error)}</p>` : '';

    if (!account.address) {
      if (busy) {
        body.innerHTML = `${head('Wallet', 'Check your wallet')}
          <p class="modal-text">Your wallet is showing a short message to sign. It only proves you hold the wallet: no transaction, no gas.</p>`;
        return;
      }
      const list = await account.wallets();
      if (card.hidden || account.address || busy) return;
      const ranOut = playing
        ? `<p class="modal-text">Your login ran out. Log in again with the same wallet to keep saving your game to it; until then, what you do here stays on this device and goes up when you're back.</p>`
        : `<p class="modal-text">Log in with your PulseChain wallet: your game is saved with it and follows you to any device. A wallet's first login starts a fresh game; your guest game stays in this browser.</p>`;
      body.innerHTML = list.length
        ? `${head('Your account', playing ? 'Log in again' : 'Connect wallet')}
           ${ranOut}
           <div class="wallet-picks">${list.map((w) => `<button type="button" class="wallet-pick" data-account-wallet="${esc(w.id)}">${w.icon ? `<img src="${esc(w.icon)}" alt="" width="24" height="24">` : ''}<span><b>${esc(w.name)}</b>${w.note ? `<small>${esc(w.note)}</small>` : ''}</span></button>`).join('')}</div>
           ${err}
           <p class="modal-fine">Your wallet asks you to sign a short message: no transaction, no gas.</p>`
        : `${head('Your account', 'No wallet found')}
           <p class="modal-text">Logging in needs a crypto wallet that works with PulseChain.</p>
           <p class="modal-fine">On a phone, open this page in your wallet app's own browser. On a computer, add a wallet extension to your browser, then reload this page.</p>`;
      return;
    }

    const me = account.me;
    if (!me) {
      body.innerHTML = `${head('Your account', 'Your profile')}<p class="modal-text">Loading your profile…</p>${err}
        <div class="modal-acts"><button type="button" class="mk-btn" data-account-logout>Log out</button></div>`;
      return;
    }
    if (view === 'delete') {
      // (a repaint while typing keeps the field as it is)
      if (body.querySelector('[data-account-confirm]')) {
        body.querySelector('[data-account-err]')!.innerHTML = err;
        return void paintDelete();
      }
      body.innerHTML = `${head('Your account', 'Delete your account')}
        <p class="modal-text">This deletes your account for good: your game saved with this wallet, its save history and your player profile. Every login ends, here and on other devices. Your guest game in this browser stays.</p>
        <label class="modal-field"><span class="modal-fine">Type <b>${DELETE_WORD}</b> to confirm</span><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="16" data-account-confirm /></label>
        <div data-account-err>${err}</div>
        <div class="modal-acts"><button type="button" class="mk-btn is-hot" data-account-delete-yes disabled>Delete for good</button><button type="button" class="mk-btn" data-account-delete-no>Cancel</button></div>`;
      const input = body.querySelector<HTMLInputElement>('[data-account-confirm]')!;
      input.value = typed;
      paintDelete();
      input.focus({ preventScroll: true });
      return;
    }
    const p = me.profile;
    const rank = RANKS.find((k) => k.id === p.rank) ?? RANKS[0];
    const chain = CHAINS[me.chain];
    // (a repaint while typing a name keeps the field, its caret and what's typed)
    const field = body.querySelector<HTMLInputElement>('[data-account-name]');
    const had = field && document.activeElement === field ? { start: field.selectionStart, end: field.selectionEnd } : null;
    body.innerHTML = `${head('Logged in', `<span class="account-name">${esc(p.name)}</span>`)}
      <span class="mp-rank" data-rank="${esc(rank.id)}">${esc(rank.name)}</span>
      <dl class="city-facts account-facts">
        <div><dt>Lifetime score</dt><dd>${fmt.format(p.total)}</dd></div>
        <div><dt>Wallet</dt><dd><span class="account-addr">${esc(shortAddr(me.address))}</span>${chain ? `<small>${esc(chain.name)}</small>` : ''}</dd></div>
      </dl>
      <label class="modal-field"><span class="modal-fine">${p.named ? 'Your player name' : 'Pick your player name: this one came with your account'}</span>
        <input type="text" maxlength="${NAME_MAX + 4}" autocomplete="off" autocapitalize="off" spellcheck="false" data-account-name /></label>
      <p class="modal-fine account-name-note" data-account-name-note aria-live="polite"></p>
      <div class="modal-acts"><button type="button" class="mk-btn is-main" data-account-name-save>Save name</button><button type="button" class="mk-btn" data-account-suggest>Suggest one</button></div>
      <p class="modal-fine">Your game is saved with this wallet and follows you to any device you log in on. Its save history is at the Vault.</p>
      ${err}
      <div class="modal-acts">
        <button type="button" class="mk-btn" data-account-logout>Log out</button>
      </div>
      <div class="modal-more">
        <p class="modal-fine">Lost a device, or logged in somewhere you shouldn't have? Log out everywhere ends every login this wallet has.</p>
        <div class="modal-acts"><button type="button" class="mk-btn is-small" data-account-logout-all>Log out everywhere</button><button type="button" class="mk-btn is-small" data-account-delete>Delete my account</button></div>
      </div>`;
    const input = body.querySelector<HTMLInputElement>('[data-account-name]')!;
    input.value = typedName ?? p.name;
    paintName();
    if (had || focusName) {
      input.focus({ preventScroll: true });
      if (had) input.setSelectionRange(had.start, had.end);
      focusName = false;
    }
  }
  /** Asked to open on the name field (the title screen's Pick your name) */
  let focusName = false;
  /** The word under the name field and whether Save is live: as typed, checked as the server will */
  function paintName() {
    const input = body.querySelector<HTMLInputElement>('[data-account-name]');
    const note = body.querySelector<HTMLElement>('[data-account-name-note]');
    const save = body.querySelector<HTMLButtonElement>('[data-account-name-save]');
    if (!input || !note || !save) return;
    const c = cleanName(input.value);
    const same = c.ok && c.name === account.me?.profile.name;
    note.textContent = nameNote || (nameSaved ? 'Saved.' : c.ok ? (same ? '' : 'Letters, numbers, spaces, - and _. It must be one nobody else has.') : input.value.trim() ? NAME_WHY[c.why] : '');
    note.classList.toggle('is-bad', !!nameNote || (!c.ok && !!input.value.trim()));
    save.disabled = busy || !c.ok || same;
  }
  /** The delete button is live only once the word is typed */
  function paintDelete() {
    const input = body.querySelector<HTMLInputElement>('[data-account-confirm]');
    const yes = body.querySelector<HTMLButtonElement>('[data-account-delete-yes]');
    if (input && yes) yes.disabled = busy || input.value.trim().toLowerCase() !== DELETE_WORD;
  }

  function open(at?: 'name') {
    if (!card.hidden) return;
    lastFocus = document.activeElement as HTMLElement;
    error = '';
    view = 'main';
    typed = '';
    typedName = null;
    nameNote = '';
    nameSaved = false;
    focusName = at === 'name';
    card.hidden = false;
    d.opened();
    if (account.address) account.refresh();
    render().then(() => {
      if (!body.querySelector<HTMLInputElement>('[data-account-name]:focus')) card.querySelector<HTMLButtonElement>('[data-account-close]')?.focus({ preventScroll: true });
    });
  }
  function close() {
    if (card.hidden) return false;
    card.hidden = true;
    lastFocus?.focus?.({ preventScroll: true });
    return true;
  }

  async function act(fn: () => Promise<unknown>) {
    error = '';
    try {
      await fn();
    } catch (e) {
      error = walletError(e);
    }
    busy = false;
    render();
  }

  for (const b of openers) b.addEventListener('click', () => open());
  // Esc closes the card first (before it can leave walk or build mode: nothing after this sees it)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && close()) e.stopImmediatePropagation();
  });
  card.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === card) return void close();
    const btn = t.closest<HTMLButtonElement>('button');
    if (!btn) return;
    const ds = btn.dataset;
    if ('accountClose' in ds) close();
    else if (ds.accountWallet) {
      busy = true;
      render();
      act(() => account.login(ds.accountWallet));
    } else if ('accountLogout' in ds) act(() => account.logout());
    else if ('accountLogoutAll' in ds) {
      btn.disabled = true;
      act(() => account.logoutAll());
    } else if ('accountDelete' in ds) {
      view = 'delete';
      error = '';
      render();
    } else if ('accountDeleteNo' in ds) {
      view = 'main';
      typed = '';
      error = '';
      render();
    } else if ('accountDeleteYes' in ds) {
      busy = true;
      paintDelete();
      act(() => account.deleteAccount(typed.trim().toLowerCase()));
    }
    else if ('accountSuggest' in ds) {
      typedName = guestName(Math.random);
      nameNote = '';
      nameSaved = false;
      const input = body.querySelector<HTMLInputElement>('[data-account-name]');
      if (input) input.value = typedName;
      paintName();
    } else if ('accountNameSave' in ds) void saveName();
  });
  card.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.matches('[data-account-name]')) {
      typedName = t.value;
      nameNote = '';
      nameSaved = false;
      return paintName();
    }
    if (!t.matches('[data-account-confirm]')) return;
    typed = t.value;
    paintDelete();
  });
  /** Save the typed name: the server says whether it's free */
  async function saveName() {
    const c = cleanName(typedName ?? '');
    if (!c.ok || busy) return paintName();
    busy = true;
    paintName();
    try {
      await account.setName(c.name);
      typedName = null;
      nameSaved = true;
      d.named?.();
    } catch (e) {
      nameNote = (e as Error).message || NAME_WHY.taken;
    }
    busy = false;
    render();
  }
  // (Enter in the field is the delete button, once it's live)
  card.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    if (t.matches('[data-account-confirm]')) body.querySelector<HTMLButtonElement>('[data-account-delete-yes]:not(:disabled)')?.click();
    else if (t.matches('[data-account-name]')) void saveName();
  });
  account.subscribe(() => render());
  paintButtons();
  // Tapped before this script was ready (Nav.astro remembers it)
  if (navBtn?.dataset.wanted) {
    delete navBtn.dataset.wanted;
    open();
  }

  return {
    get isOpen() {
      return !card.hidden;
    },
    open,
    close,
    /** The Online / Offline switch moved */
    refresh() {
      render();
    },
  };
}

export type AccountUI = ReturnType<typeof createAccountUI>;
