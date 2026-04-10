/**
 * @module swagger
 * @description Swagger/OpenAPI configuration for the InstaOrbit Simulation API.
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'InstaOrbit Simulation API',
      version: '1.0.0',
      description: `
# InstaOrbit Backend API

High-fidelity orbital simulation, attitude computation, and link budget analysis API
for the InstaOrbit satellite mission design platform.

## Core Capabilities

### 🛰 Orbital Propagation
- **Single-step** propagation via \`/simulate\` (Keplerian or SGP4)
- **Bulk propagation** via \`/simulate-bulk\` for multi-satellite scenarios over time ranges

### 🎯 Attitude Determination
- LVLH (nadir-pointing) default orientation
- Priority-based target tracking (satellites, ground stations, sun)
- Slew-rate–limited quaternion transitions via SLERP
- Component-level articulation (solar panels, laser pointers)

### 📡 Link Budget Analysis
- Free-space path loss (FSPL) computation
- Aperture gain, atmospheric loss, pointing loss
- Earth occlusion and elevation mask checks
- Contact window extraction from bulk simulations

## Conventions
- **Coordinate frame**: ECI (Earth-Centered Inertial) — J2000
- **Units**: km for distance, km/s for velocity, radians for angles (unless noted)
- **Quaternion**: Hamilton scalar-last \`[qx, qy, qz, qw]\`
- **Scale factor**: 3185.5 km per scene unit (frontend rendering)
- **Time**: Unix epoch (milliseconds) for absolute time, seconds for elapsed/duration
      `,
      contact: {
        name: 'InstaOrbit Team',
      },
      license: {
        name: 'Private',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Local development server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Server health and status',
      },
      {
        name: 'Propagation',
        description: 'Orbital propagation — single-step and bulk simulation',
      },
    ],
    components: {
      schemas: {
        /* ── Primitives ─────────────────────────────────────── */
        Position3D: {
          type: 'object',
          description: 'A 3D position in ECI (km)',
          properties: {
            x: { type: 'number', description: 'X coordinate (km)', example: 6778.0 },
            y: { type: 'number', description: 'Y coordinate (km)', example: 0.0 },
            z: { type: 'number', description: 'Z coordinate (km)', example: 0.0 },
          },
        },

        OrbitalElements: {
          type: 'object',
          description: 'Classical Keplerian orbital elements',
          required: ['a', 'e', 'i', 'Ω', 'ω', 'ν'],
          properties: {
            a: { type: 'number', description: 'Semi-major axis (km)', example: 7000 },
            e: { type: 'number', description: 'Eccentricity (0–1)', example: 0.001 },
            i: { type: 'number', description: 'Inclination (radians)', example: 0.9 },
            'Ω': { type: 'number', description: 'Right ascension of ascending node — RAAN (radians)', example: 0.0 },
            'ω': { type: 'number', description: 'Argument of periapsis (radians)', example: 0.0 },
            'ν': { type: 'number', description: 'True anomaly (radians)', example: 0.0 },
          },
        },

        Burn: {
          type: 'object',
          description: 'Impulsive delta-v burn in ECI frame',
          properties: {
            id: { type: 'number', description: 'Burn identifier' },
            time: { type: 'number', description: 'Burn trigger time (seconds from sim start)', example: 3600 },
            x: { type: 'number', description: 'Δv in X (km/s)', example: 0.1 },
            y: { type: 'number', description: 'Δv in Y (km/s)', example: 0.0 },
            z: { type: 'number', description: 'Δv in Z (km/s)', example: 0.0 },
          },
        },

        Geodetic: {
          type: 'object',
          description: 'Geodetic coordinates',
          properties: {
            lat: { type: 'number', description: 'Latitude (degrees)', example: 28.5 },
            lon: { type: 'number', description: 'Longitude (degrees)', example: -80.6 },
            alt: { type: 'number', description: 'Altitude above WGS-84 ellipsoid (km)', example: 400 },
          },
        },

        GroundStation: {
          type: 'object',
          description: 'Ground station location',
          properties: {
            id: { type: 'string', description: 'Unique ground station identifier', example: 'gs-0' },
            name: { type: 'string', example: 'Cape Canaveral' },
            lat: { type: 'number', description: 'Latitude (degrees)', example: 28.396837 },
            lon: { type: 'number', description: 'Longitude (degrees)', example: -80.605659 },
            altKm: { type: 'number', description: 'Altitude (km)', default: 0, example: 0 },
          },
        },

        /* ── Body Frame & Components ────────────────────────── */
        BodyFrame: {
          type: 'object',
          description: 'Satellite body-frame configuration including pointing and components',
          properties: {
            bodyShape: {
              type: 'string',
              enum: ['rectangle', 'cone', 'circle'],
              default: 'rectangle',
              description: '3D shape of the satellite body',
            },
            pointingMode: {
              type: 'string',
              enum: ['nadir', 'target'],
              default: 'nadir',
              description: 'Body pointing strategy',
            },
            slewRateDegSec: {
              type: 'number',
              default: 1,
              description: 'Maximum body slew rate (°/s)',
            },
            pointingTargets: {
              type: 'array',
              description: 'Priority-ordered list of pointing targets (used when pointingMode=target)',
              items: { $ref: '#/components/schemas/PointingTarget' },
            },
            components: {
              type: 'array',
              description: 'Articulated sub-components (solar panels, laser pointers)',
              items: { $ref: '#/components/schemas/Component' },
            },
          },
        },

        PointingTarget: {
          type: 'object',
          description: 'A target for the satellite or component to point at',
          properties: {
            id: { type: 'number', description: 'Target ID within the priority list' },
            targetType: {
              type: 'string',
              enum: ['satellite', 'groundStation', 'sun'],
              description: 'Type of target entity',
            },
            targetId: {
              type: 'number',
              nullable: true,
              description: 'ID of the target satellite or ground station (null for sun)',
            },
            conditions: {
              type: 'object',
              description: 'Conditions that must be met for this target to be active',
              properties: {
                minElevationDeg: { type: 'number', description: 'Minimum elevation above horizon (degrees)', default: 5 },
                minDistance: { type: 'number', description: 'Minimum distance (km)' },
                maxDistance: { type: 'number', description: 'Maximum distance (km)' },
              },
            },
            priority: { type: 'number', description: 'Priority rank (1 = highest)', example: 1 },
          },
        },

        Component: {
          type: 'object',
          description: 'An articulated satellite component (solar panel or laser pointer)',
          properties: {
            id: { type: 'string', description: 'Unique component identifier', example: 'comp-1700000000-1' },
            type: {
              type: 'string',
              enum: ['solarPanel', 'laserPointer'],
              description: "'solarPanel' = 1-DOF hinge, 'laserPointer' = 2-DOF alt-az gimbal",
            },
            name: { type: 'string', example: 'Solar Panel 1' },
            parentAxis: {
              type: 'string',
              enum: ['+X', '-X', '+Y', '-Y', '+Z', '-Z'],
              description: 'Body-frame mounting axis (preset)',
            },
            axisDirection: {
              type: 'array',
              items: { type: 'number' },
              description: 'Custom axis direction vector [x, y, z] — overrides parentAxis when edited',
              example: [0, 1, 0],
            },
            positionOffset: {
              type: 'array',
              items: { type: 'number' },
              description: 'Custom position offset [x, y, z] in body-frame scene units',
              example: [0, 0.04, 0],
            },
            offset: { type: 'number', description: 'Distance from body center (scene units)', default: 0.04 },
            dof: { type: 'integer', enum: [1, 2], description: '1 = single-axis, 2 = alt-az gimbal', default: 1 },
            constraint: {
              type: 'object',
              properties: {
                maxAngleDeg: { type: 'number', description: 'Max deflection from rest (degrees)', default: 180 },
              },
            },
            slewRateDegSec: { type: 'number', description: 'Component slew rate (°/s)', default: 5 },
            pointingMode: {
              type: 'string',
              enum: ['default', 'target', 'fixed'],
              default: 'default',
              description: "'default' = type-specific (sun for panels, nadir for lasers)",
            },
            pointingTargets: {
              type: 'array',
              items: { $ref: '#/components/schemas/PointingTarget' },
            },
            fixedAnglesDeg: {
              type: 'object',
              properties: {
                a1: { type: 'number', description: 'Angle 1 (degrees)', default: 0 },
                a2: { type: 'number', description: 'Angle 2 — only for 2-DOF (degrees)', default: 0 },
              },
            },
          },
        },

        /* ── Link Budget ────────────────────────────────────── */
        LinkConfig: {
          type: 'object',
          description: 'Optical/RF link configuration between two endpoints',
          properties: {
            id: { type: 'string', description: 'Link identifier' },
            txId: { type: 'string', description: "Transmitter endpoint ID ('sat-<num>' or ground station ID)", example: 'sat-0' },
            rxId: { type: 'string', description: "Receiver endpoint ID", example: 'gs-0' },
            wavelengthNm: { type: 'number', default: 1550, description: 'Signal wavelength (nm)' },
            txPowerMw: { type: 'number', default: 300, description: 'Transmit power (mW)' },
            txAperture: { type: 'number', default: 0.15, description: 'TX aperture diameter (m)' },
            rxAperture: { type: 'number', default: 0.5, description: 'RX aperture diameter (m)' },
            pointingLoss: { type: 'number', default: 2, description: 'Pointing loss (dB)' },
            atmosphericLoss: { type: 'number', default: 1.5, description: 'Atmospheric loss (dB)' },
            marginDb: { type: 'number', default: 2, description: 'System margin (dB)' },
            noiseFloor: { type: 'number', default: -95, description: 'Noise floor (dBm)' },
            requiredSnr: { type: 'number', default: 10, description: 'Required SNR (dB)' },
            minElevationDeg: { type: 'number', default: 10, description: 'Min elevation for ground links (degrees)' },
          },
        },

        BulkSatellite: {
          type: 'object',
          description: 'Satellite configuration for bulk simulation',
          properties: {
            id: { type: 'number', description: 'Satellite numeric ID', example: 0 },
            propagator: { type: 'string', enum: ['InstaOrbit', 'SGP4'] },
            elements: { $ref: '#/components/schemas/OrbitalElements' },
            timefix: { type: 'number', nullable: true },
            burns: { type: 'array', items: { $ref: '#/components/schemas/Burn' } },
            bodyFrame: { $ref: '#/components/schemas/BodyFrame' },
          },
        },

        /* ── Responses ──────────────────────────────────────── */
        TracePoint: {
          type: 'object',
          description: 'Position and metadata at one simulation timestep',
          properties: {
            time: { type: 'number', description: 'Elapsed seconds' },
            x: { type: 'number', description: 'Scene-unit X (ECI km / 3185.5)' },
            y: { type: 'number', description: 'Scene-unit Y' },
            z: { type: 'number', description: 'Scene-unit Z' },
            mapX: { type: 'number', description: 'Legacy 2D map X coordinate' },
            mapY: { type: 'number', description: 'Legacy 2D map Y coordinate' },
            lat: { type: 'number', description: 'Geodetic latitude (degrees)' },
            lon: { type: 'number', description: 'Geodetic longitude (degrees)' },
            alt: { type: 'number', description: 'Altitude (km)' },
            qx: { type: 'number', description: 'Attitude quaternion X' },
            qy: { type: 'number', description: 'Attitude quaternion Y' },
            qz: { type: 'number', description: 'Attitude quaternion Z' },
            qw: { type: 'number', description: 'Attitude quaternion W (scalar)' },
          },
        },

        AttitudeResult: {
          type: 'object',
          description: 'Attitude computation result',
          properties: {
            quaternion: {
              type: 'array',
              items: { type: 'number' },
              description: '[qx, qy, qz, qw] Hamilton scalar-last',
              example: [0, 0, 0, 1],
            },
            pointingTargetId: {
              type: 'string',
              nullable: true,
              description: 'ID of the active pointing target (null for nadir)',
            },
            isSlewing: {
              type: 'boolean',
              description: 'Whether the satellite is still slewing toward the desired orientation',
            },
          },
        },

        SimulateResponse: {
          type: 'object',
          description: 'Response from single-step simulation',
          properties: {
            tracePoint: { $ref: '#/components/schemas/TracePoint' },
            timefix: { type: 'number', description: 'Computed time-of-perigee offset' },
            velocity: {
              type: 'array',
              items: { type: 'number' },
              description: 'ECI velocity [vx, vy, vz] (km/s)',
            },
            kineticEnergy: { type: 'number', description: 'Specific kinetic energy (km²/s²)' },
            potentialEnergy: { type: 'number', description: 'Specific potential energy (km²/s²)' },
            totalEnergy: { type: 'number', description: 'Specific total energy (km²/s²)' },
            elements: { $ref: '#/components/schemas/OrbitalElements' },
            geodetic: { $ref: '#/components/schemas/Geodetic' },
            attitude: {
              $ref: '#/components/schemas/AttitudeResult',
              nullable: true,
              description: 'Only present when bodyFrame is provided',
            },
            componentAngles: {
              type: 'object',
              nullable: true,
              description: 'Component articulation angles {compId: {a1, a2, targetId}}',
              additionalProperties: {
                type: 'object',
                properties: {
                  a1: { type: 'number', description: 'Angle 1 (degrees)' },
                  a2: { type: 'number', description: 'Angle 2 (degrees)' },
                  targetId: { type: 'string', nullable: true },
                },
              },
            },
          },
        },

        BulkSimulateResponse: {
          type: 'object',
          description: 'Response from bulk simulation',
          properties: {
            satellites: {
              type: 'object',
              description: 'Trace points per satellite {satId: TracePoint[]}',
              additionalProperties: {
                type: 'array',
                items: { $ref: '#/components/schemas/TracePoint' },
              },
            },
            attitude: {
              type: 'object',
              description: 'Attitude time-series per satellite',
            },
            components: {
              type: 'object',
              description: 'Component angle time-series per satellite',
            },
            linkData: {
              type: 'object',
              properties: {
                contactWindows: {
                  type: 'array',
                  description: 'Completed contact windows between endpoints',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      pairId: { type: 'string' },
                      txId: { type: 'string' },
                      rxId: { type: 'string' },
                      simStart: { type: 'number', description: 'Window start (UTC ms)' },
                      simEnd: { type: 'number', description: 'Window end (UTC ms)' },
                    },
                  },
                },
                activeLinksAtTime: {
                  type: 'object',
                  description: 'Active links at each timestep {time: links[]}',
                },
              },
            },
            meta: {
              type: 'object',
              properties: {
                totalSteps: { type: 'integer' },
                stepSize: { type: 'number' },
                duration: { type: 'number' },
                computeTimeMs: { type: 'number', description: 'Wall-clock computation time (ms)' },
              },
            },
          },
        },

        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error message' },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js', './index.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
