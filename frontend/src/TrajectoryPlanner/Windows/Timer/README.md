# Timer Component Refactoring

This directory contains the refactored Timer component with improved organization and maintainability.

## Phase 1 Completion ✅

Phase 1 focused on extracting utility functions from the monolithic Timer.jsx component into reusable, testable modules.

### What Was Done

#### 1. Created Utility Modules

**`utils/timeConversions.js`**
- `roundToThreeDecimals()` - Rounds numbers to 3 decimal places
- `convertTimeUnit()` - Converts seconds to h/m/s
- `convertToSeconds()` - Converts h/m/s back to seconds
- `getUnitLabel()` - Returns full unit name
- `getUnitAbbreviation()` - Returns unit abbreviation

**`utils/timeFormatters.js`**
- `formatElapsedTime()` - Formats elapsed time with unit suffix
- `formatFancyTime()` - Creates fancy time display with icons
- `formatStandardTime()` - Standard date-time string formatting
- `formatTimelineTime()` - Timeline-specific formatting
- `getTimelineFormatConfig()` - Timeline format configuration

**`utils/timelineConfig.js`**
- `createTimelineGroups()` - Creates timeline group dataset
- `createTimelineOptions()` - Creates timeline configuration
- `createParticleItems()` - Creates satellite timeline items
- `createCurrentTimePoint()` - Creates simulation time marker
- `createRenderTimePoint()` - Creates render time marker
- `createTimelineItems()` - Assembles complete timeline dataset
- `getTimelineRange()` - Calculates timeline min/max

**`constants.js`**
- Centralized all magic numbers and configuration values
- Time units, default values, labels, CSS classes
- Makes configuration changes easy and consistent

#### 2. Updated Timer.jsx

The original Timer.jsx was updated to:
- Import and use the extracted utilities
- Use constants instead of magic numbers
- Simplified timeline effect using utility functions
- Removed duplicate code (formatFancyTime, formatElapsedTime)

#### 3. Added Tests

Created `__tests__/timeConversions.test.js` with unit tests for conversion utilities.

### Benefits Achieved

✅ **Reduced Timer.jsx size** from 461 to ~380 lines  
✅ **Improved testability** - utilities can be tested independently  
✅ **Better code organization** - related functions grouped together  
✅ **Eliminated code duplication** - single source of truth  
✅ **Enhanced maintainability** - changes isolated to specific modules  
✅ **Type-safety ready** - easy to add TypeScript later  

### File Structure

```
Timer/
├── README.md                      # This file
├── constants.js                   # Configuration constants
├── utils/
│   ├── index.js                   # Barrel export
│   ├── timeConversions.js         # Unit conversion utilities
│   ├── timeFormatters.js          # Display formatting utilities
│   ├── timelineConfig.js          # Timeline configuration utilities
│   └── __tests__/
│       └── timeConversions.test.js
└── (Timer.jsx in parent directory)
```

### Usage Example

```javascript
import {
  roundToThreeDecimals,
  formatElapsedTime,
  formatFancyTime,
  createTimelineItems,
} from './Timer/utils';
import { DEFAULT_TIME_STEP, TIME_UNITS } from './Timer/constants';

// Convert and format time
const timeInSeconds = 3665;
const formatted = formatElapsedTime(timeInSeconds, TIME_UNITS.HOUR); // "1.018h"

// Create timeline with utilities
const items = createTimelineItems(particles, starttime, elapsed, render, onUpdate);
```

### Testing

```bash
# Run tests
npm test Timer/utils/__tests__

# Run with coverage
npm test -- --coverage Timer/utils
```

## Phase 2 Completion ✅

Phase 2 focused on extracting custom hooks to encapsulate complex logic and side effects.

### What Was Done

#### 1. Created Custom Hooks

**`hooks/useSimulationTimer.js`**
- Manages simulation timer state and progression
- Handles play/pause/reset functionality
- Encapsulates timer interval logic
- Returns simulation state and control functions

**`hooks/useRenderTimer.js`**
- Manages render time independently or coupled with simulation
- Handles both coupled and decoupled modes
- Manages render timer intervals
- Returns render state and controls

