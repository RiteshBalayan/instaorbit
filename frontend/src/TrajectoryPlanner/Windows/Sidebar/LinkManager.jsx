/**
 * LinkManager — Redesigned communication link management panel.
 *
 * Two-level architecture:
 *   Level 1 — Connection topology: visual node graph + link list with live status
 *   Level 2 — Link detail: expand a link to see metrics, advanced params, history
 *
 * Replaces the old LinkBudgetPanel (modal) with an inline sidebar component.
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLinks, deleteLink as deleteLinkAction } from '../../../Store/communicationSlice';
import {
  defaultParams,
  computeLink,
  buildEndpoints,
  nameFor,
  formatNumber,
} from './linkComputation';
import './LinkManager.css';

/* ═══════════════════════════════════════════════════════════════ */
/*  Tiny SVG icons (no MUI dep)                                  */
/* ═══════════════════════════════════════════════════════════════ */
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M7 3h2v4h4v2H9v4H7V9H3V7h4z"/></svg>
);
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M5 2V1h6v1h4v2H1V2h4zm1 4h1v7H6V6zm3 0h1v7H9V6zM3 5h10l-.8 10H3.8L3 5z"/></svg>
);
const IconChevron = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform .15s' }}>
    <path d="M6 4l4 4-4 4z"/>
  </svg>
);
const IconSat = () => <span className="lm-icon-emoji">🛰</span>;
const IconGS = () => <span className="lm-icon-emoji">📡</span>;

