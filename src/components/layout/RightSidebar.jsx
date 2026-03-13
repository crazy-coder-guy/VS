import React from 'react';
import ChatView from '../common/ChatView';

const RightSidebar = ({ width }) => {
  return (
    <div 
      style={{ 
        width: width || '300px', 
        backgroundColor: 'var(--side-bar-bg)', 
        borderLeft: '1px solid var(--border-color)', 
        display: 'flex', 
        flexDirection: 'column', 
        fontSize: 'var(--font-size-md)', 
        overflowX: 'hidden', 
        overflowY: 'auto' 
      }}
    >
      <ChatView />
    </div>
  );
};

export default RightSidebar;
