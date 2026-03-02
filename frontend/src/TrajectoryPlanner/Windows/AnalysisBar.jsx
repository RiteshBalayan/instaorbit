/**
 * AnalysisBar — Tabbed bottom panel framework
 *
 * The bottom bar (draggable from GlobeAndTimer) is now a tab container.
 * "Timeline" is the first (default) tab; future developers can register
 * new analysis tabs by simply adding an entry to ANALYSIS_TABS below.
 *
 * ┌─[ ▶ Timeline ]──[ 📊 Tab 2 ]──[ … ]────────────────────────┐
 * │                                                              │
 * │   <active tab content fills remaining height>                │
 * │                                                              │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState, Suspense } from 'react';
import Timer from './Timer';
import './AnalysisBar.css';

const LinkAnalysisTab = React.lazy(() => import('./LinkAnalysisTab'));

/* ═══════════════════════════════════════════════════════════════
 *  TAB REGISTRY — Plug-and-play: add a new tab here.
 *
 *  Each entry:
 *    id        – unique string key
 *    label     – displayed in the tab strip
 *    icon      – emoji or short string shown before label
 *    component – React component (or React.lazy(() => import(...)))
 *
 *  The component receives NO props; use Redux / context inside.
 *  Wrap lazy-loaded tabs in React.lazy for code-splitting.
 *
 *  Example future tab:
 *    {
 *      id: 'link-budget',
 *      label: 'Link Budget',
 *      icon: '📡',
 *      component: React.lazy(() => import('./Sidebar/LinkBudgetTab')),
 *    },
 * ═══════════════════════════════════════════════════════════════ */
const ANALYSIS_TABS = [
  {
    id: 'timeline',
    label: 'Timeline',
    icon: '▶',
    component: Timer,
  },
  {
    id: 'link-analysis',
    label: 'Link Analysis',
    icon: '📡',
    component: LinkAnalysisTab,
  },
  // ── Add future analysis tabs here ──────────────────────────
  // {
  //   id: 'coverage',
  //   label: 'Coverage',
  //   icon: '🌍',
  //   component: React.lazy(() => import('./CoverageTab')),
  // },
];

const AnalysisBar = () => {
  const [activeTab, setActiveTab] = useState(ANALYSIS_TABS[0]?.id ?? 'timeline');

  const activeEntry = ANALYSIS_TABS.find((t) => t.id === activeTab) || ANALYSIS_TABS[0];
  const ActiveComponent = activeEntry?.component;

  return (
    <div className="analysis-bar">
      {/* ── Tab strip ─────────────────────────────────────── */}
      {ANALYSIS_TABS.length > 1 && (
        <div className="ab-tab-strip">
          {ANALYSIS_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`ab-tab${tab.id === activeTab ? ' ab-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
            >
              <span className="ab-tab-icon">{tab.icon}</span>
              <span className="ab-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Active tab content ────────────────────────────── */}
      <div className="ab-content">
        <Suspense
          fallback={
            <div className="ab-loading">Loading…</div>
          }
        >
          {ActiveComponent && (
            <ActiveComponent
              {...(activeEntry.id === 'timeline' ? { analysisTab: activeTab, onSwitchTab: setActiveTab } : {})}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default AnalysisBar;
