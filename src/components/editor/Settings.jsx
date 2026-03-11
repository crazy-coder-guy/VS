import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const Settings = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div style={{
      padding: '20px',
      color: 'var(--text-primary)',
      backgroundColor: 'var(--editor-bg)',
      height: '100%',
      overflowY: 'auto'
    }}>
      <h2 style={{ marginBottom: '20px', fontWeight: '500' }}>Settings</h2>
      
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--text-secondary)' }}>Appearance</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label htmlFor="theme-select" style={{ fontSize: '13px' }}>Color Theme</label>
          <select 
            id="theme-select"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '3px',
              width: '200px',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="dark">Dark Modern</option>
            <option value="light">Light Modern</option>
          </select>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Specifies the color theme used in the workbench.
          </span>
        </div>
      </div>

    </div>
  );
};

export default Settings;
