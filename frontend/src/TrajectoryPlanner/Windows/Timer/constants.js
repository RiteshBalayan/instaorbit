/**
 * Constants for Timer component
 * Default values, time units, and configuration constants
 */

/**
 * Time unit options
 */
export const TIME_UNITS = {
  SECOND: 's',
  MINUTE: 'm',
  HOUR: 'h',
};

/**
 * Time unit configurations with labels
 */
export const TIME_UNIT_CONFIG = [
  { value: TIME_UNITS.HOUR, label: 'hour', abbreviation: 'H' },
  { value: TIME_UNITS.MINUTE, label: 'minute', abbreviation: 'M' },
  { value: TIME_UNITS.SECOND, label: 'second', abbreviation: 'S' },
];

/**
 * Default time step values (reduced for smoother scrubbing)
 */
export const DEFAULT_TIME_STEP = 1; // seconds (was 30 - now much smoother!)
export const DEFAULT_SIM_STEP = 1; // seconds (was 30 - now much smoother!)
export const DEFAULT_TIME_UNIT = TIME_UNITS.SECOND;

/**
 * Timer interval settings
 */
export const TIMER_UPDATE_INTERVAL = 10; // milliseconds
export const MIN_TIME_STEP = 0.1; // Allow sub-second steps
export const MAX_TIME_STEP = 100; // Higher max for flexibility

/**
 * Timeline configuration
 */
export const TIMELINE_CONFIG = {
  MIN_HEIGHT: '200px',
  ZOOM_FRICTION: 20,
  ORIENTATION: 'top',
};

/**
 * Timeline group IDs
 */
export const TIMELINE_GROUPS = {
  SATELLITE: 1,
  EVENTS: 2,
};

/**
 * Timeline item IDs
 */
export const TIMELINE_ITEMS = {
  CURRENT_TIME: 'current-time',
  RENDER_TIME: 'Render-time',
};

/**
 * CSS class names
 */
export const CSS_CLASSES = {
  CURRENT_TIME_POINT: 'current-time-point',
  RENDER_TIME_POINT: 'render-time-point',
  EVENTS_GROUP: 'events-group',
  SATELLITE_GROUP: 'Satellite-group',
};

/**
 * Button labels
 */
export const BUTTON_LABELS = {
  PLAY_PAUSE: 'Play/Pause',
  PLAY_RENDER: 'Play Render',
  RESET: 'Reset',
  DECOUPLE: 'Decouple',
  ZOOM_TO_FIT: 'Zoom to Fit',
  CHANGE_START_TIME: 'Change Start Time',
  SET_START_TIME: 'Set Start Time',
  SET_TIME_TO_NOW: 'Set Time to Now',
  CANCEL: 'Cancel',
};

/**
 * Input labels
 */
export const INPUT_LABELS = {
  SECONDS_PER_STEP: 'Seconds/Step',
  SIM_STEPS: 'Sim Steps',
  RENDER_STEPS: 'Render Steps',
  ELAPSED_TIME: 'Elapsed time',
};

/**
 * Date picker configuration
 */
export const DATE_PICKER_CONFIG = {
  DATE_FORMAT: 'YYYY-MM-DD',
  TIME_FORMAT: 'HH:mm:ss',
  CLOSE_ON_SELECT: true,
  PLACEHOLDER: 'Select date and time',
};
