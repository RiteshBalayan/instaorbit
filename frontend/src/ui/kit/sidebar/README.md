# Sidebar UI Kit

A self-contained, configurable Sidebar Utility Control component for reuse across apps.

## Component
- `SidebarUtilityControl`: presentational component with optional Reference System toggle and a configurable list of checkbox items.

### Props
- `title` (string): Section title for the checkboxes (default: `Graphics Control`).
- `reference` (object | undefined): `{ value: 'EarthInertial' | 'EarthFixed', onToggle: () => void }`.
- `items` (Array): `[{ key: string, label: string, checked: boolean, onChange: (checked:boolean) => void }]`.

## Usage
```jsx
import SidebarUtilityControl from '../../ui/kit/sidebar/SidebarUtilityControl';

<SidebarUtilityControl
  reference={{ value: referenceSystem, onToggle: handleReferenceToggle }}
  items=[
    { key: 'Grid', label: 'Grid', checked: view.Grid, onChange: onGrid },
    { key: 'Axis', label: 'Axis', checked: view.Axis, onChange: onAxis },
  ]
/>
```

This kit is purely presentational and has no Redux or app logic.
