# TopBar UI Kit

Configurable, app-agnostic top bar system for React apps. Provides multiple bars, sections, items (labels/buttons), and visibility logic controlled via a `context` object. Emits events to the host app; contains no app-specific imports.

## Usage

```jsx
import TopBarSystem from '@/ui/kit/topbar/TopBarSystem';

const bars = [
  {
    id: 'main',
    sticky: true,
    visibility: [{ key: 'uiVisible', equals: true }],
    sections: [
      {
        id: 'project', align: 'left', items: [
          { type: 'label', text: 'My Project', variant: 'strong' },
        ]
      },
      {
        id: 'actions', align: 'center', items: [
          { type: 'button', id: 'open', label: 'Open', icon: '📂', event: 'open' },
          { type: 'button', id: 'new', label: 'New', icon: '🆕', event: 'new' },
        ]
      },
      {
        id: 'auth', align: 'right', items: [
          { type: 'button', id: 'login', label: 'Login', icon: '🔐', event: 'login', visibility: [{ key: 'isAuthenticated', equals: false }] },
          { type: 'button', id: 'logout', label: 'Logout', icon: '✅', event: 'logout', visibility: [{ key: 'isAuthenticated', equals: true }] },
        ]
      },
    ]
  }
];

const context = { uiVisible: true, isAuthenticated: true };

export default function TopBar() {
  const onEvent = (name, payload) => {
    if (name === 'open') {/* open dialog */}
    if (name === 'new') {/* create new */}
  };
  return <TopBarSystem bars={bars} context={context} onEvent={onEvent} />;
}
```

## Concepts

- **bars**: Array of bar configs. Each bar can be sticky/hidden and define `sections`.
- **sections**: Aligned to `left|center|right`. Each section has `items`.
- **items**: UI primitives. Supported: `label`, `button`. More can be added.
- **visibility**: Array of conditions `{ key, equals|notEquals|truthy }` checked against `context`.
- **events**: Button `onClick` emits `{ name, payload }` via `onEvent`.

## Theming

- Override CSS variables or pass inline styles by wrapping the component.

## Roadmap

- Add inputs, toggles, menus, overflow handling, hide-on-scroll behavior.
