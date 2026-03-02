/**
 * qkdNetworkAnalysis.js — QKD network path analysis engine
 *
 * Given the full set of contact windows and a pair of nodes (A, B),
 * this module computes:
 *
 *  1. Direct connectivity:  all windows where A↔B are in direct link
 *  2. Real-time relay:      time intervals where A↔M and M↔B overlap
 *                           (key can be relayed instantly through trusted node M)
 *  3. Store-and-forward:    A↔M window closes, then later M↔B window opens
 *                           (satellite M physically carries key — introduces latency)
 *  4. Multi-hop:            chains of 2+ relays (A↔M1, M1↔M2, M2↔B)
 *
 * From these, we derive QKD-specific actionable insights:
 *  - Total connected time, duty cycle %
 *  - Number of contact passes (revisit rate)
 *  - Average / max gap between passes (key delivery latency)
 *  - Average wait time for key delivery
 *  - Number of trusted intermediate nodes per path
 *  - Longest blackout
 */

/* ── Helpers ──────────────────────────────────────────────────── */

/** Check if two time intervals overlap. Returns the overlap interval or null. */
const overlap = (s1, e1, s2, e2) => {
  const start = Math.max(s1, s2);
  const end = Math.min(e1, e2);
  return start < end ? { start, end } : null;
};

/** Merge an array of {start,end} intervals into non-overlapping sorted intervals. */
const mergeIntervals = (intervals) => {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
};

/** Get all contact windows involving a specific node (as tx or rx). */
const windowsForNode = (windows, nodeId) =>
  windows.filter((w) => w.txId === nodeId || w.rxId === nodeId);

/** Get the "other" endpoint in a window given one endpoint id. */
const otherEnd = (w, nodeId) => (w.txId === nodeId ? w.rxId : w.txId);

/**
 * Format milliseconds into human-friendly duration.
 */
export const fmtDuration = (ms) => {
  if (ms == null || ms < 0) return '—';
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(0)}s`;
  if (sec < 3600) return `${(sec / 60).toFixed(1)}m`;
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}h`;
  return `${(sec / 86400).toFixed(1)}d`;
};

/* ═══════════════════════════════════════════════════════════════
 *  Core analysis function
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Analyze the QKD network path between two nodes.
 *
 * @param {string} nodeA - Source node id (e.g. 'sat-0' or 'gs-delhi')
 * @param {string} nodeB - Destination node id
 * @param {Array}  contactWindows - Full list from Redux
 * @param {number} simStart - Simulation start time (ms, UTC)
 * @param {number} simNow   - Current simulation time (ms, UTC)
 * @returns {object} Analysis result
 */
