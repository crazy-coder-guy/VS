import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { X, Search } from 'lucide-react';

const SettingsOverlay = ({ onClose }) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('Appearance');

  const tabs = [
    'Commonly Used',
    'Editor',
    'Appearance',
    'Terminal',
    'Extensions'
  ];

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '800px',
          height: '600px',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div style={{
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 15px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--side-bar-bg)',
          color: 'var(--text-primary)',
          fontWeight: '500'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Settings</span>
          </div>
          <X 
            size={18} 
            style={{ cursor: 'pointer', opacity: 0.7 }} 
            onClick={onClose}
            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
          />
        </div>

        {/* Content Area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{
            width: '200px',
            backgroundColor: 'var(--side-bar-bg)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            padding: '10px 0',
            overflowY: 'auto'
          }}>
            {tabs.map(tab => (
              <div
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 20px',
                  cursor: 'pointer',
                  backgroundColor: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === tab ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '13px',
                }}
              >
                {tab}
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--editor-bg)' }}>
            
            {/* Search Bar */}
            <div style={{ padding: '20px 20px 10px 20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '4px 10px',
              }}>
                <Search size={16} style={{ color: 'var(--text-secondary)', marginRight: '8px' }} />
                <input 
                  type="text" 
                  placeholder="Search settings" 
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    width: '100%',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            {/* Config Options */}
            <div style={{ flex: 1, padding: '10px 20px 20px 20px', overflowY: 'auto', color: 'var(--text-primary)' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '20px', fontWeight: '500' }}>{activeTab}</h2>

              {activeTab === 'Appearance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '14px', fontWeight: '500' }}>Color Theme</label>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Specifies the color theme used in the workbench.
                    </span>
                    <select 
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '3px',
                        width: '300px',
                        fontSize: '13px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="dark">Dark Modern</option>
                      <option value="light">Light Modern</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab !== 'Appearance' && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  No settings available in this category yet.
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsOverlay;
