/**
 * Real-ish API Service using Open VSX
 */

export const fetchExtensionCatalog = async (query = '') => {
  try {
    const url = query 
      ? `https://open-vsx.org/api/-/search?q=${encodeURIComponent(query)}&size=20`
      : `https://open-vsx.org/api/-/search?q=theme&size=20`; // Default to themes if no query

    const response = await fetch(url);
    const data = await response.json();
    
    // Map Open VSX format to our internal format
    return data.extensions.map(ext => {
      // Open VSX search sometimes provides icons in the files object
      const iconUrl = ext.files?.icon || `https://open-vsx.org/api/${ext.namespace}/${ext.name}/latest/file/icon.png`;
      
      return {
        id: `${ext.namespace}.${ext.name}`,
        name: ext.displayName || ext.name,
        description: ext.description,
        author: ext.namespace,
        version: ext.version,
        iconUrl: iconUrl,
        icon: getIconForExtension(ext),
        color: getColorForExtension(ext)
      };
    });
  } catch (error) {
    console.error('Error fetching from Open VSX:', error);
    return [];
  }
};

export const downloadExtension = async (id) => {
    // In a real system, we'd fetch the .vsix and unpack it
    // For this prototype, we simulate the "download" process
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, id });
      }, 1500);
    });
};

export const fetchExtensionDetails = async (id) => {
  try {
    const [namespace, name] = id.split('.');
    const url = `https://open-vsx.org/api/${namespace}/${name}/latest`;
    const response = await fetch(url);
    const data = await response.json();
    
    // Attempt to fetch README if files.readme exists
    let readme = "No details available for this extension.";
    if (data.files?.readme) {
      try {
        const readmeRes = await fetch(data.files.readme);
        readme = await readmeRes.text();
      } catch (e) { console.error("Failed to fetch readme", e); }
    }

    return {
      id: id,
      name: data.displayName || data.name,
      description: data.description,
      author: data.namespace,
      version: data.version,
      iconUrl: data.files?.icon || `https://open-vsx.org/api/${namespace}/${name}/latest/file/icon.png`,
      readme: readme,
      downloadCount: data.downloadCount,
      lastUpdated: data.timestamp,
      homepage: data.homepage,
      repository: data.repository
    };
  } catch (error) {
    console.error('Error fetching extension details:', error);
    return null;
  }
};

// Helper to assign icons based on keywords
function getIconForExtension(ext) {
    const text = (ext.name + ext.description).toLowerCase();
    if (text.includes('theme')) return 'Palette';
    if (text.includes('format')) return 'CheckCheck';
    if (text.includes('git')) return 'GitBranch';
    if (text.includes('icon')) return 'Image';
    if (text.includes('lint')) return 'FileCode';
    if (text.includes('server')) return 'Zap';
    if (text.includes('view')) return 'Eye';
    return 'Shield';
}

function getColorForExtension(ext) {
    const icons = {
        'Palette': '#bd93f9',
        'CheckCheck': '#F7B93E',
        'GitBranch': '#f05032',
        'Image': '#24a0ed',
        'FileCode': '#4B32C3',
        'Zap': '#facc15',
        'Eye': '#000000',
        'Shield': '#3b82f6'
    };
    return icons[getIconForExtension(ext)];
}
