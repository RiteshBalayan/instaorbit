/**
 * FancyTimeDisplay component
 * Displays time in a fancy format with icons
 */

import React from 'react';
import { FaClock, FaRegCalendarCheck } from 'react-icons/fa';
import { getFancyTimeParts } from '../utils/timeFormatters';

/**
 * Fancy time display component with icons
 * @param {Date|number} time - Date object or timestamp
 * @returns {JSX.Element} Formatted time display
 */
export const FancyTimeDisplay = ({ time }) => {
  const { day, month, year, hour, minute, second } = getFancyTimeParts(time);

  return (
    <div style={{ display: 'flex', alignItems: 'center', color: 'white', justifyContent: 'center' }}>
      <FaRegCalendarCheck style={{ fontSize: '16px', marginRight: '8px' }} />
      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{`${day} ${month} ${year}`}</span>
      <FaClock style={{ fontSize: '16px', margin: '0 8px' }} />
      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{`${hour}:${minute}:${second}`}</span>
    </div>
  );
};
