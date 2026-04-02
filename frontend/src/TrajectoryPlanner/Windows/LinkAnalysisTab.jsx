/**
 * LinkAnalysisTab — bottom-bar analysis panel for live link metrics
 * + QKD Network Path Analysis between any two nodes.
 *
 * Layout:  [ Node-pair selector & QKD report  |  Live link table ]
 *
 * The left panel lets you pick any two nodes (sat or GS) and shows
 * a full QKD path analysis: direct contacts, relay paths,
 * store-and-forward hops, gap analysis, and actionable insights.
 */

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  computeLink,
  buildEndpoints,
  nameFor,
  formatNumber,
} from './Sidebar/linkComputation';
import { analyzeQKDPath, fmtDuration } from './qkdNetworkAnalysis';
import './LinkAnalysisTab.css';

/* ── Tiny status dot ──────────────────────────────────────── */
const StatusDot = ({ status }) => (
  <span
    className={`la-dot la-dot-${status}`}
    title={status === 'active' ? 'Active (LOS)' : status === 'inactive' ? 'No LOS' : 'Waiting'}
  />
);

/* ═══════════════════════════════════════════════════════════════ */
/*  Stat card — reusable metric display                          */
/* ═══════════════════════════════════════════════════════════════ */
const Stat = ({ label, value, sub, className = '' }) => (
  <div className={`la-stat ${className}`}>
    <div className="la-stat-value">{value}</div>
    <div className="la-stat-label">{label}</div>
    {sub && <div className="la-stat-sub">{sub}</div>}
  </div>
);

