import { Files, Search, MessageSquare, Settings, UserCircle, GitGraph, Blocks } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveView, toggleSidebar } from '../../store/fileSlice';
import SettingsOverlay from '../editor/SettingsOverlay';
import { useState } from 'react';

const ActivityBar = () => {
  const dispatch = useDispatch();
  const { activeView, isSidebarOpen } = useSelector((state) => state.files);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const icons = [
    { id: 'explorer', Icon: Files, label: 'Explorer' },
    { id: 'search', Icon: Search, label: 'Search' },
    { id: 'git', Icon: GitGraph, label: 'Source Control' },
    { id: 'extensions', Icon: Blocks, label: 'Extensions' },
  ];

  const bottomIcons = [
    { id: 'account', Icon: UserCircle, label: 'Accounts' },
    { id: 'settings', Icon: Settings, label: 'Settings' },
  ];

  const handleIconClick = (view) => {
    if (view === 'settings') {
      setIsSettingsOpen(!isSettingsOpen);
      return;
    }

    if (activeView === view && isSidebarOpen) {
      dispatch(toggleSidebar());
    } else {
      dispatch(setActiveView(view));
    }
  };

  const IconItem = ({ id, Icon, label }) => {
    const isActive = activeView === id && isSidebarOpen;
    return (
      <div
        onClick={() => id !== 'account' && handleIconClick(id)}
        style={{
          height: '48px',
          width: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: id === 'settings' || id === 'account' ? 'default' : 'pointer',
          position: 'relative',
          opacity: isActive ? 1 : 0.5,
          transition: 'all 0.2s',
          borderLeft: `2px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}`,
          backgroundColor: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent'
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.opacity = '1';
          if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.opacity = '0.5';
          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title={label}
      >
        <Icon 
          size={24} 
          strokeWidth={1.5} 
          color={isActive ? 'var(--text-primary)' : 'var(--text-secondary)'} 
          style={{ transition: 'color 0.2s' }}
        />
      </div>
    );
  };

  return (
    <div
      style={{
        width: '48px',
        backgroundColor: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        zIndex: 100,
        flexShrink: 0
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {icons.map((item) => (
          <IconItem key={item.id} {...item} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
        {bottomIcons.map((item) => (
          <IconItem key={item.id} {...item} />
        ))}
      </div>

      {isSettingsOpen && (
        <SettingsOverlay onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
};

export default ActivityBar;
