import { useSelector, useDispatch } from 'react-redux';
import { GitBranch, AlertTriangle, XCircle, Bell, Zap, CheckCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { toggleAutoSave } from '../../store/fileSlice';

const IconMap = {
  Zap,
  CheckCheck,
};

const StatusBar = () => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { statusBarItems } = useSelector(state => state.extensions);
  const { openFiles, activeFileId, cursorPosition, problems, projectProblems, autoSave } = useSelector(state => state.files);
  
  const activeFile = openFiles.find(f => f.id === activeFileId);
  
  // Merge problem counts for status bar
  const openFilePaths = openFiles.map(f => f.id);
  const filteredProjectProblems = projectProblems.filter(p => !openFilePaths.includes(p.filePath));
  const combinedProblems = [...problems, ...filteredProjectProblems];

  const errors = combinedProblems.filter(p => p.severity === 8).length;
  const warnings = combinedProblems.filter(p => p.severity === 4).length;

  return (
    <div style={{
      height: '24px',
      backgroundColor: 'var(--status-bar-bg)',
      color: 'var(--status-bar-text)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      fontSize: 'var(--font-size-sm)',
      gap: '15px',
      zIndex: 100,
      borderTop: '1px solid var(--border-color)',
      userSelect: 'none',
      transition: 'background-color 0.3s'
    }}>
      {/* Left Side */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        height: '100%'
      }}>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            cursor: 'pointer',
            padding: '0 4px',
            height: '100%',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <GitBranch size={12} /> main*
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <XCircle size={12} style={{ color: errors > 0 ? '#f14c4c' : 'inherit' }} /> {errors}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} style={{ color: warnings > 0 ? '#cca700' : 'inherit' }} /> {warnings}
          </div>
        </div>
      </div>

      {/* Dynamic Extension Items */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {statusBarItems.map(item => {
          const Icon = IconMap[item.icon];
          return (
            <div 
              key={item.id}
              title={item.tooltip}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px', 
                cursor: 'pointer',
                color: item.color || 'inherit',
                padding: '0 4px',
                height: '100%'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {Icon && <Icon size={12} />}
              {item.text}
            </div>
          );
        })}
      </div>

      {/* Right Side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', height: '100%' }}>
        <div 
          style={{ 
            cursor: 'pointer',
            padding: '0 8px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
        </div>
        
        <div 
          style={{ 
            cursor: 'pointer',
            padding: '0 8px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            transition: 'background-color 0.2s',
            opacity: 0.8
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          Spaces: 2
        </div>

        <div 
          onClick={() => dispatch(toggleAutoSave())}
          style={{ 
            cursor: 'pointer',
            padding: '0 8px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            transition: 'background-color 0.2s',
            opacity: 0.8,
            backgroundColor: autoSave ? 'rgba(255,255,255,0.1)' : 'transparent'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = autoSave ? 'rgba(255,255,255,0.1)' : 'transparent'}
        >
          Auto Save: {autoSave ? 'On' : 'Off'}
        </div>

        <div 
          style={{ 
            cursor: 'pointer',
            padding: '0 8px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            transition: 'background-color 0.2s',
            opacity: 0.8
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          UTF-8
        </div>

        <div 
          style={{ 
            cursor: 'pointer',
            padding: '0 8px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {activeFile ? activeFile.language : (activeFileId ? 'Plain Text' : '--')}
        </div>

        <div 
          style={{ 
            cursor: 'pointer',
            padding: '0 8px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <CheckCheck size={12} style={{ marginRight: '4px' }} /> Prettier
        </div>

        <div 
          style={{ 
            cursor: 'pointer',
            padding: '0 8px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Bell size={14} />
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