export const analyzeQKDPath = (nodeA, nodeB, contactWindows, simStart, simNow) => {
  const simDuration = simNow - simStart;
  if (simDuration <= 0) {
    return { ready: false, reason: 'Simulation has not progressed yet' };
  }

  // ── 1. Direct connectivity ─────────────────────────────────
  const directWindows = contactWindows.filter(
    (w) =>
      (w.txId === nodeA && w.rxId === nodeB) ||
      (w.txId === nodeB && w.rxId === nodeA),
  );

  const directIntervals = directWindows.map((w) => ({
    start: w.simStart,
    end: w.simEnd,
  }));
  const directMerged = mergeIntervals(directIntervals);

  const directTotalMs = directMerged.reduce((s, iv) => s + (iv.end - iv.start), 0);
  const directPasses = directMerged.length;

  // ── 2. Find relay paths (1-hop) ────────────────────────────
  // For each intermediate node M:
  //   - Find all windows A↔M
  //   - Find all windows M↔B
  //   - Real-time relay: overlapping windows (key passed instantly)
  //   - Store-and-forward: A↔M ends, then later M↔B starts

  const allNodes = new Set();
  contactWindows.forEach((w) => { allNodes.add(w.txId); allNodes.add(w.rxId); });
  allNodes.delete(nodeA);
  allNodes.delete(nodeB);

  const relayPaths = []; // { relayId, realTimeIntervals, storeForwardOps }

  allNodes.forEach((mid) => {
    // Windows between A and M
    const aMWindows = contactWindows.filter(
      (w) =>
        (w.txId === nodeA && w.rxId === mid) ||
        (w.txId === mid && w.rxId === nodeA),
    );
    // Windows between M and B
    const mBWindows = contactWindows.filter(
      (w) =>
        (w.txId === mid && w.rxId === nodeB) ||
        (w.txId === nodeB && w.rxId === mid),
    );

    if (aMWindows.length === 0 || mBWindows.length === 0) return;

    const realTimeIntervals = [];
    const storeForwardOps = [];

    // Real-time relay: find overlapping A↔M and M↔B windows
    aMWindows.forEach((wAM) => {
      mBWindows.forEach((wMB) => {
        const ov = overlap(wAM.simStart, wAM.simEnd, wMB.simStart, wMB.simEnd);
        if (ov) {
          realTimeIntervals.push(ov);
        }
      });
    });

    // Store-and-forward: A↔M window closes, then M↔B window opens later
    // The key is uploaded to M during A↔M, stored on M, then downloaded during M↔B
    const aMSorted = [...aMWindows].sort((a, b) => a.simEnd - b.simEnd);
    const mBSorted = [...mBWindows].sort((a, b) => a.simStart - b.simStart);

    aMSorted.forEach((wAM) => {
      // Find the first M↔B window that starts after A↔M ends
      const nextMB = mBSorted.find((wMB) => wMB.simStart >= wAM.simEnd);
      if (nextMB) {
        const latencyMs = nextMB.simStart - wAM.simEnd;
        // Only count if this isn't already covered by a real-time overlap
        const alreadyCovered = realTimeIntervals.some(
          (iv) => iv.start <= wAM.simEnd && iv.end >= nextMB.simStart,
        );
        if (!alreadyCovered && latencyMs > 0) {
          storeForwardOps.push({
            uploadStart: wAM.simStart,
            uploadEnd: wAM.simEnd,
            downloadStart: nextMB.simStart,
            downloadEnd: nextMB.simEnd,
            latencyMs,
            deliveredAt: nextMB.simStart,
          });
        }
      }
    });

    if (realTimeIntervals.length > 0 || storeForwardOps.length > 0) {
      relayPaths.push({
        relayId: mid,
        realTimeIntervals: mergeIntervals(realTimeIntervals),
        storeForwardOps,
      });
    }
  });

  // ── 3. Aggregate relay connectivity ─────────────────────────
  // Merge all real-time relay intervals (across all relays)
  const allRelayRTIntervals = relayPaths.flatMap((rp) => rp.realTimeIntervals);
  const relayRTMerged = mergeIntervals(allRelayRTIntervals);
  const relayRTTotalMs = relayRTMerged.reduce((s, iv) => s + (iv.end - iv.start), 0);

  // All store-and-forward operations
  const allSFOps = relayPaths.flatMap((rp) =>
    rp.storeForwardOps.map((op) => ({ ...op, relayId: rp.relayId })),
  );
  allSFOps.sort((a, b) => a.uploadStart - b.uploadStart);

  // ── 4. Combined connectivity (direct + real-time relay) ─────
  const allRealTimeIntervals = [...directMerged, ...relayRTMerged];
  const combinedRealTime = mergeIntervals(allRealTimeIntervals);
  const combinedRTTotalMs = combinedRealTime.reduce((s, iv) => s + (iv.end - iv.start), 0);

  // ── 5. Full delivery coverage (including store-and-forward) ──
  // A key can be delivered if there's direct, real-time relay, or store-and-forward.
  // For store-and-forward, the "delivery point" is when M→B link opens.
  const deliveryMoments = [
    ...combinedRealTime.map((iv) => ({ start: iv.start, end: iv.end, type: 'realtime' })),
    ...allSFOps.map((op) => ({ start: op.deliveredAt, end: op.downloadEnd, type: 'store-forward', latencyMs: op.latencyMs, relay: op.relayId })),
  ];
  deliveryMoments.sort((a, b) => a.start - b.start);

  // ── 6. Gap analysis ─────────────────────────────────────────
  // Gaps in real-time connectivity (between combined intervals)
  const gaps = [];
  for (let i = 1; i < combinedRealTime.length; i++) {
    const gapMs = combinedRealTime[i].start - combinedRealTime[i - 1].end;
    if (gapMs > 0) {
      gaps.push({
        start: combinedRealTime[i - 1].end,
        end: combinedRealTime[i].start,
        durationMs: gapMs,
      });
    }
  }
  // Also gap from simStart to first contact and from last contact to simNow
  if (combinedRealTime.length > 0) {
    const firstGap = combinedRealTime[0].start - simStart;
    if (firstGap > 0) gaps.unshift({ start: simStart, end: combinedRealTime[0].start, durationMs: firstGap });
    const lastGap = simNow - combinedRealTime[combinedRealTime.length - 1].end;
    if (lastGap > 0) gaps.push({ start: combinedRealTime[combinedRealTime.length - 1].end, end: simNow, durationMs: lastGap });
  } else {
    gaps.push({ start: simStart, end: simNow, durationMs: simDuration });
  }

  const avgGapMs = gaps.length > 0 ? gaps.reduce((s, g) => s + g.durationMs, 0) / gaps.length : 0;
  const maxGapMs = gaps.length > 0 ? Math.max(...gaps.map((g) => g.durationMs)) : simDuration;

  // ── 7. QKD-specific metrics ─────────────────────────────────
  // Trusted nodes: the set of intermediate satellites used in relay paths
  const trustedNodes = new Set(relayPaths.map((rp) => rp.relayId));

  // Average store-and-forward latency
  const avgSFLatency =
    allSFOps.length > 0
      ? allSFOps.reduce((s, op) => s + op.latencyMs, 0) / allSFOps.length
      : null;

  // Revisit rate: how often we get a new connectivity opportunity
  const totalPasses = directPasses + relayRTMerged.length;
  const revisitRatePerHour =
    simDuration > 0 ? (totalPasses / (simDuration / 3600000)) : 0;

  // Average wait time for key delivery:
  // If we request a key at a random moment, how long on average until it's deliverable?
  // Approximate: average gap / 2  (midpoint of gaps)
  const avgWaitMs = avgGapMs / 2;

  // Key delivery feasibility right now
  const isDirectNow = directWindows.some((w) => !w.closed);
  const isRelayNow = allRelayRTIntervals.some(
    (iv) => iv.start <= simNow && iv.end >= simNow,
  );
  const currentStatus = isDirectNow ? 'direct' : isRelayNow ? 'relay-realtime' : 'disconnected';

  // Best relay path (most real-time overlap)
  const bestRelay = relayPaths.length > 0
    ? relayPaths.reduce((best, rp) => {
        const rtMs = rp.realTimeIntervals.reduce((s, iv) => s + (iv.end - iv.start), 0);
        return rtMs > best.rtMs ? { ...rp, rtMs } : best;
      }, { rtMs: 0 })
    : null;

  return {
    ready: true,
    simDuration,

    // Direct link stats
    direct: {
      passes: directPasses,
      totalMs: directTotalMs,
      dutyCycle: simDuration > 0 ? (directTotalMs / simDuration) * 100 : 0,
      windows: directMerged,
    },

    // Real-time relay stats  
    relay: {
      paths: relayPaths,
      totalMs: relayRTTotalMs,
      dutyCycle: simDuration > 0 ? (relayRTTotalMs / simDuration) * 100 : 0,
    },

    // Store-and-forward
    storeForward: {
      operations: allSFOps,
      count: allSFOps.length,
      avgLatencyMs: avgSFLatency,
      maxLatencyMs: allSFOps.length > 0 ? Math.max(...allSFOps.map((o) => o.latencyMs)) : null,
    },

    // Combined real-time (direct + relay)
    combined: {
      totalMs: combinedRTTotalMs,
      dutyCycle: simDuration > 0 ? (combinedRTTotalMs / simDuration) * 100 : 0,
      passes: combinedRealTime.length,
    },

    // Gap analysis
    gaps: {
      count: gaps.length,
      avgMs: avgGapMs,
      maxMs: maxGapMs,
    },

    // QKD insights
    qkd: {
      trustedNodeCount: trustedNodes.size,
      trustedNodes: [...trustedNodes],
      revisitRatePerHour,
      avgWaitMs,
      avgKeyDeliveryLatency: avgSFLatency != null
        ? avgSFLatency
        : avgGapMs,
      currentStatus,
      bestRelayId: bestRelay?.relayId || null,
    },
  };
};
