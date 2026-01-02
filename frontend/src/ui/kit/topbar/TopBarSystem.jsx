import React, { useMemo } from 'react';

// Minimal internal styles; can be themed via CSS vars
const BarRoot = ({ children, sticky, hidden }) => (
  <div
    style={{
      display: hidden ? 'none' : 'block',
      position: sticky ? 'sticky' : 'relative',
      top: sticky ? 0 : undefined,
      width: '100%',
      background: 'linear-gradient(90deg, #232526 0%, #4e54c8 100%)',
      color: '#f5f6fa',
      fontFamily: "Inter, Roboto, system-ui, sans-serif",
      boxShadow: '0 1px 6px rgba(44,44,54,0.10)',
      padding: '0.18rem 0.7rem',
      borderBottom: '1px solid #2d2d2d',
      zIndex: 100,
      fontSize: '0.85rem',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap', width: '100%' }}>
      {children}
    </div>
  </div>
);

const Section = ({ align, children }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flex: align === 'center' ? '1 1 0' : '0',
    justifyContent: align === 'center' ? 'center' : (align === 'right' ? 'flex-end' : 'flex-start'),
    width: align === 'center' ? '100%' : 'auto',
  }}>
    {children}
  </div>
);

const Label = ({ text, title, variant }) => (
  <div title={title} style={{
    fontWeight: variant === 'strong' ? 700 : 500,
    color: variant === 'muted' ? '#cfd6ff' : '#f5f6fa',
    fontSize: variant === 'small' ? '0.78rem' : '0.9rem',
    maxWidth: '40ch',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
  }}>{text}</div>
);

const Button = ({ label, icon, tooltip, intent = 'ghost', disabled, onClick }) => (
  <button
    title={tooltip || label}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
      background: intent === 'primary' ? 'linear-gradient(90deg,#8f94fb,#4e54c8)' : 'transparent',
      color: intent === 'primary' ? '#0f1724' : '#cfd6ff',
      border: '1px solid ' + (intent === 'primary' ? 'rgba(143,148,251,0.9)' : 'rgba(255,255,255,0.12)'),
      padding: '0.28rem 0.52rem', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: intent === 'primary' ? '0 4px 14px rgba(78,84,200,0.12)' : 'none',
      opacity: disabled ? 0.6 : 1,
    }}
  >
    {icon ? <span aria-hidden style={{ fontSize: 14 }}>{icon}</span> : null}
    <span style={{ fontSize: 12 }}>{label}</span>
  </button>
);

// Condition evaluator: conditions are arrays like [{ key: 'hasTrajectory', equals: true }]
const isVisible = (conditions, context) => {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => {
    const val = context?.[c.key];
    if (typeof c.equals !== 'undefined') return val === c.equals;
    if (typeof c.notEquals !== 'undefined') return val !== c.notEquals;
    if (typeof c.truthy !== 'undefined') return !!val === !!c.truthy;
    return !!val;
  });
};

const TopBarSystem = ({ bars = [], context = {}, onEvent, theme }) => {
  // Multiple bars supported; each bar config drives its own rendering
  const content = useMemo(() => bars.filter((b) => isVisible(b.visibility, context)), [bars, context]);

  return (
    <div style={{ width: '100%' }}>
      {content.map((bar) => (
        <BarRoot key={bar.id} sticky={bar.sticky} hidden={bar.hidden}>
          {['left', 'center', 'right'].map((align) => (
            <Section key={align} align={align}>
              {(bar.sections?.filter((s) => s.align === align) || []).flatMap((section) =>
                (section.items || []).filter((item) => isVisible(item.visibility, context)).map((item, idx) => {
                  switch (item.type) {
                    case 'label':
                      return <Label key={section.id + '-' + idx} text={item.text} title={item.title} variant={item.variant} />;
                    case 'button':
                      return (
                        <Button
                          key={section.id + '-' + idx}
                          label={item.label}
                          icon={item.icon}
                          tooltip={item.tooltip}
                          intent={item.intent}
                          disabled={item.disabledWhen && isVisible(item.disabledWhen, { ...context, disabledCheck: true }) === false ? false : item.disabled}
                          onClick={() => onEvent && onEvent(item.event || 'click', { id: item.id, item })}
                        />
                      );
                    default:
                      return null;
                  }
                })
              )}
            </Section>
          ))}
        </BarRoot>
      ))}
    </div>
  );
};

export default TopBarSystem;
