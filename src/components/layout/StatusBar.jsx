import { useSelector } from 'react-redux';
import { GitBranch, AlertTriangle, XCircle, Bell, Zap, CheckCheck } from 'lucide-react';

const IconMap = {
  Zap,
  CheckCheck,
  // Add more as needed
};

const StatusBar = () => {
  const { statusBarItems } = useSelector(state => state.extensions);

  return (
    <div style={{
      height: '24px',
      backgroundColor: 'var(--status-bar-bg)',
      color: 'var(--status-bar-text)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      fontSize: '12px',
      gap: '15px',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
        <GitBranch size={12} /> main*
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <XCircle size={12} /> 0
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <AlertTriangle size={12} /> 0
        </div>
      </div>

      {/* Dynamic Extension Items */}
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
              color: item.color || 'inherit'
            }}
          >
            {Icon && <Icon size={12} />}
            {item.text}
          </div>
        );
      })}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ cursor: 'pointer' }}>Ln 11, Col 43</div>
        <div style={{ cursor: 'pointer' }}>Spaces: 2</div>
        <div style={{ cursor: 'pointer' }}>UTF-8</div>
        <div style={{ cursor: 'pointer' }}>JavaScript React</div>
        <Bell size={12} style={{ cursor: 'pointer' }} />
      </div>
    </div>
  );
};

export default StatusBar;