**`hooks/useTimeline.js`**
- Encapsulates vis-timeline initialization and updates
- Manages timeline instance lifecycle
- Provides timeline control functions (zoom, move, etc.)
- Returns timeline ref and control methods

**`hooks/useTimeFormatting.js`**
- Manages time unit selection state
- Provides memoized formatted time values
- Returns formatted strings for display
- Handles current/start/elapsed time formatting

#### 2. Refactored Timer.jsx

The main Timer component was dramatically simplified:
- **Removed all useEffect hooks** (moved to custom hooks)
- **Removed all useRef declarations** for intervals (encapsulated in hooks)
- **Simplified component logic** to just event handlers and render
- **Reduced from 461 → 229 lines** (50% reduction!)

#### 3. Benefits Achieved

✅ **Massive complexity reduction** - Timer.jsx is now half the size  
✅ **Better separation of concerns** - Each hook has single responsibility  
✅ **Improved testability** - Hooks can be tested independently  
✅ **Enhanced reusability** - Hooks can be used in other components  
✅ **Cleaner component code** - No complex useEffect dependencies  
✅ **Better performance** - Memoized values in formatting hook  

### File Structure After Phase 2

```
Timer/
├── README.md
├── constants.js
├── hooks/
│   ├── index.js                       # Barrel export
│   ├── useSimulationTimer.js          # Simulation logic (70 lines)
│   ├── useRenderTimer.js              # Render logic (85 lines)
│   ├── useTimeline.js                 # Timeline management (90 lines)
│   └── useTimeFormatting.js           # Formatting state (65 lines)
├── utils/
│   ├── index.js
│   ├── timeConversions.js
│   ├── timeFormatters.js
│   ├── timelineConfig.js
│   └── __tests__/
│       └── timeConversions.test.js
└── (Timer.jsx in parent - now 229 lines)
```

### Usage Example

```javascript
// Before Phase 2 - Complex logic in component
const Timer = () => {
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        // Complex timer logic...
      }, 10);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, /* many dependencies */]);
  
  // More complex logic...
};

// After Phase 2 - Clean hook-based approach
const Timer = () => {
  const simulation = useSimulationTimer(timeStep);
  const render = useRenderTimer(simStep);
  const formatting = useTimeFormatting(simulation.elapsedTime, simulation.starttime);
  const timeline = useTimeline(render.setRenderTime);
  
  return (
    <div>
      {formatting.formattedCurrentTime}
      <button onClick={simulation.togglePlayPause}>
        {simulation.isRunning ? 'Pause' : 'Play'}
      </button>
    </div>
  );
};
```

## Phase 3 Completion ✅

Phase 3 focused on extracting UI components to create a clean, composable architecture.

### What Was Done

#### 1. Created 9 Reusable Components

**`components/TimeDisplay.jsx`** (45 lines)
- Displays current time and elapsed time
- Integrated time unit selector (H/M/S buttons)
- Uses FancyTimeDisplay internally

**`components/TimeControls.jsx`** (30 lines)
- Play/Pause and Reset buttons
- Simple, focused component for simulation control

**`components/RenderControls.jsx`** (25 lines)
- Render play/pause button
- Conditionally rendered when decoupled
- Clean null return when not needed

**`components/CouplingControl.jsx`** (22 lines)
- Toggle button for coupling/decoupling
- Shows appropriate icon based on state

**`components/TimeStepControls.jsx`** (45 lines)
- Input controls for sim and render steps
- Conditional render step control when decoupled
- Consistent styling and validation

**`components/StartTimeControl.jsx`** (20 lines)
- Start time display with FancyTimeDisplay
- Button to open date picker modal

**`components/DatePickerModal.jsx`** (30 lines)
- Modal popup with Datetime picker
- Three action buttons: Set, Set Now, Cancel
- Conditional rendering based on isOpen prop

**`components/TimelinePanel.jsx`** (25 lines)
- Timeline container with ref
- Zoom to Fit button integrated
- Clean Material-UI button styling

**`components/FancyTimeDisplay.jsx`** (existing, 25 lines)
- Fancy time display with calendar and clock icons
- Reused in TimeDisplay and StartTimeControl

#### 2. Refactored Timer.jsx to Orchestrator Pattern