/* ═══════════════════════════════════════════════════════════════ */
/*  Quick Add Popover                                            */
/* ═══════════════════════════════════════════════════════════════ */
const QuickAddPopover = ({ endpoints, existingLinks, onAdd, onClose }) => {
  const [tx, setTx] = useState('');
  const [rx, setRx] = useState('');

  const isDuplicate = useMemo(() => {
    if (!tx || !rx) return false;
    return existingLinks.some(
      (l) => (l.txId === tx && l.rxId === rx) || (l.txId === rx && l.rxId === tx),
    );
  }, [tx, rx, existingLinks]);

  const isSame = tx && rx && tx === rx;

  return (
    <div className="lm-quick-add">
      <div className="lm-qa-title">New Connection</div>
      <div className="lm-qa-row">
        <select className="lm-select" value={tx} onChange={(e) => setTx(e.target.value)}>
          <option value="">— From —</option>
          {endpoints.map((ep) => (
            <option key={ep.id} value={ep.id}>
              {ep.type === 'sat' ? '🛰 ' : '📡 '}{ep.label}
            </option>
          ))}
        </select>
        <span className="lm-qa-arrow">→</span>
        <select className="lm-select" value={rx} onChange={(e) => setRx(e.target.value)}>
          <option value="">— To —</option>
          {endpoints.map((ep) => (
            <option key={ep.id} value={ep.id}>
              {ep.type === 'sat' ? '🛰 ' : '📡 '}{ep.label}
            </option>
          ))}
        </select>
      </div>
      {isDuplicate && <div className="lm-qa-warn">This link already exists</div>}
      {isSame && <div className="lm-qa-warn">Cannot link an endpoint to itself</div>}
      <div className="lm-qa-actions">
        <button className="lm-btn lm-btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="lm-btn lm-btn-primary"
          disabled={!tx || !rx || isDuplicate || isSame}
          onClick={() => { onAdd(tx, rx); onClose(); }}
        >
          Create
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════ */
/*  Advanced Parameters (collapsible)                            */
/* ═══════════════════════════════════════════════════════════════ */
const AdvancedParams = ({ cfg, onChange }) => {
  const field = (label, key, step = 1) => (
    <label className="lm-adv-field" key={key}>
      <span>{label}</span>
      <input
        type="number"
        className="lm-input-sm"
        value={cfg[key] ?? defaultParams[key]}
        step={step}
        onChange={(e) => onChange(key, parseFloat(e.target.value))}
      />
    </label>
  );

  return (
    <div className="lm-advanced">
      <div className="lm-adv-grid">
        {field('Wavelength (nm)', 'wavelengthNm')}
        {field('Tx Power (mW)', 'txPowerMw')}
        {field('Tx Aperture (m)', 'txAperture', 0.01)}
        {field('Rx Aperture (m)', 'rxAperture', 0.01)}
        {field('Min Elevation (°)', 'minElevationDeg')}
        {field('Pointing Loss (dB)', 'pointingLoss', 0.5)}
        {field('Atmo Loss (dB)', 'atmosphericLoss', 0.5)}
        {field('Margin (dB)', 'marginDb', 0.5)}
        {field('Noise Floor (dBm)', 'noiseFloor')}
        {field('Required SNR (dB)', 'requiredSnr', 0.5)}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════ */
/*  Single Link Row (expandable)                                 */
/* ═══════════════════════════════════════════════════════════════ */
const LinkRow = ({ cfg, result, endpoints, onDelete, onParamChange, contactWindows }) => {
  const [expanded, setExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const txEp = endpoints.find((e) => e.id === cfg.txId);
  const rxEp = endpoints.find((e) => e.id === cfg.rxId);
  const txLabel = txEp?.label || cfg.txId;
  const rxLabel = rxEp?.label || cfg.rxId;
  const status = !result?.ready
    ? 'waiting'
    : result.inLink
      ? 'active'
      : 'inactive';

  // Contact windows for this link
  const pairId = `${cfg.txId}→${cfg.rxId}`;
  const myWindows = useMemo(
    () =>
      (contactWindows || [])
        .filter((w) => w.pairId === pairId)
        .sort((a, b) => (b.simEnd ?? 0) - (a.simEnd ?? 0))
        .slice(0, 10),
    [contactWindows, pairId],
  );

  return (
    <div className={`lm-link-row ${expanded ? 'lm-link-expanded' : ''}`}>
      {/* ── Header strip ────────────────────────────────── */}
      <div className="lm-link-header" onClick={() => setExpanded(!expanded)}>
        <div className="lm-link-left">
          <IconChevron open={expanded} />
          <span className={`lm-status-dot lm-status-${status}`} />
          <span className="lm-link-label">
            {txEp?.type === 'sat' ? '🛰' : '📡'} {txLabel}
            <span className="lm-link-arrow">→</span>
            {rxEp?.type === 'sat' ? '🛰' : '📡'} {rxLabel}
          </span>
        </div>
        <div className="lm-link-right">
          {result?.ready && (
            <span className="lm-link-quick-stats">
              {result.inLink && <span className="lm-qs-val">{formatNumber(result.rangeKm, 0)} km</span>}
              {result.inLink && result.elevationDeg != null && (
                <span className="lm-qs-val">{formatNumber(result.elevationDeg, 1)}°</span>
              )}
              {result.inLink && <span className={`lm-qs-val ${result.linkMargin >= 0 ? 'lm-good' : 'lm-bad'}`}>{formatNumber(result.linkMargin, 1)} dB</span>}
            </span>
          )}
          <button className="lm-btn-icon lm-btn-danger" title="Delete link" onClick={(e) => { e.stopPropagation(); onDelete(cfg.id); }}>
            <IconTrash />
          </button>
        </div>
      </div>

      {/* ── Expanded detail ──────────────────────────────── */}
      {expanded && (
        <div className="lm-link-detail">
          {/* Key metrics */}
          {result?.ready ? (
            <div className="lm-metrics-grid">
              <div className="lm-metric">
                <span className="lm-metric-label">Status</span>
                <span className={`lm-metric-value ${result.inLink ? 'lm-good' : 'lm-bad'}`}>
                  {result.inLink ? 'In Link' : 'No Link'}
                </span>
              </div>
              <div className="lm-metric">
                <span className="lm-metric-label">Range</span>
                <span className="lm-metric-value">{formatNumber(result.rangeKm, 1)} km</span>
              </div>
              <div className="lm-metric">
                <span className="lm-metric-label">Elevation</span>
                <span className="lm-metric-value">
                  {result.elevationDeg != null ? `${formatNumber(result.elevationDeg, 1)}°` : 'N/A'}
                </span>
              </div>
              <div className="lm-metric">
                <span className="lm-metric-label">SNR</span>
                <span className="lm-metric-value">{result.inLink ? `${formatNumber(result.snrDb, 1)} dB` : '—'}</span>
              </div>
              <div className="lm-metric">
                <span className="lm-metric-label">Margin</span>
                <span className={`lm-metric-value ${result.linkMargin >= 0 ? 'lm-good' : 'lm-bad'}`}>
                  {result.inLink ? `${formatNumber(result.linkMargin, 1)} dB` : '—'}
                </span>
              </div>
              <div className="lm-metric">
                <span className="lm-metric-label">Rx Power</span>
                <span className="lm-metric-value">{result.inLink ? `${formatNumber(result.rxPowerDbm, 1)} dBm` : '—'}</span>
              </div>
            </div>
          ) : (
            <div className="lm-waiting">Waiting for position data…</div>
          )}

          {/* Advanced params toggle */}
          <button className="lm-btn lm-btn-ghost lm-btn-sm" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? '▾ Hide Parameters' : '▸ Advanced Parameters'}
          </button>
          {showAdvanced && (
            <AdvancedParams
              cfg={cfg}
              onChange={(key, val) => onParamChange(cfg.id, key, val)}
            />
          )}

          {/* Contact windows (inline, last 10) */}
          {myWindows.length > 0 && (
            <div className="lm-history">
              <div className="lm-history-title">Recent Contact Windows</div>
              <table className="lm-history-table">
                <thead>
                  <tr>
                    <th>Start</th>
                    <th>End</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myWindows.map((w) => {
                    const dur = ((w.simEnd - w.simStart) / 1000).toFixed(1);
                    return (
                      <tr key={w.id}>
                        <td>{new Date(w.simStart).toUTCString().slice(17, 25)}</td>
                        <td>{new Date(w.simEnd).toUTCString().slice(17, 25)}</td>
                        <td>{dur}s</td>
                        <td className={w.closed ? '' : 'lm-good'}>{w.closed ? 'Closed' : 'Active'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════ */
/*  Interactive Node Graph (SVG)                                 */
/*  Click a node → see all its connections as smooth curves.     */
/*  Connected = solid coloured, unconnected = dashed gray.       */
/*  "Connect All / Disconnect All" toggle for the selected node. */
/* ═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════ */
/*  Interactive Node Graph — Radial Star Layout                  */
/*                                                               */
/*  Default: compact pill grid showing all endpoints.            */
/*  Click a node → it centers, all other nodes fan out around    */
/*  it in a radial layout with smooth bezier curves.             */
/*  Sat↔Sat, Sat↔GS, GS↔Sat all work naturally.                */
/*  Each node's diagram is unique to its connections.            */
/* ═══════════════════════════════════════════════════════════════ */

const NodeGraph = ({ endpoints, links, results, onAddLink, onDeleteLink }) => {
  const [selectedId, setSelectedId] = useState(null);

  // ── helpers ──────────────────────────────────────────────
  const hasLink = useCallback(
    (a, b) => links.some((l) => (l.txId === a && l.rxId === b) || (l.txId === b && l.rxId === a)),
    [links],
  );
  const findLinkId = useCallback(
    (a, b) => links.find((l) => (l.txId === a && l.rxId === b) || (l.txId === b && l.rxId === a))?.id,
    [links],
  );
  const linkResult = useCallback(
    (a, b) => {
      const l = links.find((l) => (l.txId === a && l.rxId === b) || (l.txId === b && l.rxId === a));
      return l ? results.find((r) => r.id === l.id) || null : null;
    },
    [links, results],
  );

  const others = useMemo(
    () => (selectedId ? endpoints.filter((e) => e.id !== selectedId) : []),
    [selectedId, endpoints],
  );

  const connections = useMemo(() => {
    if (!selectedId) return [];
    return others.map((ep) => {
      const connected = hasLink(selectedId, ep.id);
      const res = linkResult(selectedId, ep.id);
      const status = !connected ? 'none' : !res?.ready ? 'waiting' : res.inLink ? 'active' : 'inactive';
      return { ...ep, connected, status, linkId: findLinkId(selectedId, ep.id) };
    });
  }, [selectedId, others, hasLink, linkResult, findLinkId]);

  const connectedCount = connections.filter((c) => c.connected).length;
  const allConnected = connections.length > 0 && connectedCount === connections.length;

  // ── handlers ─────────────────────────────────────────────
  const handleNodeClick = (id) => setSelectedId((p) => (p === id ? null : id));
  const toggleConn = (targetId) => {
    if (!selectedId) return;
    if (hasLink(selectedId, targetId)) {
      const lid = findLinkId(selectedId, targetId);
      if (lid) onDeleteLink(lid);
    } else {
      onAddLink(selectedId, targetId);
    }
  };
  const connectAll = () => {
    if (!selectedId) return;
    others.forEach((ep) => { if (!hasLink(selectedId, ep.id)) onAddLink(selectedId, ep.id); });
  };
  const disconnectAll = () => {
    if (!selectedId) return;
    connections.forEach((c) => { if (c.connected && c.linkId) onDeleteLink(c.linkId); });
  };

  const selEp = endpoints.find((e) => e.id === selectedId);

  if (endpoints.length === 0) return null;

  // ────────────────────────────────────────────────────────
  //  SELECTED VIEW — radial star
  // ────────────────────────────────────────────────────────
  if (selectedId && selEp) {
    const n = others.length;
    const R = 90;           // orbit radius for outer nodes
    const CX = 155;         // SVG center x
    const CY = 110;         // SVG center y
    const SVG_W = 310;
    const SVG_H = Math.max(220, n > 6 ? 260 : 220);
    const NODE_RX = 48;     // pill half-width
    const NODE_RY = 13;     // pill half-height

    // distribute others evenly around the center
    const outerPositions = others.map((_, i) => {
      // start from top (-90°) and go clockwise
      const angle = (-Math.PI / 2) + (2 * Math.PI * i) / n;
      return {
        x: CX + R * Math.cos(angle),
        y: CY + R * Math.sin(angle),
        angle,
      };
    });

    // smooth cubic bezier from center to outer node
    const curvePath = (ox, oy) => {
      // Control points: pull outward from center, creating a nice arc
      const dx = ox - CX;
      const dy = oy - CY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pull = dist * 0.45;
      // perpendicular offset for curve aesthetics
      const nx = -dy / dist;
      const ny = dx / dist;
      const cpx1 = CX + dx * 0.3 + nx * pull * 0.15;
      const cpy1 = CY + dy * 0.3 + ny * pull * 0.15;
      const cpx2 = CX + dx * 0.7 - nx * pull * 0.08;
      const cpy2 = CY + dy * 0.7 - ny * pull * 0.08;
      return `M${CX},${CY} C${cpx1},${cpy1} ${cpx2},${cpy2} ${ox},${oy}`;
    };

    return (
      <div className="lm-nodegraph-wrap">
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="lm-nodegraph-svg">
          <defs>
            <filter id="glow-green">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-center">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* ── Curves from center to each outer node ───── */}
          {connections.map((conn, i) => {
            const pos = outerPositions[i];
            if (!pos) return null;
            const path = curvePath(pos.x, pos.y);
            const isActive = conn.status === 'active';
            const isConnected = conn.connected;
            const isInactive = conn.status === 'inactive';

            return (
              <g key={conn.id} style={{ cursor: 'pointer' }} onClick={() => toggleConn(conn.id)}>
                {/* Glow for active */}
                {isActive && (
                  <path d={path} fill="none" stroke="rgba(74,222,128,0.2)" strokeWidth="8" filter="url(#glow-green)" className="lm-curve-glow" />
                )}
                {/* Main curve */}
                <path
                  d={path}
                  fill="none"
                  stroke={
                    isActive ? '#4ade80'
                    : isInactive ? '#f87171'
                    : isConnected ? '#94a3b8'
                    : 'rgba(255,255,255,0.1)'
                  }
                  strokeWidth={isConnected ? 2.2 : 1}
                  strokeDasharray={isConnected ? 'none' : '3 4'}
                  className="lm-curve"
                />
                {/* Midpoint badge for unconnected — + button */}
                {!isConnected && (() => {
                  const mx = (CX + pos.x) / 2;
                  const my = (CY + pos.y) / 2;
                  return (
                    <>
                      <circle cx={mx} cy={my} r="7" fill="rgba(59,130,246,0.45)" className="lm-add-dot" />
                      <text x={mx} y={my + 0.5} textAnchor="middle" dominantBaseline="middle"
                        fill="#fff" fontSize="9" fontWeight="700" style={{ pointerEvents: 'none' }}>+</text>
                    </>
                  );
                })()}
                {/* Inline status label for connected */}
                {isConnected && (() => {
                  const mx = (CX + pos.x) / 2;
                  const my = (CY + pos.y) / 2;
                  const res = linkResult(selectedId, conn.id);
                  const label = isActive
                    ? (res?.rangeKm ? `${Math.round(res.rangeKm)} km` : 'Active')
                    : isInactive ? 'No LOS' : '…';
                  return (
                    <text x={mx} y={my - 6} textAnchor="middle" dominantBaseline="middle"
                      className="lm-curve-label"
                      fill={isActive ? '#4ade80' : isInactive ? '#f87171' : '#94a3b8'}
                    >
                      {label}
                    </text>
                  );
                })()}
              </g>
            );
          })}

          {/* ── Center node (selected) ──────────────────── */}
          <g filter="url(#glow-center)">
            <rect
              x={CX - NODE_RX} y={CY - NODE_RY}
              width={NODE_RX * 2} height={NODE_RY * 2}
              rx="8"
              className={`lm-node-rect ${selEp.type === 'sat' ? 'lm-node-sat' : 'lm-node-gs'} lm-node-center`}
            />
          </g>
          <text x={CX - NODE_RX + 10} y={CY + 1} dominantBaseline="middle" className="lm-node-icon">
            {selEp.type === 'sat' ? '🛰' : '📡'}
          </text>
          <text x={CX - NODE_RX + 24} y={CY + 1} dominantBaseline="middle" className="lm-node-label lm-center-label">
            {selEp.label.length > 10 ? selEp.label.slice(0, 9) + '…' : selEp.label}
          </text>

          {/* ── Outer nodes (radial) ────────────────────── */}
          {connections.map((conn, i) => {
            const pos = outerPositions[i];
            if (!pos) return null;
            const isSat = conn.type === 'sat';
            return (
              <g key={conn.id} style={{ cursor: 'pointer' }} onClick={() => handleNodeClick(conn.id)}>
                <rect
                  x={pos.x - NODE_RX} y={pos.y - NODE_RY}
                  width={NODE_RX * 2} height={NODE_RY * 2}
                  rx="7"
                  className={`lm-node-rect ${isSat ? 'lm-node-sat' : 'lm-node-gs'} ${
                    conn.connected ? 'lm-node-linked' : ''
                  }`}
                />
                <text x={pos.x - NODE_RX + 8} y={pos.y + 1} dominantBaseline="middle" className="lm-node-icon">
                  {isSat ? '🛰' : '📡'}
                </text>
                <text x={pos.x - NODE_RX + 21} y={pos.y + 1} dominantBaseline="middle" className="lm-node-label">
                  {conn.label.length > 9 ? conn.label.slice(0, 8) + '…' : conn.label}
                </text>
                {/* Connected indicator dot */}
                {conn.connected && (
                  <circle
                    cx={pos.x + NODE_RX - 6} cy={pos.y}
                    r="3"
                    fill={conn.status === 'active' ? '#4ade80' : conn.status === 'inactive' ? '#f87171' : '#94a3b8'}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* ── Actions bar ────────────────────────────────── */}
        <div className="lm-ng-actions">
          <span className="lm-ng-sel-label">
            {selEp.type === 'sat' ? '🛰' : '📡'} {selEp.label}
            <span className="lm-ng-count">{connectedCount}/{connections.length}</span>
          </span>
          <button
            className={`lm-btn lm-btn-sm ${allConnected ? 'lm-btn-danger-solid' : 'lm-btn-primary'}`}
            onClick={allConnected ? disconnectAll : connectAll}
          >
            {allConnected ? 'Disconnect All' : 'Connect All'}
          </button>
          <button className="lm-btn lm-btn-ghost lm-btn-sm" onClick={() => setSelectedId(null)}>✕</button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  //  DEFAULT VIEW — compact pill grid (click any to focus)
  // ────────────────────────────────────────────────────────
  const sats = endpoints.filter((e) => e.type === 'sat');
  const gs = endpoints.filter((e) => e.type === 'ground');

  return (
    <div className="lm-nodegraph-wrap">
      <div className="lm-ng-default-hint">Click any node to see its connections</div>
      <div className="lm-ng-grid">
        {/* Satellites */}
        {sats.length > 0 && (
          <div className="lm-ng-col">
            <div className="lm-ng-col-label">Satellites</div>
            {sats.map((ep) => {
              const linkCount = links.filter(
                (l) => l.txId === ep.id || l.rxId === ep.id,
              ).length;
              const activeCount = links.filter((l) => {
                if (l.txId !== ep.id && l.rxId !== ep.id) return false;
                const r = results.find((res) => res.id === l.id);
                return r?.ready && r?.inLink;
              }).length;
              return (
                <button
                  key={ep.id}
                  className="lm-ng-pill lm-ng-pill-sat"
                  onClick={() => handleNodeClick(ep.id)}
                >
                  <span className="lm-ng-pill-icon">🛰</span>
                  <span className="lm-ng-pill-name">{ep.label}</span>
                  {linkCount > 0 && (
                    <span className="lm-ng-pill-count">
                      <span className={activeCount > 0 ? 'lm-good' : ''}>{activeCount}</span>/{linkCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Ground Stations */}
        {gs.length > 0 && (
          <div className="lm-ng-col">
            <div className="lm-ng-col-label">Ground Stations</div>
            {gs.map((ep) => {
              const linkCount = links.filter(
                (l) => l.txId === ep.id || l.rxId === ep.id,
              ).length;
              const activeCount = links.filter((l) => {
                if (l.txId !== ep.id && l.rxId !== ep.id) return false;
                const r = results.find((res) => res.id === l.id);
                return r?.ready && r?.inLink;
              }).length;
              return (
                <button
                  key={ep.id}
                  className="lm-ng-pill lm-ng-pill-gs"
                  onClick={() => handleNodeClick(ep.id)}
                >
                  <span className="lm-ng-pill-icon">📡</span>
                  <span className="lm-ng-pill-name">{ep.label}</span>
                  {linkCount > 0 && (
                    <span className="lm-ng-pill-count">
                      <span className={activeCount > 0 ? 'lm-good' : ''}>{activeCount}</span>/{linkCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════ */
/*  Main LinkManager component                                   */
/* ═══════════════════════════════════════════════════════════════ */
const LinkManager = () => {
  const dispatch = useDispatch();
  const satellites = useSelector((s) => s.satellites.satellitesConfig);
  const groundStations = useSelector((s) => s.groundStations.groundStations);
  const currentStates = useSelector((s) => s.CurrentState.satelite);
  const particles = useSelector((s) => s.particles?.particles || []);
  const savedLinks = useSelector((s) => s.communication.links);
  const contactWindows = useSelector((s) => s.communication.contactWindows);
  const renderTime = useSelector((s) => s.timer.RenderTime);
  const starttime = useSelector((s) => s.timer.starttime);

  const [linkConfigs, setLinkConfigs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const initializedRef = useRef(false);

  // Build endpoints
  const endpoints = useMemo(() => buildEndpoints(satellites, groundStations), [satellites, groundStations]);

  // Sync from Redux on mount
  useEffect(() => {
    if (initializedRef.current) return;
    if (savedLinks?.length) {
      setLinkConfigs(savedLinks);
      initializedRef.current = true;
    }
  }, [savedLinks]);

  // Re-sync if Redux links change externally
  useEffect(() => {
    if (savedLinks && JSON.stringify(savedLinks) !== JSON.stringify(linkConfigs)) {
      setLinkConfigs(savedLinks);
    }
  }, [savedLinks]);

  // Compute link results
  const ctx = useMemo(
    () => ({ currentStates, groundStations, particles, renderTime, starttime }),
    [currentStates, groundStations, particles, renderTime, starttime],
  );

  const satPosKey = useMemo(
    () => `rt-${renderTime}-` + currentStates.map((s) => `${s.id}-${s.coordinates?.x?.toFixed?.(4)}`).join('|'),
    [currentStates, renderTime],
  );

  const linkResults = useMemo(
    () => linkConfigs.map((cfg) => computeLink(cfg, ctx)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linkConfigs, renderTime, satPosKey],
  );

  // Persist to Redux
  const persistLinks = (newLinks) => {
    setLinkConfigs(newLinks);
    dispatch(setLinks(newLinks));
  };

  const handleAdd = (txId, rxId) => {
    const id = `link-${Date.now()}`;
    const newLink = { id, txId, rxId, ...defaultParams };
    persistLinks([...linkConfigs, newLink]);
  };

  const handleDelete = (linkId) => {
    persistLinks(linkConfigs.filter((l) => l.id !== linkId));
  };

  const handleParamChange = (linkId, key, val) => {
    const updated = linkConfigs.map((l) => (l.id === linkId ? { ...l, [key]: val } : l));
    persistLinks(updated);
  };

  // Summary counts
  const activeCount = linkResults.filter((r) => r.ready && r.inLink).length;
  const totalCount = linkConfigs.length;

  return (
    <div className="lm-root">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="lm-header">
        <div className="lm-header-left">
          <span className="lm-title">Links</span>
          {totalCount > 0 && (
            <span className="lm-badge">
              <span className="lm-badge-active">{activeCount}</span>/{totalCount}
            </span>
          )}
        </div>
        <button className="lm-btn lm-btn-primary lm-btn-sm" onClick={() => setShowAdd(!showAdd)} disabled={endpoints.length < 2}>
          <IconPlus /> Add
        </button>
      </div>

      {/* ── Quick-add popover ───────────────────────────── */}
      {showAdd && (
        <QuickAddPopover
          endpoints={endpoints}
          existingLinks={linkConfigs}
          onAdd={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* ── Node graph (interactive topology) ──────────── */}
      {endpoints.length > 0 && (
        <NodeGraph
          endpoints={endpoints}
          links={linkConfigs}
          results={linkResults}
          onAddLink={handleAdd}
          onDeleteLink={handleDelete}
        />
      )}

      {/* ── Empty state ─────────────────────────────────── */}
      {endpoints.length < 2 && (
        <div className="lm-empty">
          Add at least 1 satellite and 1 ground station (or 2 satellites) to create links.
        </div>
      )}
      {endpoints.length >= 2 && linkConfigs.length === 0 && (
        <div className="lm-empty">
          No links configured. Click <strong>Add</strong> to connect endpoints.
        </div>
      )}

      {/* ── Link list ───────────────────────────────────── */}
      <div className="lm-link-list">
        {linkConfigs.map((cfg) => {
          const result = linkResults.find((r) => r.id === cfg.id);
          return (
            <LinkRow
              key={cfg.id}
              cfg={cfg}
              result={result}
              endpoints={endpoints}
              contactWindows={contactWindows}
              onDelete={handleDelete}
              onParamChange={handleParamChange}
            />
          );
        })}
      </div>
    </div>
  );
};

export default LinkManager;
