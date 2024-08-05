import React from 'react';
import '../../Styles/simulator/UtilityControl.css';
import { useSelector, useDispatch } from 'react-redux';
import { toggleGrid, toggleAxis, toggleVonAllenBelt, toggleHDEarth, toggleSun, toggleAmbientLight } from '../../Store/View';

const UtilityControl = () => {
  const view = useSelector((state) => state.view);
  const dispatch = useDispatch();

  const handleCheckboxChange = (name) => (e) => {
    const isChecked = e.target.checked;
    switch (name) {
      case 'Grid':
        dispatch(toggleGrid(isChecked));
        break;
      case 'Axis':
        dispatch(toggleAxis(isChecked));
        break;
      case 'VonAllenBelt':
        dispatch(toggleVonAllenBelt(isChecked));
        break;
      case 'HDEarth':
        dispatch(toggleHDEarth(isChecked));
        break;
      case 'Sun':
        dispatch(toggleSun(isChecked));
        break;
      case 'AmbientLight':
        dispatch(toggleAmbientLight(isChecked));
        break;
      default:
        break;
    }
  };

  return (
    <div className="panel-bottom">
      <p>Graphics Control</p>
      <div className="checkbox-container">
        <label>
          <input
            type="checkbox"
            checked={view.Grid}
            onChange={handleCheckboxChange('Grid')}
          />
          <span className="custom-checkbox"></span>
          Grid
        </label>
        <label>
          <input
            type="checkbox"
            checked={view.Axis}
            onChange={handleCheckboxChange('Axis')}
          />
          <span className="custom-checkbox"></span>
          Axis
        </label>
        <label>
          <input
            type="checkbox"
            checked={view.HDEarth}
            onChange={handleCheckboxChange('HDEarth')}
          />
          <span className="custom-checkbox"></span>
          HDEarth
        </label>
        <label>
          <input
            type="checkbox"
            checked={view.VonAllenBelt}
            onChange={handleCheckboxChange('VonAllenBelt')}
          />
          <span className="custom-checkbox"></span>
          Von Allen Belt
        </label>
        <label>
          <input
            type="checkbox"
            checked={view.Sun}
            onChange={handleCheckboxChange('Sun')}
          />
          <span className="custom-checkbox"></span>
          Sun
        </label>
        <label>
          <input
            type="checkbox"
            checked={view.AmbientLight}
            onChange={handleCheckboxChange('AmbientLight')}
          />
          <span className="custom-checkbox"></span>
          Ambient Light
        </label>
      </div>
    </div>
  );
};

export default UtilityControl;
