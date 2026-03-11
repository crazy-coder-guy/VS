import React, { useEffect, useRef } from 'react';

const ContextMenu = ({ x, y, items, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    // Use mousedown to react before other click events
    document.addEventListener('mousedown', handleClickOutside);
    // Also close on escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position if it goes off-screen
  let adjustedX = x;
  let adjustedY = y;
  
  // Basic bounds checking (assuming standard menu sizes, could be improved with layout effects)
  if (x > window.innerWidth - 200) adjustedX -= 200;
  if (y > window.innerHeight - 300) adjustedY -= 300;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: adjustedY,
        left: adjustedX,
        zIndex: 9999,
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        padding: '4px 0',
        minWidth: '220px',
        color: 'var(--text-primary)',
        fontSize: '13px',
      }}
      onContextMenu={(e) => {
        e.preventDefault(); // Prevent native menu from popping up over our menu
        e.stopPropagation();
      }}
    >
      {items.map((item, index) => {
        if (item.type === 'separator') {
          return (
            <div 
              key={`sep-${index}`} 
              style={{ 
                height: '1px', 
                backgroundColor: 'var(--border-color)', 
                margin: '4px 0',
                opacity: 0.5
              }} 
            />
          );
        }

        const Icon = item.icon;

        return (
          <div
            key={`item-${index}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!item.disabled && item.onClick) {
                item.onClick();
                onClose();
              }
            }}
            style={{
              padding: '6px 16px',
              display: 'flex',
              alignItems: 'center',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              opacity: item.disabled ? 0.5 : 1,
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
            }}
            onMouseLeave={(e) => {
              if (!item.disabled) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {Icon && <Icon size={14} style={{ marginRight: '10px', opacity: 0.8 }} />}
            <span>{item.label}</span>
            {item.shortcut && (
               <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '11px' }}>{item.shortcut}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ContextMenu;
