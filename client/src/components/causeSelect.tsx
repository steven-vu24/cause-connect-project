import React from 'react';
import { CAUSES } from '../utils/causes';

interface CauseSelectProps {
  selected: string[];
  onToggle: (cause: string) => void;
}

const CauseSelect: React.FC<CauseSelectProps> = ({ selected, onToggle }) => (
  <div className="interests-dropdown-container">
    <div className="selected-interests">
      {selected.map((cause) => (
        <span key={cause} className="selected-interest">
          {cause}
          <span className="remove-interest" onClick={() => onToggle(cause)}>
            ×
          </span>
        </span>
      ))}
    </div>
    <div className="interests-dropdown">
      <div className="dropdown-label">
        Add interests <span className="dropdown-arrow">▼</span>
      </div>
      <div className="dropdown-options">
        {CAUSES.filter((cause) => !selected.includes(cause)).map((cause) => (
          <div key={cause} className="dropdown-option" onClick={() => onToggle(cause)}>
            {cause}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default CauseSelect;
