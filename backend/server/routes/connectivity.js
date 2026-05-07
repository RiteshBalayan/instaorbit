/**
 * @module routes/connectivity
 * @description Link connectivity endpoint.
 *
 * Given available pairs (from link availability / Feature 1),
 * node definitions (laser terminals + ground station antennas),
 * and priority tables, this endpoint determines which nodes
 * actually connect at each timestep respecting:
 *   • Each node can connect to exactly ONE other node
 *   • Priority ordering for target selection
 *   • Mutual exclusion (if A↔B, both are consumed)
 */

const express = require('express');
const router = express.Router();

/**
 * Resolve a parent entity's ECI position.
 * Used when computePointing is true to find target positions.
 */
function resolveParentPos(parentId, positions, groundStations, utcMs, transforms, linkLib) {
  if (parentId.startsWith('sat-')) {
    const numId = parseFloat(parentId.replace('sat-', ''));
    const pos = positions[numId];
    return pos || null;
  }
  // Ground station → use linkLib helper if available
  if (linkLib) {
    return linkLib.getEndpointPosKm(parentId, positions, groundStations, utcMs);
  }
  // Fallback: resolve manually
  const gs = groundStations.find(g => g.id === parentId);
  if (!gs || !transforms) return null;
  const gmst = transforms.computeGMST(utcMs);
  const ecef = transforms.geodetic2ecef({ lat: gs.lat, lon: gs.lon, alt: gs.altKm || 0 });
  const eci = transforms.ecef2eci(ecef, gmst);
  return { x: eci[0], y: eci[1], z: eci[2] };
}

/**
 * @swagger
 * /link-connectivity:
 *   post:
 *     summary: Compute node-level link connections over a time series
 *     description: |
 *       Given available pairs (from Feature 1 / bulk sim), node definitions
 *       (one per laser terminal / ground antenna), and priority tables,
 *       this endpoint determines which nodes are connected at each timestep.
 *
 *       Each node can connect to at most one other node at a time.
 *       Priority ordering determines which connections are preferred.
 *     tags:
 *       - Connectivity
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - availablePairsTimeSeries
 *               - nodes
 *             properties:
 *               availablePairsTimeSeries:
 *                 type: array
 *                 description: "Time series of available link pairs from bulk sim"
 *                 items:
 *                   type: object
 *                   properties:
 *                     time:
 *                       type: number
 *                     pairs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           txId:
 *                             type: string
 *                           rxId:
 *                             type: string
 *                           rangeKm:
 *                             type: number
 *                           elevationDeg:
 *                             type: number
 *                             nullable: true
 *                           snrDb:
 *                             type: number
 *                           linkMargin:
 *                             type: number
 *                           inLink:
 *                             type: boolean
 *               nodes:
 *                 type: array
 *                 description: "Node definitions — one per laser terminal or ground antenna"
 *                 items:
 *                   type: object
 *                   properties:
 *                     nodeId:
 *                       type: string
 *                       description: "Unique node ID, e.g. 'sat-0:comp-1234' or 'gs-1:antenna-0'"
 *                     parentId:
 *                       type: string
 *                       description: "Parent satellite or ground station ID"
 *                     parentType:
 *                       type: string
 *                       enum: [satellite, groundStation]
 *                     componentId:
 *                       type: string
 *                       nullable: true
 *                     componentType:
 *                       type: string
 *                       enum: [laserPointer, antenna]
 *               priorities:
 *                 type: array
 *                 description: "Per-node priority lists for target selection"
 *                 items:
 *                   type: object
 *                   properties:
 *                     nodeId:
 *                       type: string
 *                     priorities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           targetNodeId:
 *                             type: string
 *                           priority:
 *                             type: number
 *     responses:
 *       200:
 *         description: Connectivity computation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connectedPairsTimeSeries:
 *                   type: array
 *                 connectionWindows:
 *                   type: array
 *                 meta:
 *                   type: object
 *       400:
 *         description: Bad request
 */