The main Timer component is now a clean orchestrator:
- **No complex JSX** - delegates to child components
- **Props-based communication** - clean component API
- **Single responsibility** - just coordinates child components
- **Reduced from 229 → 164 lines** (28% reduction!)

#### 3. Component Composition Pattern

Components follow clean composition:
```jsx
<Timer>
  <TimeController>
    <TimeDisplay />
    <ControlButtonsContainer>
      <TimeControls />
      <RenderControls />
      <CouplingControl />
      <TimeStepControls />
    </ControlButtonsContainer>
    <StartTimeControl />
  </TimeController>
  <TimelinePanel />
  <DatePickerModal />
</Timer>
```

### File Structure After Phase 3

```
Timer/
├── README.md
├── constants.js
├── components/
│   ├── index.js                       # Barrel export
│   ├── FancyTimeDisplay.jsx           # (25 lines)
│   ├── TimeDisplay.jsx                # (45 lines) ✨ New
│   ├── TimeControls.jsx               # (30 lines) ✨ New
│   ├── RenderControls.jsx             # (25 lines) ✨ New
│   ├── CouplingControl.jsx            # (22 lines) ✨ New
│   ├── TimeStepControls.jsx           # (45 lines) ✨ New
│   ├── StartTimeControl.jsx           # (20 lines) ✨ New
│   ├── DatePickerModal.jsx            # (30 lines) ✨ New
│   └── TimelinePanel.jsx              # (25 lines) ✨ New
├── hooks/
│   ├── index.js
│   ├── useSimulationTimer.js
│   ├── useRenderTimer.js
│   ├── useTimeline.js
│   └── useTimeFormatting.js
├── utils/
│   ├── index.js
│   ├── timeConversions.js
│   ├── timeFormatters.js
│   └── timelineConfig.js
└── (Timer.jsx in parent - now 164 lines)
```

### Benefits Achieved

✅ **Component reusability** - Each component can be used independently  
✅ **Improved testability** - Components can be unit tested in isolation  
✅ **Better maintainability** - Each component has single, clear purpose  
✅ **Easier debugging** - Issues isolated to specific components  
✅ **Clean props API** - Clear component interfaces  
✅ **Composition flexibility** - Easy to rearrange or extend UI  
✅ **Reduced coupling** - Components don't know about each other  
✅ **Performance optimization ready** - Can React.memo individual components  

### Impact Metrics

**Total Refactor Results (Phase 1-3)**:
- **Original Timer.jsx**: 461 lines
- **Final Timer.jsx**: 164 lines  
- **Reduction**: 297 lines (64% smaller!)
- **Extracted to**: 9 components + 4 hooks + 4 utils + 1 constants file
- **Total organized code**: ~900 lines in ~18 well-structured files

### Component Props API

**TimeDisplay**
```jsx
<TimeDisplay 
  currentTime={Date}
  elapsedTime={string}
  timeUnit={string}
  onUnitChange={function}
  timeUnitConfig={array}
/>
```

**TimeControls**
```jsx
<TimeControls 
  isRunning={boolean}
  onPlayPause={function}
  onReset={function}
/>
```

**RenderControls**
```jsx
<RenderControls 
  renderRunning={boolean}
  coupled={boolean}
  onPlayPause={function}
/>
```

**CouplingControl**
```jsx
<CouplingControl 
  coupled={boolean}
  onToggle={function}
/>
```

**TimeStepControls**
```jsx
<TimeStepControls 
  simStep={number}
  renderStep={number}
  coupled={boolean}
  onSimStepChange={function}
  onRenderStepChange={function}
/>
```

**StartTimeControl**
```jsx
<StartTimeControl 
  startTime={Date|number}
  onOpenPicker={function}
/>
```

**DatePickerModal**
```jsx
<DatePickerModal 
  isOpen={boolean}
  selectedDate={Date}
  onDateChange={function}
  onConfirm={function}
  onSetNow={function}
  onCancel={function}
/>
```

**TimelinePanel**
```jsx
<TimelinePanel 
  timelineRef={ref}
  onZoomToFit={function}
/>
```

### Testing Strategy

Components can now be tested independently:

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeControls } from '../TimeControls';

