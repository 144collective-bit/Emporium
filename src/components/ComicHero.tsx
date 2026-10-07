import React, { useState } from 'react';

interface ComicHeroProps {
  isFullScreen?: boolean;
}

/*
 * The comic page: six slanted windows inside one inked frame.
 * `border` is the panel outline in the SVG's 668x314 viewBox; `box` and
 * `clip` place the matching HTML panel (percentages of the page).
 * Panels are empty shells for now - content is rebuilt into them.
 */
const PANELS = [
  {
    id: 1,
    border: '6,9 389,9 381,117 6,174',
    box: { left: '0.90%', top: '2.87%', width: '57.34%', height: '52.55%' },
    clip: 'polygon(0.0% 0.0%, 100.0% 0.0%, 97.91% 65.45%, 0.0% 100.0%)',
  },
  {
    id: 2,
    border: '401,9 660,9 660,82 393,115',
    box: { left: '58.83%', top: '2.87%', width: '39.97%', height: '33.76%' },
    clip: 'polygon(3.0% 0.0%, 100.0% 0.0%, 100.0% 68.87%, 0.0% 100.0%)',
  },
  {
    id: 3,
    border: '475,116 660,93 660,175 485,200',
    box: { left: '71.11%', top: '29.62%', width: '27.69%', height: '34.08%' },
    clip: 'polygon(0.0% 21.5%, 100.0% 0.0%, 100.0% 76.64%, 5.41% 100.0%)',
  },
  {
    id: 4,
    border: '240,150 464,117 473,201 245,233',
    box: { left: '35.93%', top: '38.22%', width: '34.88%', height: '37.26%' },
    clip: 'polygon(0.0% 27.5%, 96.57% 0.0%, 100.0% 72.0%, 3.43% 100.0%)',
  },
  {
    id: 5,
    border: '6,186 229,152 238,306 6,306',
    box: { left: '0.90%', top: '56.37%', width: '34.88%', height: '41.08%' },
    clip: 'polygon(0.0% 0.0%, 100.0% 0.0%, 96.57% 100.0%, 0.0% 100.0%)',
  },
  {
    id: 6,
    border: '246,244 660,187 660,306 250,306',
    box: { left: '36.83%', top: '59.55%', width: '61.98%', height: '37.90%' },
    clip: 'polygon(0.0% 47.9%, 100.0% 0.0%, 100.0% 100.0%, 0.97% 100.0%)',
  },
];

const label = (id: number) => String(id).padStart(2, '0');

export const ComicHero: React.FC<ComicHeroProps> = ({ isFullScreen = false }) => {
  const [hoveredPanel, setHoveredPanel] = useState<number | null>(null);

  return (
    <section className={`comic-hero-section ${isFullScreen ? 'is-fullscreen' : ''}`}>
      <div className="comic-hero-ambient-glow" />

      <div className={`comic-hero-container ${isFullScreen ? 'is-fullscreen' : ''}`}>
        {/* Desktop: the six windows on one comic page */}
        <div className="comic-page-wrapper">
          <svg
            className="comic-svg-overlay"
            viewBox="0 0 668 314"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <rect
              x="6"
              y="9"
              width="654"
              height="297"
              className="comic-outer-frame"
              vectorEffect="non-scaling-stroke"
            />
            {PANELS.map((p) => (
              <polygon
                key={p.id}
                points={p.border}
                className={`comic-svg-panel-border ${hoveredPanel === p.id ? 'is-active' : ''}`}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {PANELS.map((p) => (
            <div
              key={p.id}
              className={`comic-panel panel-${p.id} ${hoveredPanel === p.id ? 'hovered' : ''}`}
              style={{ ...p.box, clipPath: p.clip }}
              onMouseEnter={() => setHoveredPanel(p.id)}
              onMouseLeave={() => setHoveredPanel(null)}
            >
              <span className="comic-panel-number" aria-hidden="true">{label(p.id)}</span>
            </div>
          ))}
        </div>

        {/* Mobile: the same windows stacked, 03 and 04 side by side */}
        <div className="comic-mobile-strip">
          {[[1], [2], [3, 4], [5], [6]].map((row) =>
            row.length === 1 ? (
              <div key={row[0]} className="comic-mobile-panel">
                <span className="comic-panel-number" aria-hidden="true">{label(row[0])}</span>
              </div>
            ) : (
              <div key={row.join('-')} className="comic-mobile-split-row">
                {row.map((id) => (
                  <div key={id} className="comic-mobile-panel">
                    <span className="comic-panel-number" aria-hidden="true">{label(id)}</span>
                  </div>
                ))}
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
};

export default ComicHero;
