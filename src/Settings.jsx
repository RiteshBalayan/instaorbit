import React, { useState } from 'react';

const Settings = ({ onSettingsChange }) => {
  const [radius, setRadius] = useState(2.05);
  const [theta, setTheta] = useState(0.9);

  const handleApply = () => {
    onSettingsChange({ radius: parseFloat(radius), theta: parseFloat(theta) });
  };

  const handleReset = () => {
    setRadius(2.05);
    setTheta(0.9);
    onSettingsChange({ radius: 2.05, theta: 0.9 });
  };

  return (
    <div>
      <div>
        <label>
          Radius:
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            step="0.01"
          />
        </label>
      </div>
      <div>
        <label>
          Theta:
          <input
            type="number"
            value={theta}
            onChange={(e) => setTheta(e.target.value)}
            step="0.01"
          />
        </label>
      </div>
      <button onClick={handleApply}>Apply</button>
      <button onClick={handleReset}>Reset</button>
    </div>
  );
};

export default Settings;
