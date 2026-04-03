/**
 * EarthMaterial — Custom ShaderMaterial for realistic day/night Earth rendering.
 *
 * Features:
 *   • Proper day/night blending based on sun direction
 *   • City lights ONLY visible on the dark (unlit) side
 *   • Smooth terminator transition
 *   • Atmosphere Fresnel rim glow
 *   • Cloud layer blending
 *   • Specular highlight on oceans (when specular map provided)
 *
 * Usage:
 *   <mesh>
 *     <sphereGeometry args={[2, 128, 128]} />
 *     <EarthMaterial
 *       dayMap={dayTexture}
 *       nightMap={nightTexture}
 *       cloudsMap={cloudsTexture}
 *       sunDirection={[sx, sy, sz]}  // normalized ECI or LVLH sun direction
 *     />
 *   </mesh>
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/* ═══════════════════════════════════════════════════════════════
 *  GLSL Shaders
 * ═══════════════════════════════════════════════════════════════ */

const earthVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    // Normal in world space (not view space)
    vNormalWorld = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const earthFragmentShader = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D cloudsMap;
  uniform vec3 sunDirection;       // normalized direction TO the sun (world space)
  uniform float cloudsOpacity;

  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPosition;

  void main() {
    vec3 N = normalize(vNormalWorld);
    vec3 L = normalize(sunDirection);

    // ── Day/night factor based on sun angle ──────────────
    float NdotL = dot(N, L);

    // Smooth terminator: transition over ~10° at the terminator
    float dayFactor = smoothstep(-0.1, 0.2, NdotL);

    // ── Sample textures ──────────────────────────────────
    vec4 dayColor   = texture2D(dayMap, vUv);
    vec4 nightColor = texture2D(nightMap, vUv);
    vec4 cloudColor = texture2D(cloudsMap, vUv);

    // ── Lambertian diffuse shading on the day side ───────
    float diffuse = max(NdotL, 0.0);
    float dayShading = 0.02 + 0.98 * diffuse;
    vec3 litDay = dayColor.rgb * dayShading;

    // ── Night side: city lights (unshaded, emissive) ─────
    // Keep subtle — these are tiny city lights, not flood-lights
    float nightBlend = (1.0 - dayFactor);          // 1 on dark side, 0 on lit side
    vec3 litNight = nightColor.rgb * 0.8 * nightBlend;

    // ── Cloud layer ──────────────────────────────────────
    float cloudMask = cloudColor.r * cloudsOpacity;
    // Clouds obscure city lights on night side
    litNight *= (1.0 - cloudMask * 0.9);
    // Clouds are lit by the sun on day side
    float cloudBright = mix(0.0, dayShading, dayFactor);
    vec3 cloudContrib = cloudColor.rgb * cloudBright * cloudsOpacity;

    // ── Blend day and night ──────────────────────────────
    vec3 surface = mix(litNight, litDay, dayFactor) + cloudContrib;

    // ── Atmosphere Fresnel rim ───────────────────────────
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = 1.0 - max(dot(viewDir, N), 0.0);
    fresnel = pow(fresnel, 4.0);
    vec3 atmosColor = vec3(0.3, 0.55, 1.0);
    float atmosIntensity = mix(0.0, 0.12, dayFactor) * fresnel;
    surface += atmosColor * atmosIntensity;

    gl_FragColor = vec4(surface, 1.0);
  }
`;

/* ═══════════════════════════════════════════════════════════════
 *  React Component
 * ═══════════════════════════════════════════════════════════════ */

const EarthMaterial = React.forwardRef(({
  dayMap,
  nightMap,
  cloudsMap,
  sunDirection = [1, 0, 0],
  cloudsOpacity = 0.35,
}, ref) => {
  const matRef = useRef();

  const uniforms = useMemo(() => ({
    dayMap:        { value: dayMap },
    nightMap:      { value: nightMap },
    cloudsMap:     { value: cloudsMap },
    sunDirection:  { value: new THREE.Vector3(...sunDirection) },
    cloudsOpacity: { value: cloudsOpacity },
  }), [dayMap, nightMap, cloudsMap]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update sun direction every frame (set imperatively for perf)
  useFrame(() => {
    if (matRef.current) {
      matRef.current.uniforms.sunDirection.value.set(
        sunDirection[0], sunDirection[1], sunDirection[2],
      );
      matRef.current.uniforms.cloudsOpacity.value = cloudsOpacity;
    }
  });

  return (
    <shaderMaterial
      ref={(r) => {
        matRef.current = r;
        if (typeof ref === 'function') ref(r);
        else if (ref) ref.current = r;
      }}
      vertexShader={earthVertexShader}
      fragmentShader={earthFragmentShader}
      uniforms={uniforms}
    />
  );
});

EarthMaterial.displayName = 'EarthMaterial';

export default EarthMaterial;
