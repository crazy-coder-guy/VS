import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Shield, Download, Globe, Github, Calendar, CheckCircle2, X } from 'lucide-react';
import { setSelectedExtensionId, installExtensionAsync, uninstallExtension, toggleExtension } from '../../store/extensionSlice';
import extensionService from '../../services/extensionService';

const ExtensionDetailsView = () => {
  const dispatch = useDispatch();
  const { selectedExtensionDetails, isDetailsLoading, installedExtensions, installingIds } = useSelector(state => state.extensions);
  const [iconError, setIconError] = React.useState(false);

  if (isDetailsLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <div className="animate-spin" style={{ marginRight: '10px' }}>⌛</div> Loading Extension Details...
      </div>
    );
  }

  if (!selectedExtensionDetails) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        Select an extension to see details.
      </div>
    );
  }

  const ext = selectedExtensionDetails;
  const isInstalled = installedExtensions.some(i => i.id === ext.id);
  const status = installedExtensions.find(i => i.id === ext.id);
  const isEnabled = status?.enabled;
  const isInstalling = installingIds.includes(ext.id);

  const handleInstall = (e) => {
    e.stopPropagation();
    dispatch(installExtensionAsync(ext.id)).then(res => {
      if (res.payload) extensionService.activate(ext.id);
    });
  };

  const handleUninstall = (e) => {
    e.stopPropagation();
    dispatch(uninstallExtension(ext.id));
    extensionService.deactivate(ext.id);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    dispatch(toggleExtension(ext.id));
    if (isEnabled) {
      extensionService.deactivate(ext.id);
    } else {
      extensionService.activate(ext.id);
    }
  };

  return (
    <div style={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--editor-bg)', 
      overflowY: 'auto',
      zIndex: 10,
      display: 'block' // Use block for natural document scrolling
    }}>
      {/* Top Banner/Header */}
      <div style={{ 
        padding: '30px 40px', 
        display: 'flex', 
        gap: '24px', 
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--editor-bg)',
      }}>
        <div style={{
          width: '128px',
          height: '128px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: '1px solid var(--border-color)'
        }}>
          {ext.iconUrl && !iconError ? (
            <img 
              src={ext.iconUrl} 
              alt={ext.name} 
              style={{ width: '80px', height: '80px', objectFit: 'contain' }} 
              onError={() => setIconError(true)}
            />
          ) : (
            <Shield size={64} style={{ color: 'var(--accent-primary)' }} />
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '500', color: 'var(--text-primary)' }}>{ext.name}</h1>
            {isInstalled && <span style={{ backgroundColor: 'var(--accent-primary)', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', color: 'white' }}>Installed</span>}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '15px' }}>
            <span style={{ color: 'var(--accent-primary)', cursor: 'pointer' }}>{ext.author}</span>
            <span>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Download size={14} /> {ext.downloadCount?.toLocaleString() || 0}</span>
            <span>|</span>
            <span>v{ext.version}</span>
          </div>
          <p style={{ marginTop: '15px', fontSize: '16px', lineHeight: '1.5', maxWidth: '800px', color: 'var(--text-secondary)' }}>{ext.description}</p>
          
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            {isInstalling ? (
              <button disabled style={{ padding: '6px 20px', backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '2px', color: 'var(--text-secondary)' }}>Installing...</button>
            ) : !isInstalled ? (
              <button onClick={handleInstall} style={{ padding: '6px 20px', backgroundColor: 'var(--accent-primary)', border: 'none', borderRadius: '2px', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Install</button>
            ) : (
              <>
                <button onClick={handleToggle} style={{ padding: '6px 20px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '2px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  {isEnabled ? 'Disable' : 'Enable'}
                </button>
                <button onClick={handleUninstall} style={{ padding: '6px 20px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '2px', color: '#ff5a5a', cursor: 'pointer' }}>Uninstall</button>
              </>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => dispatch(setSelectedExtensionId(null))}
          style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '5px' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', minHeight: '400px' }}>
        {/* README Section */}
        <div style={{ flex: 1, padding: '40px', borderRight: '1px solid var(--border-color)' }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
            <div style={{ display: 'inline-block', paddingBottom: '10px', borderBottom: '2px solid var(--accent-primary)', fontWeight: '600', color: 'var(--text-primary)' }}>Details</div>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
            {ext.readme || "No README provided."}
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ width: '300px', padding: '40px 20px', backgroundColor: 'rgba(255,255,255,0.01)', flexShrink: 0 }}>
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '15px', color: 'var(--text-secondary)' }}>Categories</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '12px', backgroundColor: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-primary)' }}>Programming Languages</span>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '15px', color: 'var(--text-secondary)' }}>Resources</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              {ext.homepage && <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Globe size={14} /> <a href={ext.homepage} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Extension Marketplace</a></li>}
              {ext.repository && <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Github size={14} /> <a href={ext.repository} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Repository</a></li>}
            </ul>
          </div>

          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '15px', color: 'var(--text-secondary)' }}>More Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Published</span>
                <span style={{ color: 'var(--text-primary)' }}>{ext.lastUpdated ? new Date(ext.lastUpdated).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>Identifier</span>
                <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all', textAlign: 'right' }}>{ext.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtensionDetailsView;