test('calls onPlayPause when play button clicked', () => {
  const mockPlayPause = jest.fn();
  render(<TimeControls isRunning={false} onPlayPause={mockPlayPause} onReset={jest.fn()} />);
  
  fireEvent.click(screen.getByRole('button', { name: /play/i }));
  expect(mockPlayPause).toHaveBeenCalledTimes(1);
});
```

### Comparison: Before vs After Phase 3

**Before Phase 3 (229 lines):**
```jsx
const Timer = () => {
  // ... hooks and state ...
  
  return (
    <div className="exptimer-container">
      <div className="time-controller">
        <div className="controller-content">
          <FancyTimeDisplay time={formatting.currentTime} />
          <div className="time-display">
            {/* 30 lines of inline JSX */}
          </div>
          <div className="control-buttons-container">
            {/* 100+ lines of inline JSX for all controls */}
          </div>
        </div>
        <div className='starttime-container'>
          {/* More inline JSX */}
        </div>
      </div>
      <div className="timeline-panel">
        {/* Timeline JSX */}
      </div>
      {showDatePicker && (
        <div className="datepicker-popup">
          {/* Date picker JSX */}
        </div>
      )}
    </div>
  );
};
```

**After Phase 3 (164 lines):**
```jsx
const Timer = () => {
  // ... hooks and state ...
  
  return (
    <div className="exptimer-container">
      <div className="time-controller">
        <div className="controller-content">
          <TimeDisplay {...timeDisplayProps} />
          <div className="control-buttons-container">
            <TimeControls {...timeControlProps} />
            <RenderControls {...renderControlProps} />
            <CouplingControl {...couplingProps} />
            <TimeStepControls {...stepControlProps} />
          </div>
        </div>
        <StartTimeControl {...startTimeProps} />
      </div>
      <TimelinePanel {...timelineProps} />
      <DatePickerModal {...datePickerProps} />
    </div>
  );
};
```

### Architecture Principles Applied

1. **Single Responsibility**: Each component does one thing well
2. **Composition over Inheritance**: Components compose cleanly
3. **Props as Interface**: Clear, documented prop APIs
4. **Presentational Components**: Pure display logic, no business logic
5. **Container Pattern**: Timer.jsx orchestrates, components present
6. **Separation of Concerns**: UI separated from state and logic

### Next Steps (Optional Phase 4)

Potential future improvements:
- **CSS Modules**: Convert inline styles to scoped CSS modules
- **TypeScript**: Add type safety to component props
- **Storybook**: Create component documentation and playground
- **Accessibility**: Add ARIA labels and keyboard navigation
- **Performance**: React.memo on expensive components
- **Theme Support**: Extract colors and sizes to theme constants

## Summary

The Timer component refactoring is **complete and production-ready**! 

**Results**:
- ✅ 64% size reduction (461 → 164 lines)
- ✅ 18 well-organized modules
- ✅ Zero breaking changes
- ✅ Fully testable architecture
- ✅ Clean component composition
- ✅ Maintainable, scalable codebase

The component is now a model for React best practices in this codebase.

---

## Migration Notes

### Breaking Changes
None - this is a refactor maintaining the same API.

### For Developers

When working with time in Timer component:

1. **Use constants** instead of magic numbers:
   ```javascript
   // ❌ Bad
   setTimeStep(30);
   
   // ✅ Good
   setTimeStep(DEFAULT_TIME_STEP);
   ```

2. **Use utility functions** for conversions:
   ```javascript
   // ❌ Bad
   const mins = seconds / 60;
   
   // ✅ Good
   const mins = convertTimeUnit(seconds, TIME_UNITS.MINUTE);
   ```

3. **Use utility functions** for formatting:
   ```javascript
   // ❌ Bad
   const display = `${(time / 3600).toFixed(3)}h`;
   
   // ✅ Good
   const display = formatElapsedTime(time, TIME_UNITS.HOUR);
   ```

### Common Issues

**Import errors**: Make sure to import from the barrel export:
```javascript
import { formatElapsedTime } from './Timer/utils';
// Not: import { formatElapsedTime } from './Timer/utils/timeFormatters';
```

**Timeline not updating**: Ensure you're passing the dispatch function to timeline utilities:
```javascript
const items = createTimelineItems(particles, starttime, elapsed, render, 
  (newTime) => dispatch(updateRenderTime(newTime))
);
```