/* ═══════════════════════════════════════════════════════════════ */
/*  QKD Analysis Panel (left side)                               */
/* ═══════════════════════════════════════════════════════════════ */
const QKDAnalysisPanel = ({ endpoints, satellites, groundStations, contactWindows, starttime, renderTime }) => {
  const [nodeA, setNodeA] = useState('');
  const [nodeB, setNodeB] = useState('');

  const simNow = starttime + renderTime * 1000;

  const analysis = useMemo(() => {
    if (!nodeA || !nodeB || nodeA === nodeB) return null;
    return analyzeQKDPath(nodeA, nodeB, contactWindows, starttime, simNow);
  }, [nodeA, nodeB, contactWindows, starttime, simNow]);

  const nameA = nodeA ? nameFor(nodeA, satellites, groundStations) : '';
  const nameB = nodeB ? nameFor(nodeB, satellites, groundStations) : '';

  return (
    <div className="la-qkd-panel">
      {/* ── Node selector ─────────────────────────────────── */}
      <div className="la-qkd-selector">
        <div className="la-qkd-title">🔑 QKD Path Analysis</div>
        <div className="la-qkd-selects">
          <div className="la-select-group">
            <label className="la-select-label">Node A</label>
            <select className="la-select" value={nodeA} onChange={(e) => setNodeA(e.target.value)}>
              <option value="">Select node…</option>
              {endpoints.map((ep) => (
                <option key={ep.id} value={ep.id} disabled={ep.id === nodeB}>
                  {ep.type === 'sat' ? '🛰 ' : '📡 '}{ep.label}
                </option>
              ))}
            </select>
          </div>
          <div className="la-select-arrow">⇄</div>
          <div className="la-select-group">
            <label className="la-select-label">Node B</label>
            <select className="la-select" value={nodeB} onChange={(e) => setNodeB(e.target.value)}>
              <option value="">Select node…</option>
              {endpoints.map((ep) => (
                <option key={ep.id} value={ep.id} disabled={ep.id === nodeA}>
                  {ep.type === 'sat' ? '🛰 ' : '📡 '}{ep.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Prompt state ──────────────────────────────────── */}
      {(!nodeA || !nodeB) && (
        <div className="la-qkd-prompt">
          Select two network nodes to analyze the QKD key distribution path between them.
          Any satellite or ground station can be selected.
        </div>
      )}
      {nodeA && nodeB && nodeA === nodeB && (
        <div className="la-qkd-prompt la-qkd-warn">
          Select two <em>different</em> nodes.
        </div>
      )}

      {/* ── Analysis results ──────────────────────────────── */}
      {analysis && !analysis.ready && (
        <div className="la-qkd-prompt">
          {analysis.reason || 'Waiting for simulation data…'}
        </div>
      )}

      {analysis?.ready && (
        <div className="la-qkd-results">
          {/* Current status badge */}
          <div className={`la-qkd-status la-qkd-status-${analysis.qkd.currentStatus}`}>
            <span className="la-qkd-status-dot" />
            <span className="la-qkd-status-text">
              {analysis.qkd.currentStatus === 'direct' && `Direct link active — ${nameA} ↔ ${nameB}`}
              {analysis.qkd.currentStatus === 'relay-realtime' && `Real-time relay active`}
              {analysis.qkd.currentStatus === 'disconnected' && `No real-time path available`}
            </span>
          </div>

          {/* ── Key metrics grid ────────────────────────────── */}
          <div className="la-stat-grid">
            <Stat
              label="Direct Contact"
              value={fmtDuration(analysis.direct.totalMs)}
              sub={`${analysis.direct.dutyCycle.toFixed(1)}% duty cycle`}
              className={analysis.direct.passes > 0 ? 'la-stat-good' : ''}
            />
            <Stat
              label="Direct Passes"
              value={analysis.direct.passes}
              sub={`${analysis.qkd.revisitRatePerHour.toFixed(1)}/hr revisit`}
            />
            <Stat
              label="Relay Coverage"
              value={fmtDuration(analysis.relay.totalMs)}
              sub={`${analysis.relay.dutyCycle.toFixed(1)}% via relay`}
              className={analysis.relay.totalMs > 0 ? 'la-stat-relay' : ''}
            />
            <Stat
              label="Combined Uptime"
              value={`${analysis.combined.dutyCycle.toFixed(1)}%`}
              sub={fmtDuration(analysis.combined.totalMs)}
              className="la-stat-highlight"
            />
            <Stat
              label="Avg Wait for Key"
              value={fmtDuration(analysis.qkd.avgWaitMs)}
              sub="avg time to deliver"
            />
            <Stat
              label="Longest Blackout"
              value={fmtDuration(analysis.gaps.maxMs)}
              sub={`${analysis.gaps.count} gap(s)`}
              className={analysis.gaps.maxMs > 3600000 ? 'la-stat-bad' : ''}
            />
          </div>

          {/* ── Trusted relay nodes ─────────────────────────── */}
          <div className="la-qkd-section">
            <div className="la-qkd-section-title">
              Trusted Relay Nodes
              <span className="la-qkd-section-count">{analysis.qkd.trustedNodeCount}</span>
            </div>
            {analysis.qkd.trustedNodeCount === 0 ? (
              <div className="la-qkd-empty-row">No relay paths discovered in simulation</div>
            ) : (
              <div className="la-qkd-relay-list">
                {analysis.relay.paths.map((rp) => {
                  const relayName = nameFor(rp.relayId, satellites, groundStations);
                  const rtMs = rp.realTimeIntervals.reduce((s, iv) => s + (iv.end - iv.start), 0);
                  const sfCount = rp.storeForwardOps.length;
                  return (
                    <div key={rp.relayId} className="la-qkd-relay-item">
                      <span className="la-qkd-relay-name">
                        {rp.relayId.startsWith('sat-') ? '🛰' : '📡'} {relayName}
                      </span>
                      <span className="la-qkd-relay-stats">
                        {rtMs > 0 && (
                          <span className="la-tag la-tag-green">RT {fmtDuration(rtMs)}</span>
                        )}
                        {sfCount > 0 && (
                          <span className="la-tag la-tag-amber">{sfCount} S&amp;F</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Store-and-forward ops ───────────────────────── */}
          {analysis.storeForward.count > 0 && (
            <div className="la-qkd-section">
              <div className="la-qkd-section-title">
                Store &amp; Forward Hops
                <span className="la-qkd-section-count">{analysis.storeForward.count}</span>
              </div>
              <div className="la-stat-row">
                <Stat label="Avg Latency" value={fmtDuration(analysis.storeForward.avgLatencyMs)} />
                <Stat label="Max Latency" value={fmtDuration(analysis.storeForward.maxLatencyMs)} className={analysis.storeForward.maxLatencyMs > 3600000 ? 'la-stat-bad' : ''} />
              </div>
              <div className="la-qkd-sf-list">
                {analysis.storeForward.operations.slice(0, 8).map((op, i) => {
                  const relayName = nameFor(op.relayId, satellites, groundStations);
                  return (
                    <div key={i} className="la-qkd-sf-item">
                      <span className="la-qkd-sf-relay">{relayName}</span>
                      <span className="la-qkd-sf-latency la-bad">{fmtDuration(op.latencyMs)} gap</span>
                    </div>
                  );
                })}
                {analysis.storeForward.operations.length > 8 && (
                  <div className="la-qkd-sf-more">+{analysis.storeForward.operations.length - 8} more</div>
                )}
              </div>
            </div>
          )}

          {/* ── Actionable insights ─────────────────────────── */}
          <div className="la-qkd-section la-qkd-insights">
            <div className="la-qkd-section-title">⚡ Actionable Insights</div>
            <ul className="la-qkd-insight-list">
              {analysis.direct.passes === 0 && analysis.qkd.trustedNodeCount === 0 && (
                <li className="la-insight la-insight-critical">
                  <strong>No connectivity path exists</strong> between {nameA} and {nameB} in the simulated period.
                  Consider adding relay satellites or extending simulation time.
                </li>
              )}
              {analysis.direct.passes === 0 && analysis.qkd.trustedNodeCount > 0 && (
                <li className="la-insight la-insight-warn">
                  <strong>No direct link</strong> — all key transfer requires trusted relay through
                  {' '}{analysis.qkd.trustedNodeCount} intermediate node(s).
                  Each relay node must be trusted for QKD security.
                </li>
              )}
              {analysis.direct.passes > 0 && analysis.direct.dutyCycle < 5 && (
                <li className="la-insight la-insight-warn">
                  <strong>Low direct duty cycle ({analysis.direct.dutyCycle.toFixed(1)}%)</strong> — 
                  key generation windows are sparse. Relay paths can supplement coverage.
                </li>
              )}
              {analysis.combined.dutyCycle > 50 && (
                <li className="la-insight la-insight-good">
                  <strong>Good combined uptime ({analysis.combined.dutyCycle.toFixed(0)}%)</strong> — 
                  real-time key distribution is available more than half the time.
                </li>
              )}
              {analysis.storeForward.count > 0 && (
                <li className="la-insight la-insight-info">
                  <strong>{analysis.storeForward.count} store-and-forward</strong> opportunity(s) detected — 
                  satellite physically carries key for avg {fmtDuration(analysis.storeForward.avgLatencyMs)} before delivery.
                  This adds latency but enables key delivery during blackout periods.
                </li>
              )}
              {analysis.gaps.maxMs > 7200000 && (
                <li className="la-insight la-insight-critical">
                  <strong>Long blackout of {fmtDuration(analysis.gaps.maxMs)}</strong> — 
                  no key delivery possible during this period.
                  Consider adding orbital planes or ground stations to reduce gap.
                </li>
              )}
              {analysis.qkd.revisitRatePerHour > 0 && analysis.qkd.revisitRatePerHour < 1 && (
                <li className="la-insight la-insight-warn">
                  <strong>Low revisit rate ({analysis.qkd.revisitRatePerHour.toFixed(2)}/hr)</strong> — 
                  key refresh opportunities are infrequent. Average wait: {fmtDuration(analysis.qkd.avgWaitMs)}.
                </li>
              )}
              {analysis.qkd.trustedNodeCount > 3 && (
                <li className="la-insight la-insight-warn">
                  <strong>{analysis.qkd.trustedNodeCount} trusted nodes</strong> in relay chain — 
                  large trust perimeter. Each node is a potential attack surface for QKD keys.
                </li>
              )}
              {analysis.combined.dutyCycle === 0 && analysis.storeForward.count === 0 && analysis.direct.passes === 0 && (
                <li className="la-insight la-insight-info">
                  No contact data yet. Run the simulation to generate contact windows.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════ */
/*  Main component                                               */
/* ═══════════════════════════════════════════════════════════════ */
const LinkAnalysisTab = () => {
  const satellites = useSelector((s) => s.satellites.satellitesConfig) || [];
  const groundStations = useSelector((s) => s.groundStations?.groundStations) || [];
  const currentStates = useSelector((s) => s.CurrentState.satelite) || [];
  const particles = useSelector((s) => s.particles?.particles || []);
  const links = useSelector((s) => s.communication.links) || [];
  const contactWindows = useSelector((s) => s.communication.contactWindows) || [];
  const renderTime = useSelector((s) => s.timer.RenderTime);
  const starttime = useSelector((s) => s.timer.starttime);

  // Filter state: '' = all, or an endpoint id
  const [filterEndpoint, setFilterEndpoint] = useState('');

  const endpoints = useMemo(() => buildEndpoints(satellites, groundStations), [satellites, groundStations]);

  // Filter links by selected endpoint (show links where tx or rx matches)
  const filteredLinks = useMemo(() => {
    if (!filterEndpoint) return links;
    return links.filter((l) => l.txId === filterEndpoint || l.rxId === filterEndpoint);
  }, [links, filterEndpoint]);

  // Shared computation context
  const ctx = useMemo(
    () => ({ currentStates, groundStations, particles, renderTime, starttime }),
    [currentStates, groundStations, particles, renderTime, starttime],
  );

  // Position key for memo cache-busting
  const satPosKey = useMemo(
    () =>
      `rt-${renderTime}-` +
      currentStates.map((s) => `${s.id}-${s.coordinates?.x?.toFixed?.(4)}`).join('|'),
    [currentStates, renderTime],
  );

  // Compute all link results (for all links, needed for global stats)
  const allResults = useMemo(
    () => links.map((cfg) => computeLink(cfg, ctx)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [links, renderTime, satPosKey],
  );

  // Filtered results (matching the filtered links)
  const filteredResults = useMemo(
    () => filteredLinks.map((cfg) => computeLink(cfg, ctx)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredLinks, renderTime, satPosKey],
  );

  // Summary stats (from filtered results)
  const activeCount = filteredResults.filter((r) => r.ready && r.inLink).length;
  const totalCount = filteredLinks.length;

  // Contact window stats per link
  const windowStats = useMemo(() => {
    const map = {};
    contactWindows.forEach((w) => {
      if (!map[w.pairId]) map[w.pairId] = { passes: 0, totalMs: 0 };
      map[w.pairId].passes += 1;
      map[w.pairId].totalMs += w.simEnd - w.simStart;
    });
    return map;
  }, [contactWindows]);

  return (
    <div className="la-container">
      <div className="la-split">
        {/* ── Left: QKD Path Analysis ──────────────────────── */}
        <QKDAnalysisPanel
          endpoints={endpoints}
          satellites={satellites}
          groundStations={groundStations}
          contactWindows={contactWindows}
          starttime={starttime}
          renderTime={renderTime}
        />

        {/* ── Right: Live link table ───────────────────────── */}
        <div className="la-table-side">
          {/* Summary bar with filter */}
          <div className="la-summary">
            {/* Filter dropdown */}
            <span className="la-summary-item la-filter-item">
              <span className="la-sum-label">Filter</span>
              <select
                className="la-filter-select"
                value={filterEndpoint}
                onChange={(e) => setFilterEndpoint(e.target.value)}
              >
                <option value="">All Links</option>
                <optgroup label="🛰 Satellites">
                  {endpoints.filter((ep) => ep.type === 'sat').map((ep) => (
                    <option key={ep.id} value={ep.id}>{ep.label}</option>
                  ))}
                </optgroup>
                <optgroup label="📡 Ground Stations">
                  {endpoints.filter((ep) => ep.type === 'gs').map((ep) => (
                    <option key={ep.id} value={ep.id}>{ep.label}</option>
                  ))}
                </optgroup>
              </select>
            </span>
            <span className="la-summary-item">
              <span className="la-sum-label">Links</span>
              <span className="la-sum-value">{totalCount}{filterEndpoint && <span className="la-filter-total"> / {links.length}</span>}</span>
            </span>
            <span className="la-summary-item la-summary-active">
              <span className="la-sum-label">Active</span>
              <span className="la-sum-value la-good">{activeCount}</span>
            </span>
            <span className="la-summary-item">
              <span className="la-sum-label">Inactive</span>
              <span className="la-sum-value la-bad">{totalCount - activeCount}</span>
            </span>
            <span className="la-summary-item">
              <span className="la-sum-label">Contact Windows</span>
              <span className="la-sum-value">{contactWindows.length}</span>
            </span>
          </div>

          {/* Table */}
          {filteredLinks.length === 0 ? (
            <div className="la-empty">
              <span className="la-empty-icon">📡</span>
              <span className="la-empty-text">
                {filterEndpoint ? 'No links for selected endpoint' : 'No links configured'}
              </span>
            </div>
          ) : (
            <div className="la-table-wrap">
              <table className="la-table">
                <thead>
                  <tr>
                    <th className="la-th-status"></th>
                    <th>TX</th>
                    <th>RX</th>
                    <th className="la-num">Range</th>
                    <th className="la-num">SNR</th>
                    <th className="la-num">Margin</th>
                    <th className="la-num">Elev</th>
                    <th className="la-num">Passes</th>
                    <th className="la-num">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((r, i) => {
                    const cfg = filteredLinks[i];
                    const txName = nameFor(cfg.txId, satellites, groundStations);
                    const rxName = nameFor(cfg.rxId, satellites, groundStations);
                    const status = !r.ready ? 'waiting' : r.inLink ? 'active' : 'inactive';
                    const pairId = `${cfg.txId}→${cfg.rxId}`;
                    const ws = windowStats[pairId];
                    const contactTimeSec = ws ? ws.totalMs / 1000 : 0;
                    const contactFmt =
                      contactTimeSec >= 3600
                        ? `${(contactTimeSec / 3600).toFixed(1)}h`
                        : contactTimeSec >= 60
                          ? `${(contactTimeSec / 60).toFixed(1)}m`
                          : `${contactTimeSec.toFixed(0)}s`;

                    return (
                      <tr key={cfg.id} className={`la-row la-row-${status}`}>
                        <td className="la-td-status"><StatusDot status={status} /></td>
                        <td className="la-ep">{txName}</td>
                        <td className="la-ep">{rxName}</td>
                        <td className="la-num">{r.ready ? formatNumber(r.rangeKm, 0) : '—'}</td>
                        <td className="la-num">{r.ready ? formatNumber(r.snrDb, 1) : '—'}</td>
                        <td className="la-num">
                          {r.ready ? (
                            <span className={r.linkMargin >= 0 ? 'la-good' : 'la-bad'}>
                              {formatNumber(r.linkMargin, 1)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="la-num">{r.elevationDeg != null ? formatNumber(r.elevationDeg, 1) : '—'}</td>
                        <td className="la-num">{ws ? ws.passes : 0}</td>
                        <td className="la-num">{ws ? contactFmt : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinkAnalysisTab;
