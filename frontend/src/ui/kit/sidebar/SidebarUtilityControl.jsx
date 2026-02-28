import React from 'react';
import styled, { css, keyframes } from 'styled-components';

/* ═══════════════════════════════════════════════════════════════
   Graphics Control — redesigned utility panel
   Modern glass-morphism dark theme with grouped sections
   ═══════════════════════════════════════════════════════════════ */

/* ── animations ── */
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 6px rgba(0, 255, 204, 0.25); }
  50%      { box-shadow: 0 0 14px rgba(0, 255, 204, 0.45); }
`;

/* ── layout ── */
const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 14px 12px 18px;
  animation: ${fadeIn} 0.25s ease-out;
`;

/* ── section card ── */
const Section = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SectionTitle = styled.div`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: rgba(160, 174, 192, 0.8);
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
`;

/* ── reference frame toggle ── */
const FrameRow = styled.div`
  display: flex;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
`;

const FrameOption = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  transition: all 0.2s ease;

  ${({ $active }) =>
    $active
      ? css`
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          color: #fff;
        `
      : css`
          background: rgba(255, 255, 255, 0.04);
          color: rgba(200, 210, 220, 0.65);
          &:hover {
            background: rgba(255, 255, 255, 0.07);
            color: rgba(200, 210, 220, 0.9);
          }
        `}
`;

/* ── toggle switch ── */
const ToggleRow = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const ToggleLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: rgba(210, 218, 228, 0.9);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ToggleIcon = styled.span`
  font-size: 14px;
  width: 20px;
  text-align: center;
`;

const SwitchTrack = styled.div`
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  transition: all 0.2s ease;
  flex-shrink: 0;

  ${({ $on, $accent }) =>
    $on
      ? css`
          background: ${$accent || '#00ffcc'};
          box-shadow: 0 0 8px ${$accent || 'rgba(0, 255, 204, 0.35)'};
        `
      : css`
          background: rgba(255, 255, 255, 0.12);
        `}
`;

const SwitchThumb = styled.div`
  position: absolute;
  top: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s ease;
  transform: ${({ $on }) => ($on ? 'translateX(18px)' : 'translateX(2px)')};
`;

const HiddenInput = styled.input`
  display: none;
`;

/* ── checkbox grid ── */
const CheckGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 8px;
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const CheckBox = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid ${({ $on }) => ($on ? '#00ffcc' : 'rgba(255,255,255,0.2)')};
  background: ${({ $on }) => ($on ? 'rgba(0,255,204,0.15)' : 'transparent')};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;

  &::after {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: ${({ $on }) => ($on ? '#00ffcc' : 'transparent')};
    transition: background 0.15s;
  }
`;

const CheckLabel = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ $on }) => ($on ? 'rgba(220,230,240,0.95)' : 'rgba(180,190,200,0.6)')};
  transition: color 0.15s;
`;

/* ── fancy feature button ── */
const FeatureButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${({ $active }) =>
    $active ? 'rgba(0, 255, 204, 0.3)' : 'rgba(255, 255, 255, 0.06)'};
  border-radius: 8px;
  background: ${({ $active }) =>
    $active
      ? 'linear-gradient(135deg, rgba(0,255,204,0.08), rgba(6,182,212,0.06))'
      : 'rgba(255, 255, 255, 0.02)'};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  ${({ $active }) =>
    $active &&
    css`
      animation: ${pulseGlow} 2s ease-in-out infinite;
    `}

  &:hover {
    background: ${({ $active }) =>
      $active
        ? 'linear-gradient(135deg, rgba(0,255,204,0.12), rgba(6,182,212,0.10))'
        : 'rgba(255, 255, 255, 0.05)'};
    border-color: ${({ $active }) =>
      $active ? 'rgba(0, 255, 204, 0.4)' : 'rgba(255, 255, 255, 0.12)'};
  }
`;

const FeatureIcon = styled.span`
  font-size: 18px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: ${({ $active }) =>
    $active ? 'rgba(0,255,204,0.12)' : 'rgba(255,255,255,0.04)'};
  flex-shrink: 0;
`;

