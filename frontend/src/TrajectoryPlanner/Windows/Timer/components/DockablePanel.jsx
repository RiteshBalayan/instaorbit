import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { createPortal } from 'react-dom';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const DEFAULT_TOPBAR_FALLBACK_PX = 44;

function parseCssPx(value) {
  if (!value) return null;
  const n = Number.parseFloat(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function readRootCssVarPx(varName) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName);
    return parseCssPx(v);
  } catch {
    return null;
  }
}

const STORAGE_KEY = 'instaorbit:dockable-panel:v2';

export default function DockablePanel({
  children,
  title,
  headerRight,
  className,
  topOffsetVar = '--topbar-height',
  defaultExpanded = true,
  defaultExpandedSize = { width: 320, height: 420 },
  defaultCollapsedSize = { width: 56, height: 170 },
  minExpandedSize = { width: 260, height: 260 },
}) {
  const initialTop = useMemo(() => {
    const fromCss = readRootCssVarPx(topOffsetVar);
    return fromCss ?? DEFAULT_TOPBAR_FALLBACK_PX;
  }, [topOffsetVar]);

  const saved = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [expanded, setExpanded] = useState(saved?.expanded ?? defaultExpanded);
  const [pos, setPos] = useState(saved?.pos ?? { x: 0, y: initialTop });
  const [size, setSize] = useState(
    saved?.size ?? (defaultExpanded ? defaultExpandedSize : defaultCollapsedSize)
  );
  const [userResized, setUserResized] = useState(saved?.userResized ?? false);

  const headerRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ expanded, pos, size, userResized })
      );
    } catch {
      // ignore
    }
  }, [expanded, pos, size, userResized]);

  useEffect(() => {
    const top = readRootCssVarPx(topOffsetVar) ?? DEFAULT_TOPBAR_FALLBACK_PX;
    // Keep panel from drifting above the topbar.
    setPos((p) => ({ ...p, y: Math.max(p.y, top) }));
  }, [topOffsetVar]);

  useLayoutEffect(() => {
    if (!expanded) return;
    if (userResized) return;

    const headerEl = headerRef.current;
    const bodyEl = bodyRef.current;
    if (!headerEl || !bodyEl) return;

    const computeAndSet = () => {
      const top = readRootCssVarPx(topOffsetVar) ?? DEFAULT_TOPBAR_FALLBACK_PX;
      const maxH = Math.max(260, window.innerHeight - top - 14);
      const headerH = headerEl.offsetHeight || 44;
      const bodyH = bodyEl.scrollHeight || bodyEl.offsetHeight || 320;
      const targetH = Math.min(maxH, Math.max(minExpandedSize.height, headerH + bodyH + 2));
      setSize((s) => ({ ...s, height: targetH }));
    };

    computeAndSet();

    const ro = new ResizeObserver(() => computeAndSet());
    ro.observe(bodyEl);
    return () => ro.disconnect();
  }, [expanded, minExpandedSize.height, topOffsetVar, userResized]);

  const effectiveSize = expanded ? size : defaultCollapsedSize;

  const node = (
    <div className="dock-panel-layer" aria-hidden={false}>
      <Rnd
        bounds="parent"
        dragHandleClassName="dock-panel__drag"
        disableDragging={!expanded}
        enableResizing={
          expanded
            ? {
                right: true,
                bottom: true,
                bottomRight: true,
              }
            : false
        }
        minWidth={expanded ? minExpandedSize.width : defaultCollapsedSize.width}
        minHeight={expanded ? minExpandedSize.height : defaultCollapsedSize.height}
        size={effectiveSize}
        position={pos}
        onDragStop={(_, d) => setPos({ x: d.x, y: d.y })}
        onResizeStop={(_, __, ref, ___, p) => {
          setSize({ width: ref.offsetWidth, height: ref.offsetHeight });
          setPos(p);
          setUserResized(true);
        }}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          className={`dock-panel ${expanded ? '' : 'dock-panel--collapsed'} ${className || ''}`}
          role="region"
          aria-label={title || 'Panel'}
        >
          <div ref={headerRef} className="dock-panel__header dock-panel__drag">
            <div className="dock-panel__title">{title}</div>
            <div className="dock-panel__right">{headerRight}</div>
            <button
              type="button"
              className="dock-panel__toggle"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
            </button>
          </div>

          {expanded ? (
            <div ref={bodyRef} className="dock-panel__body">{children}</div>
          ) : (
            <button
              type="button"
              className="dock-panel__collapsed-pill"
              onClick={() => setExpanded(true)}
              aria-label="Expand control panel"
              title="Expand"
            >
              <span className="dock-panel__collapsed-text">CTRL</span>
            </button>
          )}
        </div>
      </Rnd>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
}
