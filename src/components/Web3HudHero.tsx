import React, { useState } from 'react';

export type ActivePageType =
  | 'home'
  | 'store'
  | 'blog'
  | 'alpha'
  | 'tokenomics'
  | 'vault'
  | 'terminal';

interface Web3HudHeroProps {
  activePage?: ActivePageType;
  stats?: {
    totalSupply: string;
    totalVolume: string;
    stakingApy: string;
    tokenPrice: string;
    tokenChange: string;
    networkStatus: string;
  };
  telegramUrl?: string;
  onExplore?: () => void;
  isFullScreen?: boolean;
}

export const Web3HudHero: React.FC<Web3HudHeroProps> = ({
  activePage = 'home',
  stats = {
    totalSupply: '5,555',
    totalVolume: '$18.4M',
    stakingApy: '34.8%',
    tokenPrice: '$0.0428',
    tokenChange: '+14.2%',
    networkStatus: 'Mainnet Operational',
  },
  telegramUrl = 'https://t.me/degenemporium',
  onExplore,
  isFullScreen = false,
}) => {
  const [hoveredPanel, setHoveredPanel] = useState<number | null>(null);

  const isHomeOrFull = isFullScreen || activePage === 'home';

  return (
    <section
      className={`comic-hero-section ${isHomeOrFull ? 'is-fullscreen' : ''}`}
      aria-label="Hero Cyberpunk HUD Panels"
    >
      <div className="comic-hero-ambient-glow" />

      <div className={`comic-hero-container ${isHomeOrFull ? 'is-fullscreen' : ''}`}>
        {/* Desktop / Tablet Exact 6-Panel Comic Grid */}
        <div className="comic-page-wrapper">
          {/* SVG Frame with precise ink borders matching mockup geometry */}
          <svg
            className="comic-svg-overlay"
            viewBox="0 0 668 314"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <filter id="comic-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Outer Page Border */}
            <rect
              x="6"
              y="9"
              width="654"
              height="297"
              className="comic-outer-frame"
              vectorEffect="non-scaling-stroke"
            />

            {/* Panel 1 SVG border (Top Left - Web Apparel) */}
            <polygon
              points="6,9 389,9 381,117 6,174"
              className={`comic-svg-panel-border ${hoveredPanel === 1 || activePage === 'store' ? 'is-active' : ''}`}
              vectorEffect="non-scaling-stroke"
            />

            {/* Panel 2 SVG border (Top Right - Community Highlights) */}
            <polygon
              points="401,9 660,9 660,82 393,115"
              className={`comic-svg-panel-border ${hoveredPanel === 2 || activePage === 'blog' ? 'is-active' : ''}`}
              vectorEffect="non-scaling-stroke"
            />

            {/* Panel 3 SVG border (Mid Right - Socials & Feed) */}
            <polygon
              points="475,116 660,93 660,175 485,200"
              className={`comic-svg-panel-border ${hoveredPanel === 3 || activePage === 'alpha' ? 'is-active' : ''}`}
              vectorEffect="non-scaling-stroke"
            />

            {/* Panel 4 SVG border (Center Slanted - PulseDex.Net) */}
            <polygon
              points="240,150 464,117 473,201 245,233"
              className={`comic-svg-panel-border ${hoveredPanel === 4 || activePage === 'tokenomics' ? 'is-active' : ''}`}
              vectorEffect="non-scaling-stroke"
            />

            {/* Panel 5 SVG border (Bottom Left - PulseChain Stats) */}
            <polygon
              points="6,186 229,152 238,306 6,306"
              className={`comic-svg-panel-border ${hoveredPanel === 5 || activePage === 'vault' ? 'is-active' : ''}`}
              vectorEffect="non-scaling-stroke"
            />

            {/* Panel 6 SVG border (Bottom Right - Roadmap & Vault) */}
            <polygon
              points="246,244 660,187 660,306 250,306"
              className={`comic-svg-panel-border ${hoveredPanel === 6 || activePage === 'terminal' ? 'is-active' : ''}`}
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* ============================================================== */}
          {/* HTML PANELS LAYER (Preserves master polygons & responsive grid) */}
          {/* ============================================================== */}

          {/* WINDOW 1: WEB APPAREL (Top Left) - Redesigned Premium Editorial Layout */}
          <a
            href="/store"
            className={`comic-panel panel-1 is-nav-window hud-window ${hoveredPanel === 1 ? 'hovered' : ''} ${activePage === 'store' ? 'page-active' : ''}`}
            style={{
              left: '0.90%',
              top: '2.87%',
              width: '57.34%',
              height: '52.55%',
              clipPath: 'polygon(0.0% 0.0%, 100.0% 0.0%, 97.91% 65.45%, 0.0% 100.0%)',
              background: 'linear-gradient(135deg, rgba(8, 14, 24, 0.98) 0%, rgba(5, 9, 18, 0.99) 100%)',
            }}
            onMouseEnter={() => setHoveredPanel(1)}
            onMouseLeave={() => setHoveredPanel(null)}
            aria-label="Navigate to Web Apparel"
          >
            <div className="hud-ambient-glow glow-cyan" />
            <div className="comic-window-inner w1-inner">
              {/* Left Column: Garment Hero Stage */}
              <div className="w1-garment-col">
                <div className="w1-garment-glow" />
                <img
                  src="/images/shirt-cutout.png"
                  alt="Hexagon Streetwear Tee"
                  className="w1-garment-img"
                  loading="eager"
                />
              </div>

              {/* Right Column: Premium Showcase with Large Title */}
              <div className="w1-content-col">
                <div className="hud-pill-row">
                  <span className="hud-pill cyan">
                    <span className="pulse-dot" /> WINDOW 01 &bull; STORE
                  </span>
                  <span className="hud-micro-tag">COLLECTION // DROP 01</span>
                  <span className="hud-badge cyan-badge">NFC AUTHENTICATED</span>
                </div>

                <div className="w1-hero-text">
                  <h2 className="w1-headline">
                    WEB APPAREL
                  </h2>
                  <p className="w1-subtext">
                    Heavyweight luxury streetwear &amp; physical collectibles embedded with cryptographically verified on-chain NFC provenance.
                  </p>
                </div>

                {/* Specification pills */}
                <div className="w1-spec-row">
                  <span className="w1-spec-pill">450 GSM COTTON</span>
                  <span className="w1-spec-pill">NFC CHIP EMBEDDED</span>
                  <span className="w1-spec-pill">LIMITED TO 250 PCS</span>
                </div>

                {/* Primary Action and Native Price */}
                <div className="w1-action-row">
                  <span className="hud-cta-btn cyan-btn">
                    EXPLORE COLLECTION &rarr;
                  </span>
                  <span className="w1-pricing-tag">
                    STARTING AT <strong>$15.00</strong> <span className="w1-price-token">/ 350 DEMP</span>
                  </span>
                </div>
              </div>
            </div>
          </a>

          {/* WINDOW 2: COMMUNITY HIGHLIGHTS (Top Right) */}
          <a
            href="/blog"
            className={`comic-panel panel-2 is-nav-window hud-window ${hoveredPanel === 2 ? 'hovered' : ''} ${activePage === 'blog' ? 'page-active' : ''}`}
            style={{
              left: '58.83%',
              top: '2.87%',
              width: '39.97%',
              height: '33.76%',
              clipPath: 'polygon(3.0% 0.0%, 100.0% 0.0%, 100.0% 68.87%, 0.0% 100.0%)',
              background: 'linear-gradient(135deg, rgba(16, 12, 28, 0.97) 0%, rgba(8, 6, 18, 0.99) 100%)',
            }}
            onMouseEnter={() => setHoveredPanel(2)}
            onMouseLeave={() => setHoveredPanel(null)}
            aria-label="Navigate to Community Highlights"
          >
            <div className="hud-ambient-glow glow-purple" />
            <div className="comic-window-inner w2-inner">
              {/* Character Column */}
              <div className="w2-char-col">
                <img
                  src="/images/news-character-cutout.png"
                  alt="Degen operative"
                  className="w2-char-img"
                  loading="eager"
                />
              </div>

              {/* Feed Column */}
              <div className="w2-content-col">
                <div className="hud-pill-row">
                  <span className="hud-pill purple">
                    <span className="pulse-dot purple" /> WINDOW 02 &bull; DISPATCHES
                  </span>
                  <span className="hud-micro-tag">SPOTLIGHT // DISPATCH</span>
                </div>

                <h2 className="w2-headline">
                  COMMUNITY<br />HIGHLIGHTS
                </h2>

                <div className="w2-dispatches-list">
                  <div className="w2-dispatch-item">
                    <div className="w2-dispatch-top">
                      <span className="hud-badge green-badge">AUDIT PASSED</span>
                      <span className="w2-dispatch-time">2H AGO</span>
                    </div>
                    <p className="w2-dispatch-text">
                      Protocol Security Audit Complete &bull; Multi-sig Treasury Verified
                    </p>
                  </div>

                  <div className="w2-dispatch-item">
                    <div className="w2-dispatch-top">
                      <span className="hud-badge cyan-badge">ALPHA LIVE</span>
                      <span className="w2-dispatch-time">5H AGO</span>
                    </div>
                    <p className="w2-dispatch-text">
                      Arbitrum &bull; Base On-Chain Indexer Release Live
                    </p>
                  </div>
                </div>

                <div className="w2-footer">
                  <span className="w2-action-link">READ DISPATCHES &rarr;</span>
                </div>
              </div>
            </div>
          </a>

          {/* WINDOW 3: SOCIALS & LIVE FEED (Mid Right) */}
          <a
            href="/alpha"
            className={`comic-panel panel-3 is-nav-window hud-window ${hoveredPanel === 3 ? 'hovered' : ''} ${activePage === 'alpha' ? 'page-active' : ''}`}
            style={{
              left: '71.11%',
              top: '29.62%',
              width: '27.69%',
              height: '34.08%',
              clipPath: 'polygon(0.0% 21.5%, 100.0% 0.0%, 100.0% 76.64%, 5.41% 100.0%)',
              background: 'linear-gradient(135deg, rgba(8, 16, 26, 0.97) 0%, rgba(5, 9, 18, 0.99) 100%)',
            }}
            onMouseEnter={() => setHoveredPanel(3)}
            onMouseLeave={() => setHoveredPanel(null)}
            aria-label="Navigate to Socials and Live Radar"
          >
            <div className="hud-ambient-glow glow-cyan" />
            <div className="comic-window-inner w3-inner">
              <div className="w3-header-row">
                {/* Left Side: Socials */}
                <div className="w3-socials-side">
                  <div className="w3-socials-badges">
                    <span className="w3-icon-pill x-pill" title="X / Twitter">&#120143;</span>
                    <span className="w3-icon-pill tg-pill" title="Telegram">&#9992;</span>
                    <span className="w3-icon-pill dc-pill" title="Discord">&#127918;</span>
                  </div>

                  <h3 className="w3-title">SOCIALS</h3>

                  <div className="w3-socials-links-row">
                    <span className="w3-mini-icon">&#120143;</span>
                    <span className="w3-mini-icon">&#9992;</span>
                    <span className="w3-mini-icon">&#127918;</span>
                  </div>
                </div>

                {/* Right Side: Live Feed Box */}
                <div className="w3-feed-side">
                  <div className="w3-feed-header">
                    <span className="pulse-dot green" /> LIVE FEED
                  </div>
                  <div className="w3-event-block">
                    <span className="w3-event-title">COMMUNITY EVENTS</span>
                    <p className="w3-event-desc">Degen Arena Discord community live...</p>
                  </div>
                  <div className="w3-members-block">
                    <span className="w3-members-header">TOP MEMBERS</span>
                    <div className="w3-member-row">
                      <span className="w3-member-name">&#128100; DegenEmpori</span>
                      <span className="w3-member-pts">+530</span>
                    </div>
                    <div className="w3-member-row">
                      <span className="w3-member-name">&#128100; Najmst N89</span>
                      <span className="w3-member-pts">+420</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a>

          {/* WINDOW 4: PULSEDEX.NET / TOKENOMICS (Center Slanted) */}
          <a
            href="/tokenomics"
            className={`comic-panel panel-4 is-nav-window hud-window ${hoveredPanel === 4 ? 'hovered' : ''} ${activePage === 'tokenomics' ? 'page-active' : ''}`}
            style={{
              left: '35.93%',
              top: '38.22%',
              width: '34.88%',
              height: '37.26%',
              clipPath: 'polygon(0.0% 27.5%, 96.57% 0.0%, 100.0% 72.0%, 3.43% 100.0%)',
              background: 'linear-gradient(135deg, rgba(8, 18, 28, 0.98) 0%, rgba(4, 10, 18, 0.99) 100%)',
            }}
            onMouseEnter={() => setHoveredPanel(4)}
            onMouseLeave={() => setHoveredPanel(null)}
            aria-label="Navigate to Tokenomics"
          >
            <div className="hud-ambient-glow glow-cyan" />
            <div className="comic-window-inner w4-inner">
              {/* Header: Price & DEX Brand */}
              <div className="w4-header">
                <div className="w4-header-left">
                  <div className="w4-price-row">
                    <span className="w4-price">{stats.tokenPrice}</span>
                    <span className="w4-delta">{stats.tokenChange}</span>
                  </div>
                  <span className="w4-sub-vol">DEMP/PLS VOL: {stats.totalVolume}</span>
                </div>

                <div className="w4-header-right">
                  <div className="w4-brand-title">
                    <span className="w4-logo-prism">&#9670;</span> PulseDex.Net
                  </div>
                </div>
              </div>

              {/* Body: Sparkline & Pool Table */}
              <div className="w4-terminal-body">
                <div className="w4-chart-wrap">
                  <svg viewBox="0 0 160 50" className="w4-sparkline" preserveAspectRatio="none">
                    <path
                      d="M 0 38 Q 25 42 45 32 T 90 28 T 130 14 L 160 22"
                      fill="none"
                      stroke="#00f5ff"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 0 38 Q 25 42 45 32 T 90 28 T 130 14 L 160 22 L 160 50 L 0 50 Z"
                      fill="url(#sparkline-grad)"
                      opacity="0.3"
                    />
                    <defs>
                      <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#00f5ff" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <div className="w4-dex-table">
                  <div className="w4-table-header">
                    <span>POOL</span>
                    <span>PRICE</span>
                    <span>24H VOL</span>
                    <span>LIQ</span>
                  </div>
                  <div className="w4-table-row">
                    <span className="pool-name">DEMP/PLS</span>
                    <span className="pool-price">$0.0428</span>
                    <span className="pool-vol">$915.4K</span>
                    <span className="pool-liq">$3.82M</span>
                  </div>
                  <div className="w4-table-row">
                    <span className="pool-name">DEMP/USDT</span>
                    <span className="pool-price">$0.0429</span>
                    <span className="pool-vol">$412.1K</span>
                    <span className="pool-liq">$1.45M</span>
                  </div>
                </div>
              </div>
            </div>
          </a>

          {/* WINDOW 5: PULSECHAIN STATS (Bottom Left) */}
          <a
            href="/vault"
            className={`comic-panel panel-5 is-nav-window hud-window ${hoveredPanel === 5 ? 'hovered' : ''} ${activePage === 'vault' ? 'page-active' : ''}`}
            style={{
              left: '0.90%',
              top: '56.37%',
              width: '34.88%',
              height: '41.08%',
              clipPath: 'polygon(0.0% 0.0%, 100.0% 0.0%, 96.57% 100.0%, 0.0% 100.0%)',
              background: 'linear-gradient(135deg, rgba(8, 12, 20, 0.98) 0%, rgba(5, 8, 14, 0.99) 100%)',
            }}
            onMouseEnter={() => setHoveredPanel(5)}
            onMouseLeave={() => setHoveredPanel(null)}
            aria-label="Navigate to PulseChain Stats"
          >
            <div className="hud-ambient-glow glow-amber" />
            <div className="comic-window-inner w5-inner">
              {/* Header */}
              <div className="w5-header">
                <h2 className="w5-title">
                  PULSECHAIN<br />STATS
                </h2>
                <div className="w5-header-right">
                  <div className="w5-metric-box">
                    <span className="w5-metric-lbl">GENESIS SUPPLY</span>
                    <span className="w5-metric-val">{stats.totalSupply}</span>
                  </div>
                  <div className="w5-metric-box">
                    <span className="w5-metric-lbl">TOTAL BURNED</span>
                    <span className="w5-metric-val glow-burn">1.2M DEMP</span>
                  </div>
                </div>
              </div>

              {/* Telemetry Matrix Grid */}
              <div className="w5-telemetry-matrix">
                <div className="w5-telemetry-col">
                  <div className="w5-row">
                    <span className="w5-lbl">PLS PRICE (PLS)</span>
                    <span className="w5-val">0.00422 PLS</span>
                  </div>
                  <div className="w5-row">
                    <span className="w5-lbl">PLS PRICE (USD)</span>
                    <span className="w5-val">$0.000084</span>
                  </div>
                  <div className="w5-row">
                    <span className="w5-lbl">NETWORK STATUS</span>
                    <span className="w5-val green-text">0.000452 DEMP</span>
                  </div>
                </div>

                <div className="w5-telemetry-col">
                  <div className="w5-row">
                    <span className="w5-lbl">NETWORK STATS</span>
                    <span className="w5-val">3.52M 20122</span>
                  </div>
                  <div className="w5-row">
                    <span className="w5-lbl">GAS TRACKER</span>
                    <span className="w5-val">262 GWEI</span>
                  </div>
                  <div className="w5-row">
                    <span className="w5-lbl">BLOCK LATENCY</span>
                    <span className="w5-val">10.0S (STABLE)</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="w5-footer">
                <span className="w5-badge-provenance">
                  &#10003; SMART CONTRACT PROVENANCE VERIFIED
                </span>
                <span className="w5-action-tag">ENTER VAULT &rarr;</span>
              </div>
            </div>
          </a>

          {/* WINDOW 6: ROADMAP & VAULT ACCESS (Bottom Right Wide) */}
          <a
            href="/terminal"
            className={`comic-panel panel-6 is-nav-window hud-window ${hoveredPanel === 6 ? 'hovered' : ''} ${activePage === 'terminal' ? 'page-active' : ''}`}
            style={{
              left: '36.83%',
              top: '59.55%',
              width: '61.98%',
              height: '37.90%',
              clipPath: 'polygon(0.0% 47.9%, 100.0% 0.0%, 100.0% 100.0%, 0.97% 100.0%)',
              background: 'linear-gradient(135deg, rgba(6, 14, 18, 0.98) 0%, rgba(4, 9, 12, 0.99) 100%)',
            }}
            onMouseEnter={() => setHoveredPanel(6)}
            onMouseLeave={() => setHoveredPanel(null)}
            aria-label="Navigate to Terminal & Roadmap"
          >
            <div className="hud-ambient-glow glow-green" />
            <div className="comic-window-inner w6-inner">
              {/* Left Zone: ROADMAP MILESTONES */}
              <div className="w6-roadmap-zone">
                <div className="w6-roadmap-header">
                  <div className="hud-pill-row">
                    <span className="hud-pill cyan">
                      <span className="pulse-dot" /> WINDOW 06 &bull; TERMINAL
                    </span>
                    <span className="hud-micro-tag">PROTOCOL MILESTONES</span>
                  </div>
                  <h3 className="w6-roadmap-title">ROADMAP</h3>
                </div>

                <div className="w6-roadmap-track">
                  <svg viewBox="0 0 240 60" className="w6-roadmap-svg" preserveAspectRatio="none">
                    <path
                      d="M 15 45 Q 60 40 110 32 T 225 15"
                      fill="none"
                      stroke="rgba(0, 245, 255, 0.3)"
                      strokeWidth="3"
                      strokeDasharray="4 4"
                    />
                    <path
                      d="M 15 45 Q 60 40 110 32"
                      fill="none"
                      stroke="#00f5ff"
                      strokeWidth="3"
                    />
                    <polygon points="220,10 235,15 222,22" fill="#00f5ff" />
                  </svg>

                  <div className="w6-roadmap-nodes">
                    <div className="w6-node node-1 done">
                      <span className="node-dot completed" />
                      <span className="node-label">Q3: APP LAUNCH</span>
                    </div>

                    <div className="w6-node node-2 active">
                      <span className="node-dot active-pulse" />
                      <span className="node-label">Q4: APP RELEASE</span>
                    </div>

                    <div className="w6-node node-3 future">
                      <span className="node-dot future-node" />
                      <span className="node-label">Q5: DAO LAUNCH</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Zone: VAULT ACCESS & STAKING */}
              <div className="w6-vault-zone">
                <div className="w6-vault-top">
                  <div className="w6-vault-header-left">
                    <h3 className="w6-vault-title">VAULT ACCESS &amp; STAKING</h3>
                    <div className="w6-apy-hero">
                      <span className="pulse-dot green" /> Staking APY: <strong>{stats.stakingApy}</strong>
                    </div>
                  </div>

                  <span className="w6-net-pill">
                    <span className="pulse-dot green" /> {stats.networkStatus}
                  </span>
                </div>

                <div className="w6-vault-content">
                  <div className="w6-staking-pills">
                    <span className="w6-stake-pill">Staking APY: <strong>34.6%</strong></span>
                    <span className="w6-stake-pill">Staking 2T: <strong>34.5%</strong></span>
                    <span className="w6-stake-pill">Staking TIIT: <strong>34.5%</strong></span>
                    <span className="w6-stake-pill">Staking ST: <strong>3.3%</strong></span>
                  </div>

                  <button type="button" className="w6-connect-btn">
                    Connect Vault
                  </button>
                </div>
              </div>
            </div>
          </a>
        </div>

        {/* ============================================================== */}
        {/* MOBILE / PORTRAIT COMIC BOOK LAYOUT (< 860px)                 */}
        {/* ============================================================== */}
        <div className="comic-mobile-strip" aria-label="Mobile Comic Book Page">
          {/* Mobile Issue Bar */}
          <div className="comic-mobile-issue-bar">
            <div className="comic-mobile-issue-left">
              <span className="comic-issue-pill">
                <span className="pulse-dot" /> ISSUE #01
              </span>
              <span className="comic-issue-tag">CYBERNETIC EDITION</span>
            </div>
            <div className="comic-mobile-issue-right">
              <span className="comic-badge-accent">VOL. 1 • 2026</span>
            </div>
          </div>

          {/* Mobile Panel 1: Web Apparel */}
          <a
            href="/store"
            className={`comic-mobile-panel m-panel-store ${activePage === 'store' ? 'page-active' : ''}`}
            aria-label="Enter Store"
          >
            <div className="m-panel-ambient-glow glow-cyan" />
            <div className="m-panel-top-narration">
              <span className="m-comic-tag tag-cyan">
                {activePage === 'store' ? '★ ACTIVE' : 'WINDOW 01'} &bull; WEB APPAREL
              </span>
              <span className="m-comic-sub-tag">COLLECTION // DROP 01</span>
            </div>

            <div className="m-w1-body">
              <div className="m-w1-shirt-wrap">
                <img src="/images/shirt-cutout.png" alt="Shirt" className="m-shirt-img" />
              </div>
              <div className="m-w1-details">
                <h3 className="m-w1-title">WEB APPAREL</h3>
                <p className="m-w1-sub">Heavyweight luxury physicals with verified on-chain NFC provenance.</p>
                <div className="m-w1-specs">
                  <span className="m-w1-spec-pill">450 GSM</span>
                  <span className="m-w1-spec-pill">NFC CHIP</span>
                  <span className="m-w1-spec-pill">250 PCS</span>
                </div>
              </div>
            </div>

            <div className="m-panel-action-bar">
              <span className="m-meta-text">FROM $15.00 / 350 DEMP</span>
              <span className="m-action-link">{activePage === 'store' ? 'BROWSE PRODUCTS ↓' : 'EXPLORE DROP →'}</span>
            </div>
          </a>

          {/* Mobile Panel 2: Community Highlights */}
          <a
            href="/blog"
            className={`comic-mobile-panel m-panel-news ${activePage === 'blog' ? 'page-active' : ''}`}
            aria-label="Enter News and Blog"
          >
            <div className="m-panel-ambient-glow glow-purple" />
            <div className="m-panel-top-narration is-news">
              <span className="m-comic-tag tag-purple">
                {activePage === 'blog' ? '★ ACTIVE' : 'WINDOW 02'} &bull; DISPATCHES
              </span>
              <span className="m-comic-sub-tag">SPOTLIGHT // LIVE</span>
            </div>

            <div className="m-w2-body">
              <div className="m-w2-char-wrap">
                <img src="/images/news-character-cutout.png" alt="Character" className="m-char-img" />
              </div>
              <div className="m-w2-dispatches">
                <div className="m-dispatch-row">
                  <span className="hud-badge green-badge">AUDIT PASSED</span>
                  <span>CertiK Multi-sig Treasury Verified</span>
                </div>
                <div className="m-dispatch-row">
                  <span className="hud-badge cyan-badge">ALPHA LIVE</span>
                  <span>Arbitrum // Base Indexer Online</span>
                </div>
              </div>
            </div>

            <div className="m-panel-action-bar is-news">
              <span className="m-meta-text">ISSUE #01 LIVE DISPATCHES</span>
              <span className="m-action-link link-purple">{activePage === 'blog' ? 'READING LORE ↓' : 'READ NEWS →'}</span>
            </div>
          </a>

          {/* Mobile Split Tier: Window 4 & Window 3 */}
          <div className="comic-mobile-split-row">
            {/* Split Panel A: PulseDex.Net */}
            <a
              href="/tokenomics"
              className={`comic-mobile-split-panel m-panel-ticker ${activePage === 'tokenomics' ? 'page-active' : ''}`}
              aria-label="View Tokenomics"
            >
              <div className="m-panel-ambient-glow glow-cyan" />
              <div className="m-split-header">
                <span className="m-comic-tag tag-cyan">W.04 &bull; PULSEDEX</span>
                <span className="m-split-delta">{stats.tokenChange}</span>
              </div>
              <div className="m-split-price">{stats.tokenPrice}</div>
              <div className="m-split-sub">DEMP/PLS VOL: {stats.totalVolume}</div>
            </a>

            {/* Split Panel B: Socials */}
            <a
              href="/alpha"
              className={`comic-mobile-split-panel m-panel-alpha ${activePage === 'alpha' ? 'page-active' : ''}`}
              aria-label="View Socials"
            >
              <div className="m-panel-ambient-glow glow-green" />
              <div className="m-split-header">
                <span className="m-comic-tag tag-green">W.03 &bull; SOCIALS</span>
                <span className="pulse-dot green" />
              </div>
              <div className="m-split-socials-row">
                <span>&#120143; X</span>
                <span>&#9992; TG</span>
                <span>&#127918; DC</span>
              </div>
              <div className="m-split-sub">+5.2K OPERATIVES</div>
            </a>
          </div>

          {/* Mobile Panel 5: PulseChain Stats */}
          <a
            href="/vault"
            className={`comic-mobile-panel m-panel-vault ${activePage === 'vault' ? 'page-active' : ''}`}
            aria-label="View Stats"
          >
            <div className="m-panel-ambient-glow glow-amber" />
            <div className="m-panel-top-narration">
              <span className="m-comic-tag tag-amber">
                {activePage === 'vault' ? '★ ACTIVE' : 'WINDOW 05'} &bull; STATS
              </span>
              <span className="m-comic-sub-tag">NETWORK TELEMETRY</span>
            </div>

            <div className="m-w5-stats-grid">
              <div className="m-stat-box">
                <span className="m-lbl">GENESIS SUPPLY</span>
                <span className="m-val">{stats.totalSupply}</span>
              </div>
              <div className="m-stat-box">
                <span className="m-lbl">TOTAL BURNED</span>
                <span className="m-val glow-burn">1.2M DEMP</span>
              </div>
              <div className="m-stat-box">
                <span className="m-lbl">PLS PRICE</span>
                <span className="m-val">0.00422 PLS</span>
              </div>
              <div className="m-stat-box">
                <span className="m-lbl">GAS TRACKER</span>
                <span className="m-val">262 GWEI</span>
              </div>
            </div>

            <div className="m-panel-action-bar">
              <span className="m-meta-text">&#10003; SMART CONTRACT PROVENANCE</span>
              <span className="m-action-link link-amber">{activePage === 'vault' ? 'INSPECTING VAULT ↓' : 'ENTER VAULT →'}</span>
            </div>
          </a>

          {/* Mobile Panel 6: Roadmap & Staking */}
          <a
            href="/terminal"
            className={`comic-mobile-panel m-panel-terminal ${activePage === 'terminal' ? 'page-active' : ''}`}
            aria-label="Launch Terminal"
          >
            <div className="m-panel-ambient-glow glow-green" />
            <div className="m-panel-top-narration">
              <span className="m-comic-tag tag-green">
                {activePage === 'terminal' ? '★ ACTIVE' : 'WINDOW 06'} &bull; VAULT &amp; ROADMAP
              </span>
              <span className="m-comic-sub-tag">Staking APY: {stats.stakingApy}</span>
            </div>

            <div className="m-w6-body">
              <div className="m-w6-timeline">
                <span className="m-node completed">Q3: LAUNCH &#10003;</span>
                <span className="m-node active">Q4: RELEASE &bull;</span>
                <span className="m-node">Q5: DAO &rarr;</span>
              </div>
            </div>

            <div className="m-panel-action-bar">
              <span className="m-meta-text">{stats.networkStatus}</span>
              <span className="m-action-link">{activePage === 'terminal' ? 'CONNECTED ↓' : 'LAUNCH TERMINAL →'}</span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
};

export default Web3HudHero;
