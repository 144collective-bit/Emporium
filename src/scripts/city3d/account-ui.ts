/*
 * Connect (log in with) a wallet, and the basic profile card (account.ts
 * does the talking). Opened from the Connect wallet button in the site
 * header and from the Profile tab while walking; closes with its ×, a tap
 * outside or Esc. It's made with the page (CityMap.astro), not with the 3D
 * city, so it works on the 2D map too and before the 3D city has loaded;
 * the 3D city plugs its parts in through `hooks` once it's up (index.ts).
 *
 * The card shows the player name (from the word lists, never typed), rank
 * badge, lifetime score, the wallet (short, with its network) and the plots
 * it owns, each a jump into Build mode. Only the visitor sees their own
 * wallet address; other players only ever see the player name.
 */
import { RANKS } from '../net/profile-data';
import { CHAINS, shortAddr } from '../net/land';
import type { Account } from './account';
import { walletError } from './wallet';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = new Intl.NumberFormat('en-US');

/** What the card needs from the rest of the city. Defaults work without the 3D city; index.ts replaces them. */
export interface AccountHooks {
  /** The city's Online / Offline switch */
  online(): boolean;
  goOnline(): void;
  /** A new player name (through the room while walking online, so everyone sees it) */
  rename(): Promise<void> | void;
  /** Fly to a plot in Build mode */
  showPlot(id: string): void;
  /** The card opened (walk mode frees the mouse) */
  opened(): void;
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

  async function render() {
    paintButtons();
    if (card.hidden) return;
    const head = (kicker: string, title: string) => `<p class="kicker"><span class="kicker-num">Profile</span> ${kicker}</p><h2 class="city-panel-title" id="account-title">${title}</h2>`;
    const err = error ? `<p class="account-error" role="alert">${esc(error)}</p>` : '';

    if (!d.online()) {
      body.innerHTML = `${head('Offline', 'Connect wallet')}
        <p class="city-panel-text">Connecting your wallet and your profile need the city online. Switch to Online at the top of the city, or here.</p>
        <div class="city-panel-actions"><button type="button" class="btn-pulse" data-account-online>Go online</button>${account.address ? '<button type="button" class="chip-link" data-account-logout>Log out</button>' : ''}</div>`;
      return;
    }

    if (!account.address) {
      if (busy) {
        body.innerHTML = `${head('Wallet', 'Check your wallet')}
          <p class="city-panel-text">Your wallet is showing a short message to sign. It only proves you hold the wallet: no transaction, no gas.</p>`;
        return;
      }
      const list = await account.wallets();
      if (card.hidden || account.address || busy) return;
      body.innerHTML = list.length
        ? `${head('Wallet', 'Connect wallet')}
           <p class="city-panel-text">Connect your PulseChain wallet to log in: keep a player profile that follows you to any browser, and to build on plots you own.</p>
           <div class="wallet-picks">${list.map((w) => `<button type="button" class="wallet-pick" data-account-wallet="${esc(w.id)}">${w.icon ? `<img src="${esc(w.icon)}" alt="" width="24" height="24">` : ''}<span><b>${esc(w.name)}</b>${w.note ? `<small>${esc(w.note)}</small>` : ''}</span></button>`).join('')}</div>
           ${err}
           <p class="city-panel-fine">Your wallet asks you to sign a short message: no transaction, no gas. A wallet's first login starts a fresh profile.</p>`
        : `${head('Wallet', 'No wallet found')}
           <p class="city-panel-text">Connecting needs a crypto wallet that works with PulseChain.</p>
           <p class="city-panel-fine">On a phone, open this page in your wallet app's own browser. On a computer, add a wallet extension to your browser, then reload this page.</p>`;
      return;
    }

    const me = account.me;
    if (!me) {
      body.innerHTML = `${head('Wallet', 'Your profile')}<p class="city-panel-text">Loading your profile…</p>${err}
        <div class="city-panel-actions"><button type="button" class="chip-link" data-account-logout>Log out</button></div>`;
      return;
    }
    const p = me.profile;
    const rank = RANKS.find((k) => k.id === p.rank) ?? RANKS[0];
    const chain = CHAINS[me.chain];
    const plots = me.plots.length
      ? `<ul class="account-plots">${me.plots.map((id) => `<li><span>Plot <b>${esc(id)}</b></span><button type="button" class="chip-link" data-account-plot="${esc(id)}">Show in Build mode</button></li>`).join('')}</ul>`
      : '<p class="city-panel-fine">No plots yet. Pick a district plot in Build mode to buy one.</p>';
    body.innerHTML = `${head('Logged in', `<span class="account-name">${esc(p.name)}</span>`)}
      <span class="mp-rank" data-rank="${esc(rank.id)}">${esc(rank.name)}</span>
      <dl class="plot-facts account-facts">
        <div><dt>Lifetime score</dt><dd>${fmt.format(p.total)}</dd></div>
        <div><dt>Wallet</dt><dd><span class="account-addr">${esc(shortAddr(me.address))}</span>${chain ? `<small>${esc(chain.name)}</small>` : ''}</dd></div>
      </dl>
      <p class="walk-skins-head account-plots-head"><span>Plots owned</span><span>${me.plots.length}</span></p>
      ${plots}
      ${err}
      <div class="city-panel-actions">
        <button type="button" class="chip-link" data-account-rename>New name</button>
        <button type="button" class="chip-link" data-account-logout>Log out</button>
      </div>`;
  }

  function open() {
    if (!card.hidden) return;
    lastFocus = document.activeElement as HTMLElement;
    error = '';
    card.hidden = false;
    d.opened();
    if (account.address && d.online()) account.refresh();
    render().then(() => card.querySelector<HTMLButtonElement>('[data-account-close]')?.focus({ preventScroll: true }));
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

  for (const b of openers) b.addEventListener('click', open);
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
    else if ('accountOnline' in ds) {
      d.goOnline();
      render();
    } else if (ds.accountWallet) {
      busy = true;
      render();
      act(() => account.login(ds.accountWallet));
    } else if ('accountLogout' in ds) act(() => account.logout());
    else if ('accountRename' in ds) {
      btn.disabled = true;
      act(async () => d.rename());
    } else if (ds.accountPlot) {
      close();
      d.showPlot(ds.accountPlot);
    }
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
      if (account.address && d.online()) account.refresh();
      render();
    },
  };
}

export type AccountUI = ReturnType<typeof createAccountUI>;