const FeatureText = styled.div`
  flex: 1;
  min-width: 0;
`;

const FeatureName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? '#5eead4' : 'rgba(210,218,228,0.85)')};
  transition: color 0.2s;
`;

const FeatureDesc = styled.div`
  font-size: 10px;
  color: rgba(160, 170, 180, 0.6);
  margin-top: 1px;
`;

const FeatureBadge = styled.span`
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${({ $active }) =>
    $active ? 'rgba(0,255,204,0.15)' : 'rgba(255,255,255,0.06)'};
  color: ${({ $active }) => ($active ? '#5eead4' : 'rgba(160,170,180,0.5)')};
`;

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */
export default function SidebarUtilityControl({
  reference,
  sceneItems = [],
  overlayItems = [],
  trackWindow = false,
  onTrackWindowChange,
  showOrbit = true,
  onShowOrbitChange,
}) {
  return (
    <Panel>
      {/* ── Reference Frame ── */}
      {reference && (
        <Section>
          <SectionTitle>Reference Frame</SectionTitle>
          <FrameRow onClick={reference.onToggle}>
            <FrameOption $active={reference.value === 'EarthInertial'}>
              🌌&nbsp; Inertial (ECI)
            </FrameOption>
            <FrameOption $active={reference.value === 'EarthFixed'}>
              🌍&nbsp; Fixed (ECEF)
            </FrameOption>
          </FrameRow>
        </Section>
      )}

      {/* ── Track & Orbit Controls ── */}
      <Section>
        <SectionTitle>Trajectory Display</SectionTitle>

        {/* Track Horizon — fancy feature button */}
        <FeatureButton
          $active={trackWindow}
          onClick={() => onTrackWindowChange?.(!trackWindow)}
        >
          <FeatureIcon $active={trackWindow}>⏳</FeatureIcon>
          <FeatureText>
            <FeatureName $active={trackWindow}>Track Horizon</FeatureName>
            <FeatureDesc>Show only ±1 hr ground track window</FeatureDesc>
          </FeatureText>
          <FeatureBadge $active={trackWindow}>
            {trackWindow ? 'ON' : 'OFF'}
          </FeatureBadge>
        </FeatureButton>

        {/* Orbit Ring toggle */}
        <ToggleRow>
          <ToggleLabel>
            <ToggleIcon>💫</ToggleIcon>
            Orbit Ring
          </ToggleLabel>
          <HiddenInput
            type="checkbox"
            checked={showOrbit}
            onChange={(e) => onShowOrbitChange?.(e.target.checked)}
          />
          <SwitchTrack $on={showOrbit} $accent="#818cf8">
            <SwitchThumb $on={showOrbit} />
          </SwitchTrack>
        </ToggleRow>
      </Section>

      {/* ── Scene ── */}
      {sceneItems.length > 0 && (
        <Section>
          <SectionTitle>Scene</SectionTitle>
          <CheckGrid>
            {sceneItems.map((it) => (
              <CheckRow key={it.key}>
                <HiddenInput
                  type="checkbox"
                  checked={!!it.checked}
                  onChange={(e) => it.onChange?.(e.target.checked)}
                />
                <CheckBox $on={!!it.checked} />
                <CheckLabel $on={!!it.checked}>{it.label}</CheckLabel>
              </CheckRow>
            ))}
          </CheckGrid>
        </Section>
      )}

      {/* ── Overlays ── */}
      {overlayItems.length > 0 && (
        <Section>
          <SectionTitle>Overlays</SectionTitle>
          <CheckGrid>
            {overlayItems.map((it) => (
              <CheckRow key={it.key}>
                <HiddenInput
                  type="checkbox"
                  checked={!!it.checked}
                  onChange={(e) => it.onChange?.(e.target.checked)}
                />
                <CheckBox $on={!!it.checked} />
                <CheckLabel $on={!!it.checked}>{it.label}</CheckLabel>
              </CheckRow>
            ))}
          </CheckGrid>
        </Section>
      )}
    </Panel>
  );
}
