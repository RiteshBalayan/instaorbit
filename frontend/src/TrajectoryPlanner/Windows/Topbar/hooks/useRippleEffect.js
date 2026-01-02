import { useCallback } from 'react';

/**
 * Custom hook for creating ripple effect on button clicks
 * Provides visual feedback for user interactions
 */
export const useRippleEffect = () => {
  const handleRipple = useCallback((e) => {
    const button = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${e.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add('ripple');
    
    button.appendChild(circle);
    circle.addEventListener('animationend', () => circle.remove());
  }, []);

  return { handleRipple };
};