router.post('/link-connectivity', (req, res) => {
  try {
    const t0 = Date.now();
    const {
      availablePairsTimeSeries = [],
      nodes = [],
      priorities = [],
      computePointing = false,
      satPositionsTimeSeries = null,
      groundStations = [],
      starttime = 0,
      maxConnectionsPerNode = 1,
    } = req.body;

    // Clamp to a sane range — defends against bad client values.
    const maxPerNode = Math.max(1, Math.min(64, Number(maxConnectionsPerNode) || 1));

    if (!availablePairsTimeSeries.length) {
      return res.status(400).json({ error: 'availablePairsTimeSeries is required and must be non-empty' });
    }
    if (!nodes.length) {
      return res.status(400).json({ error: 'nodes is required and must be non-empty' });
    }

    const transforms = computePointing ? require('../transforms') : null;
    const linkLib = computePointing ? require('../linkComputation') : null;

    // Build lookup: parentId → [nodeId, nodeId, ...]
    const nodesByParent = {};
    const nodeMap = {};
    for (const node of nodes) {
      nodeMap[node.nodeId] = node;
      if (!nodesByParent[node.parentId]) nodesByParent[node.parentId] = [];
      nodesByParent[node.parentId].push(node.nodeId);
    }

    // Build priority lookup: nodeId → [{ targetNodeId, priority }] sorted by priority
    const priorityMap = {};
    for (const p of priorities) {
      priorityMap[p.nodeId] = [...(p.priorities || [])].sort((a, b) => a.priority - b.priority);
    }

    // ── Node processing order ─────────────────────────────────
    // Sort nodes so that satellites with MORE nodes (i.e. more lasers)
    // are processed first. This ensures multi-laser satellites get
    // their full allocation before single-node entities (ground stations,
    // satellites without dedicated lasers) consume scarce targets.
    //
    // The constraint is PER-NODE: each laser terminal connects to at most
    // one target. A satellite with 2 lasers can have 2 connections.
    // But if a ground station grabs a target first, the satellite's
    // second laser might have no remaining targets.
    const nodeCountByParent = {};
    for (const node of nodes) {
      nodeCountByParent[node.parentId] = (nodeCountByParent[node.parentId] || 0) + 1;
    }
    const allNodeIds = nodes.map(n => n.nodeId).sort((a, b) => {
      const parentA = nodeMap[a].parentId;
      const parentB = nodeMap[b].parentId;
      // More nodes → process first (descending)
      const countDiff = (nodeCountByParent[parentB] || 1) - (nodeCountByParent[parentA] || 1);
      if (countDiff !== 0) return countDiff;
      // Tie-break: alphabetical for determinism
      return a.localeCompare(b);
    });

    // ── Process each timestep ────────────────────────────────
    const connectedPairsTimeSeries = [];
    let totalConnections = 0;

    for (const step of availablePairsTimeSeries) {
      const { time, pairs } = step;

      // Build set of available parent-level pairs for quick lookup
      // Key: "parentA|parentB" (both directions)
      const availablePairMap = {};
      for (const pair of pairs) {
        if (!pair.inLink) continue;
        const key1 = `${pair.txId}|${pair.rxId}`;
        const key2 = `${pair.rxId}|${pair.txId}`;
        availablePairMap[key1] = pair;
        availablePairMap[key2] = pair;
      }

      // Track per-node connection count and pair de-duplication.
      // A node may participate in up to `maxPerNode` connections (global setting).
      // `usedPairs` prevents the same parent-pair from being assigned twice
      // when multiple lasers on the same satellite try the same target.
      const nodeCount = {};
      const usedPairs = new Set();
      const isFull = (id) => (nodeCount[id] || 0) >= maxPerNode;
      const consume = (a, b) => {
        nodeCount[a] = (nodeCount[a] || 0) + 1;
        nodeCount[b] = (nodeCount[b] || 0) + 1;
      };
      const pairKeyFor = (p1, p2) => (p1 < p2 ? `${p1}|${p2}` : `${p2}|${p1}`);
      const connections = [];

      // Process nodes in order — each node tries its priority list.
      // Each node may make up to `maxPerNode` connections per timestep.
      // We iterate up to `maxPerNode` rounds so every node has a chance to
      // make its 2nd, 3rd, ... connection only after others have made their 1st.
      for (let round = 0; round < maxPerNode; round++) {
        let madeAny = false;

        for (const nodeId of allNodeIds) {
          if (isFull(nodeId)) continue;

          const node = nodeMap[nodeId];
          const myPriorities = priorityMap[nodeId];

          if (!myPriorities || myPriorities.length === 0) {
            // No priorities configured — try all available pairs involving this parent
            // Connect to the first available not-yet-full node.
            for (const pair of pairs) {
              if (!pair.inLink) continue;
              const isMyTx = pair.txId === node.parentId;
              const isMyRx = pair.rxId === node.parentId;
              if (!isMyTx && !isMyRx) continue;

              const otherParentId = isMyTx ? pair.rxId : pair.txId;
              const otherNodes = nodesByParent[otherParentId] || [];

              let madeForThisNode = false;
              for (const otherNodeId of otherNodes) {
                if (isFull(otherNodeId)) continue;
                const pk = pairKeyFor(nodeId, otherNodeId);
                if (usedPairs.has(pk)) continue;
                usedPairs.add(pk);
                consume(nodeId, otherNodeId);
                connections.push({
                  txNodeId: isMyTx ? nodeId : otherNodeId,
                  rxNodeId: isMyTx ? otherNodeId : nodeId,
                  txParentId: pair.txId,
                  rxParentId: pair.rxId,
                  rangeKm: pair.rangeKm,
                  elevationDeg: pair.elevationDeg,
                });
                madeForThisNode = true;
                madeAny = true;
                break;
              }
              if (madeForThisNode) break;
            }
            continue;
          }

          // Walk priority list
          for (const pri of myPriorities) {
            const targetNodeId = pri.targetNodeId;
            if (isFull(targetNodeId)) continue;
            const pk = pairKeyFor(nodeId, targetNodeId);
            if (usedPairs.has(pk)) continue;

            const targetNode = nodeMap[targetNodeId];
            if (!targetNode) continue;

            // Check if the parent-level pair is available
            const pairKey = `${node.parentId}|${targetNode.parentId}`;
            const pair = availablePairMap[pairKey];
            if (!pair) continue;

            // Connection possible!
            usedPairs.add(pk);
            consume(nodeId, targetNodeId);

            // Determine tx/rx direction from the original pair
            const isMeTx = pair.txId === node.parentId;
            connections.push({
              txNodeId: isMeTx ? nodeId : targetNodeId,
              rxNodeId: isMeTx ? targetNodeId : nodeId,
              txParentId: pair.txId,
              rxParentId: pair.rxId,
              rangeKm: pair.rangeKm,
              elevationDeg: pair.elevationDeg,
            });
            madeAny = true;
            break;
          }
        }

        // Early exit if no progress was made this round
        if (!madeAny) break;
      }

      totalConnections += connections.length;
      connectedPairsTimeSeries.push({ time, connections });
    }

    // ── Build connection windows ─────────────────────────────
    const connectionWindows = buildConnectionWindows(connectedPairsTimeSeries);

    // ── Optionally compute pointing target positions ─────────
    // When computePointing is true, resolve the target ECI position
    // for each connected laser so the frontend can drive laser angles.
    let laserPointingTimeSeries = null;
    if (computePointing && satPositionsTimeSeries) {
      laserPointingTimeSeries = {};
      for (const step of connectedPairsTimeSeries) {
        const { time, connections } = step;
        const utcMs = starttime + time * 1000;
        // Find the matching satellite positions for this timestep
        const satPosEntry = satPositionsTimeSeries.find(e => e.time === time);
        if (!satPosEntry) continue;

        for (const conn of connections) {
          // Resolve target positions for both ends
          const txNode = nodeMap[conn.txNodeId];
          const rxNode = nodeMap[conn.rxNodeId];
          if (!txNode || !rxNode) continue;

          // For the TX node's laser, the target is the RX node's parent position
          if (txNode.parentType === 'satellite' && txNode.componentId) {
            const targetPos = resolveParentPos(conn.rxParentId, satPosEntry.positions, groundStations, utcMs, transforms, linkLib);
            if (targetPos) {
              if (!laserPointingTimeSeries[txNode.parentId]) {
                laserPointingTimeSeries[txNode.parentId] = [];
              }
              const existing = laserPointingTimeSeries[txNode.parentId].find(e => e.time === time);
              if (existing) {
                existing.assignments[txNode.componentId] = { x: targetPos.x, y: targetPos.y, z: targetPos.z, targetId: conn.rxNodeId };
              } else {
                laserPointingTimeSeries[txNode.parentId].push({
                  time,
                  assignments: {
                    [txNode.componentId]: { x: targetPos.x, y: targetPos.y, z: targetPos.z, targetId: conn.rxNodeId },
                  },
                });
              }
            }
          }

          // For the RX node's laser, the target is the TX node's parent position
          if (rxNode.parentType === 'satellite' && rxNode.componentId) {
            const targetPos = resolveParentPos(conn.txParentId, satPosEntry.positions, groundStations, utcMs, transforms, linkLib);
            if (targetPos) {
              if (!laserPointingTimeSeries[rxNode.parentId]) {
                laserPointingTimeSeries[rxNode.parentId] = [];
              }
              const existing = laserPointingTimeSeries[rxNode.parentId].find(e => e.time === time);
              if (existing) {
                existing.assignments[rxNode.componentId] = { x: targetPos.x, y: targetPos.y, z: targetPos.z, targetId: conn.txNodeId };
              } else {
                laserPointingTimeSeries[rxNode.parentId].push({
                  time,
                  assignments: {
                    [rxNode.componentId]: { x: targetPos.x, y: targetPos.y, z: targetPos.z, targetId: conn.txNodeId },
                  },
                });
              }
            }
          }
        }
      }
    }

    const computeTimeMs = Date.now() - t0;

    console.log(
      `[link-connectivity] maxPerNode=${maxPerNode} ` +
      `nodes=${nodes.length} timesteps=${availablePairsTimeSeries.length} ` +
      `totalConnections=${totalConnections} (${computeTimeMs}ms)`
    );

    const response = {
      connectedPairsTimeSeries,
      connectionWindows,
      meta: {
        computeTimeMs,
        totalTimesteps: availablePairsTimeSeries.length,
        totalConnections,
        maxConnectionsPerNode: maxPerNode,
      },
    };

    if (laserPointingTimeSeries) {
      response.laserPointingTimeSeries = laserPointingTimeSeries;
    }

    res.json(response);
  } catch (err) {
    console.error('link-connectivity error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * Build connection windows (continuous periods where a node-pair is connected)
 * from the time series of connections.
 *
 * Same pattern as linkComputation.buildContactWindows but at node level.
 */
function buildConnectionWindows(connectedPairsTimeSeries) {
  const openWindows = {}; // pairId → window object
  const closedWindows = [];

  for (const step of connectedPairsTimeSeries) {
    const { time, connections } = step;
    const activeSet = new Set();

    for (const conn of connections) {
      const pairId = `${conn.txNodeId}→${conn.rxNodeId}`;
      activeSet.add(pairId);
    }

    // Close or extend open windows
    for (const pairId of Object.keys(openWindows)) {
      if (activeSet.has(pairId)) {
        openWindows[pairId].simEnd = time;
        activeSet.delete(pairId);
      } else {
        openWindows[pairId].closed = true;
        closedWindows.push(openWindows[pairId]);
        delete openWindows[pairId];
      }
    }

    // Open new windows
    for (const pairId of activeSet) {
      const conn = connections.find(c => `${c.txNodeId}→${c.rxNodeId}` === pairId);
      openWindows[pairId] = {
        id: `cw-${pairId}-${time}`,
        pairId,
        txNodeId: conn.txNodeId,
        rxNodeId: conn.rxNodeId,
        txParentId: conn.txParentId,
        rxParentId: conn.rxParentId,
        simStart: time,
        simEnd: time,
        closed: false,
      };
    }
  }

  // Close remaining open windows
  for (const pairId of Object.keys(openWindows)) {
    openWindows[pairId].closed = true;
    closedWindows.push(openWindows[pairId]);
  }

  return closedWindows;
}

module.exports = router;
