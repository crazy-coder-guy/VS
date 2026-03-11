import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Search, Download, Trash2, Shield, ShieldOff, MoreHorizontal, Loader2, Info,
  CheckCheck, FileCode, Zap, GitBranch, Eye, Image as ImageIcon, Palette
} from 'lucide-react';
import { uninstallExtension, toggleExtension, setSearchQuery, fetchCatalog, installExtensionAsync, fetchDetails, setSelectedExtensionId } from '../../store/extensionSlice';
import extensionService from '../../services/extensionService';

const IconMap = {
  CheckCheck,
  FileCode,
  Zap,
  GitBranch,
  Eye,
  Image: ImageIcon,
  Palette,
  Shield // Fallback
};

const ExtensionCard = ({ extension, isInstalled, status, isInstalling }) => {
  const dispatch = useDispatch();
  const isEnabled = status?.enabled;
  const [iconError, setIconError] = useState(false);
  
  const IconComponent = IconMap[extension.icon] || IconMap.Shield;

  const handleInstall = (e) => {
    e.stopPropagation();
    dispatch(installExtensionAsync(extension.id))
      .then((res) => {
        if (res.payload) extensionService.activate(extension.id);
      });
  };

  const handleUninstall = (e) => {
    e.stopPropagation();
    dispatch(uninstallExtension(extension.id));
    extensionService.deactivate(extension.id);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    dispatch(toggleExtension(extension.id));
    if (isEnabled) {
      extensionService.deactivate(extension.id);
    } else {
      extensionService.activate(extension.id);
    }
  };

  const handleOpenDetails = () => {
    dispatch(setSelectedExtensionId(extension.id));
    dispatch(fetchDetails(extension.id));
  };

  return (
    <div 
      onClick={handleOpenDetails}
      style={{
        padding: '8px 12px',
        display: 'flex',
        gap: '12px',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      opacity: (isInstalled && !isEnabled) ? 0.6 : 1,
      position: 'relative',
      overflow: 'hidden'
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div style={{
        width: '36px',
        height: '36px',
        background: (extension.iconUrl && !iconError) ? 'transparent' : `linear-gradient(135deg, ${extension.color || 'var(--accent-primary)'} 0%, rgba(255,255,255,0.1) 100%)`,
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: (extension.iconUrl && !iconError) ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {extension.iconUrl && !iconError ? (
          <img 
            src={extension.iconUrl} 
            alt={extension.name} 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={() => setIconError(true)}
          />
        ) : (
          <IconComponent size={20} style={{ color: extension.id === 'markdown-preview' ? '#ccc' : 'white' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {extension.name}
          </h4>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: '3px' }}>
            v{extension.version}
          </span>
        </div>
        <p style={{
          margin: '4px 0 8px 0',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: '1.5',
          opacity: 0.8
        }}>
          {extension.description}
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isInstalling ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--accent-primary)' }}>
              <Loader2 size={12} className="animate-spin" /> Installing...
            </div>
          ) : !isInstalled ? (
            <button
              onClick={handleInstall}
              style={{
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'transform 0.1s'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Install
            </button>
          ) : (
            <>
              <button
                onClick={handleToggle}
                title={isEnabled ? 'Disable' : 'Enable'}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {isEnabled ? <ShieldOff size={14} /> : <Shield size={14} />} 
                <span style={{ fontSize: '10px' }}>{isEnabled ? 'Disable' : 'Enable'}</span>
              </button>
              <button
                onClick={handleUninstall}
                title="Uninstall"
                style={{
                  backgroundColor: 'transparent',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: 'auto', fontStyle: 'italic', opacity: 0.6 }}>
            {extension.author}
          </span>
        </div>
      </div>
    </div>
  );
};

const ExtensionsView = () => {
  const dispatch = useDispatch();
  const { catalog, installedExtensions, installingIds, searchQuery, isLoading } = useSelector(state => state.extensions);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(fetchCatalog(searchQuery));
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [dispatch, searchQuery]);

  const filteredCatalog = catalog.filter(ext => 
    !installedExtensions.find(installed => installed.id === ext.id)
  );

  const installedList = catalog.filter(ext => 
    installedExtensions.find(installed => installed.id === ext.id)
  );

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: 'var(--side-bar-bg)',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ padding: '15px', background: 'rgba(255, 255, 255, 0.01)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.2)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '6px 10px',
          marginBottom: '5px',
          transition: 'border-color 0.2s'
        }}
        onFocusIn={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
        onFocusOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <Search size={16} style={{ color: 'var(--text-secondary)', marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Search Marketplace"
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              width: '100%'
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', className: 'custom-scrollbar' }}>
        {isLoading && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-primary)', opacity: 0.5, margin: '0 auto' }} />
            <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>Loading catalog...</p>
          </div>
        )}

        {!isLoading && installedList.length > 0 && (
          <div style={{ marginBottom: '4px' }}>
            <div style={{
              padding: '8px 16px',
              fontSize: '10px',
              fontWeight: 'bold',
              color: 'var(--text-secondary)',
              background: 'rgba(255, 255, 255, 0.02)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Installed</span>
              <span style={{ fontSize: '10px', opacity: 0.5 }}>{installedList.length}</span>
            </div>
            {installedList.map(ext => (
              <ExtensionCard 
                key={ext.id} 
                extension={ext} 
                isInstalled={true} 
                status={installedExtensions.find(i => i.id === ext.id)}
                isInstalling={installingIds.includes(ext.id)}
              />
            ))}
          </div>
        )}

        {!isLoading && (
          <div>
            <div style={{
              padding: '8px 16px',
              fontSize: '10px',
              fontWeight: 'bold',
              color: 'var(--text-secondary)',
              background: 'rgba(255, 255, 255, 0.02)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Recommended</span>
              <span style={{ fontSize: '10px', opacity: 0.5 }}>{filteredCatalog.length}</span>
            </div>
            {filteredCatalog.length > 0 ? (
              filteredCatalog.map(ext => (
                <ExtensionCard 
                    key={ext.id} 
                    extension={ext} 
                    isInstalled={false} 
                    isInstalling={installingIds.includes(ext.id)}
                />
              ))
            ) : !isLoading && searchQuery && (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <Info size={24} style={{ color: 'var(--text-secondary)', opacity: 0.3, marginBottom: '10px' }} />
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No extensions match your search.</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default ExtensionsView;
