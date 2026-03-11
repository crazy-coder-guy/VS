import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchExtensionCatalog, downloadExtension, fetchExtensionDetails } from '../services/api';

export const fetchCatalog = createAsyncThunk(
  'extensions/fetchCatalog',
  async (query) => {
    const response = await fetchExtensionCatalog(query);
    return response;
  }
);

export const installExtensionAsync = createAsyncThunk(
    'extensions/installAsync',
    async (id) => {
        const response = await downloadExtension(id);
        return response.id;
    }
);

export const fetchDetails = createAsyncThunk(
  'extensions/fetchDetails',
  async (id) => {
    const response = await fetchExtensionDetails(id);
    return response;
  }
);

const loadInstalledExtensions = () => {
  const saved = localStorage.getItem('ide_installed_extensions');
  return saved ? JSON.parse(saved) : [];
};

const saveInstalledExtensions = (extensions) => {
  localStorage.setItem('ide_installed_extensions', JSON.stringify(extensions));
};

const initialState = {
  catalog: [],
  installedExtensions: loadInstalledExtensions(), // Array of { id, enabled: boolean }
  installingIds: [], // IDs currently being "downloaded"
  searchQuery: '',
  isLoading: false,
  selectedExtensionId: null,
  selectedExtensionDetails: null,
  isDetailsLoading: false,
  statusBarItems: [], // Items injected by extensions
  uiOverrides: {
    iconTheme: 'default',
    activeTheme: null
  }
};

const extensionSlice = createSlice({
  name: 'extensions',
  initialState,
  reducers: {
    installExtension: (state, action) => {
      const { id } = action.payload;
      if (!state.installedExtensions.find(ext => ext.id === id)) {
        state.installedExtensions.push({ id, enabled: true });
      }
    },
    uninstallExtension: (state, action) => {
      state.installedExtensions = state.installedExtensions.filter(ext => ext.id !== action.payload);
      saveInstalledExtensions(state.installedExtensions);
    },
    toggleExtension: (state, action) => {
      const ext = state.installedExtensions.find(ext => ext.id === action.payload);
      if (ext) {
        ext.enabled = !ext.enabled;
        saveInstalledExtensions(state.installedExtensions);
      }
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setSelectedExtensionId: (state, action) => {
      state.selectedExtensionId = action.payload;
      if (action.payload === null) {
        state.selectedExtensionDetails = null;
      }
    },
    addStatusBarItem: (state, action) => {
      const item = action.payload;
      // Replace if exists, else push
      const index = state.statusBarItems.findIndex(i => i.id === item.id);
      if (index !== -1) {
        state.statusBarItems[index] = item;
      } else {
        state.statusBarItems.push(item);
      }
    },
    removeStatusBarItem: (state, action) => {
      state.statusBarItems = state.statusBarItems.filter(i => i.id !== action.payload);
    },
    setUIOverride: (state, action) => {
      const { key, value } = action.payload;
      state.uiOverrides[key] = value;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCatalog.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCatalog.fulfilled, (state, action) => {
        state.isLoading = false;
        state.catalog = action.payload;
      })
      .addCase(installExtensionAsync.pending, (state, action) => {
        state.installingIds.push(action.meta.arg);
      })
      .addCase(installExtensionAsync.fulfilled, (state, action) => {
        state.installingIds = state.installingIds.filter(id => id !== action.payload);
        if (!state.installedExtensions.find(ext => ext.id === action.payload)) {
          state.installedExtensions.push({ id: action.payload, enabled: true });
          saveInstalledExtensions(state.installedExtensions);
        }
      })
      .addCase(fetchDetails.pending, (state) => {
        state.isDetailsLoading = true;
      })
      .addCase(fetchDetails.fulfilled, (state, action) => {
        state.isDetailsLoading = false;
        state.selectedExtensionDetails = action.payload;
      })
      .addCase(fetchDetails.rejected, (state) => {
        state.isDetailsLoading = false;
      });
  }
});

export const { 
  installExtension, 
  uninstallExtension, 
  toggleExtension, 
  setSearchQuery, 
  setSelectedExtensionId,
  addStatusBarItem,
  removeStatusBarItem,
  setUIOverride
} = extensionSlice.actions;
export default extensionSlice.reducer;
