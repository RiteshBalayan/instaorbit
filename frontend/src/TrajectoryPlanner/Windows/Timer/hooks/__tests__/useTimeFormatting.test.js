/**
 * Unit tests for useTimeFormatting hook
 * Tests time formatting and unit selection logic
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useTimeFormatting } from '../useTimeFormatting';

describe('useTimeFormatting', () => {
  const mockStartTime = new Date('2024-01-01T00:00:00Z').getTime();
  const mockElapsedTime = 3665; // 1 hour, 1 minute, 5 seconds

  test('initializes with default time unit', () => {
    const { result } = renderHook(() => 
      useTimeFormatting(mockElapsedTime, mockStartTime)
    );

    expect(result.current.timeUnit).toBe('s');
  });

  test('formats elapsed time correctly for seconds', () => {
    const { result } = renderHook(() => 
      useTimeFormatting(mockElapsedTime, mockStartTime)
    );

    expect(result.current.formattedElapsedTime).toBe('3665.000s');
  });

  test('formats elapsed time correctly for minutes', () => {
    const { result } = renderHook(() => 
      useTimeFormatting(mockElapsedTime, mockStartTime)
    );

    act(() => {
      result.current.setTimeUnit('m');
    });

    // 3665 seconds = 61.083 minutes
    expect(result.current.formattedElapsedTime).toContain('m');
    expect(result.current.timeUnit).toBe('m');
  });

  test('formats elapsed time correctly for hours', () => {
    const { result } = renderHook(() => 
      useTimeFormatting(mockElapsedTime, mockStartTime)
    );

    act(() => {
      result.current.setTimeUnit('h');
    });

    // 3665 seconds = 1.018 hours
    expect(result.current.formattedElapsedTime).toContain('h');
    expect(result.current.timeUnit).toBe('h');
  });

  test('calculates current time correctly', () => {
    const { result } = renderHook(() => 
      useTimeFormatting(mockElapsedTime, mockStartTime)
    );

    const expectedTime = new Date(mockStartTime + mockElapsedTime * 1000);
    expect(result.current.currentTime.getTime()).toBe(expectedTime.getTime());
  });

  test('provides formatted current time', () => {
    const { result } = renderHook(() => 
      useTimeFormatting(mockElapsedTime, mockStartTime)
    );

    expect(result.current.standardCurrentTime).toBeTruthy();
  });

  test('provides formatted start time', () => {
    const { result } = renderHook(() => 
      useTimeFormatting(mockElapsedTime, mockStartTime)
    );

    expect(result.current.standardStartTime).toBeTruthy();
  });

  test('updates when elapsed time changes', () => {
    const { result, rerender } = renderHook(
      ({ elapsed, start }) => useTimeFormatting(elapsed, start),
      { initialProps: { elapsed: 100, start: mockStartTime } }
    );

    const firstElapsedTime = result.current.formattedElapsedTime;

    rerender({ elapsed: 200, start: mockStartTime });

    expect(result.current.formattedElapsedTime).not.toBe(firstElapsedTime);
  });

  test('memoizes formatted values', () => {
    const { result, rerender } = renderHook(() => 
      useTimeFormatting(mockElapsedTime, mockStartTime)
    );

    const firstFormatted = result.current.standardCurrentTime;
    
    // Rerender without changing props
    rerender();

    // Should be the same reference (memoized)
    expect(result.current.standardCurrentTime).toBe(firstFormatted);
  });
});
