/**
 * DatePickerModal component
 * Modal popup for selecting start time
 */

import React from 'react';
import Datetime from 'react-datetime';
import moment from 'moment';
import 'react-datetime/css/react-datetime.css';

export const DatePickerModal = ({ 
  isOpen, 
  selectedDate, 
  onDateChange, 
  onConfirm, 
  onSetNow, 
  onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div className="datepicker-popup">
      <Datetime 
        value={selectedDate} 
        onChange={(date) => onDateChange(moment(date))}
        dateFormat="YYYY-MM-DD"
        timeFormat="HH:mm:ss"
        closeOnSelect={true}
        inputProps={{ placeholder: 'Select date and time' }}
      />
      <button onClick={onConfirm}>Set Start Time</button>
      <button onClick={onSetNow}>Set Time to Now</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
};
