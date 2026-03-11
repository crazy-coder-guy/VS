import { addStatusBarItem, removeStatusBarItem, setUIOverride } from '../store/extensionSlice';
import store from '../store';

/**
 * Real Extension Service
 * Handles activation and provides the Extension API
 */

class ExtensionService {
  constructor() {
    this.activeExtensions = new Map();
  }

  // Real internal API that extensions can use
  getApi(extensionId) {
    return {
      statusBar: {
        createStatusBarItem: (id, alignment, priority) => ({
          id: `${extensionId}.${id}`,
          text: '',
          icon: null,
          color: null,
          tooltip: '',
          command: null,
          show: function() {
            store.dispatch(addStatusBarItem({
              id: this.id,
              extensionId,
              text: this.text,
              icon: this.icon,
              alignment: alignment || 'left',
              priority: priority || 0,
              color: this.color,
              tooltip: this.tooltip,
              command: this.command
            }));
          },
          dispose: function() {
            store.dispatch(removeStatusBarItem(this.id));
          }
        })
      },
      workspace: {
        onDidSaveTextDocument: (callback) => {
          // Simple mock for now
          console.log(`Extension [${extensionId}]: Registered save listener`);
        }
      },
      ui: {
        showInformationMessage: (msg) => {
          console.log(`[Extension Message] ${extensionId}: ${msg}`);
          // In a real IDE this would be a toast notification
        }
      }
    };
  }

  async activate(extensionId) {
    if (this.activeExtensions.has(extensionId)) return;
    
    console.log(`📡 ACTIVATE: ${extensionId}`);
    
    const api = this.getApi(extensionId);
    const disposables = [];

    // --- Extension Specific Simulation Logic ---

    // 1. Live Server Simulation
    if (extensionId.includes('live-server')) {
      const liveItem = api.statusBar.createStatusBarItem('go-live', 'right', 100);
      liveItem.text = 'Go Live';
      liveItem.icon = 'Zap';
      liveItem.show();
      disposables.push(liveItem);
      console.log("🚀 Live Server: Added 'Go Live' button to status bar");
    }

    // 2. Real Prettier Integration
    if (extensionId.includes('prettier')) {
      const prettierItem = api.statusBar.createStatusBarItem('prettier', 'right', 90);
      prettierItem.text = 'Prettier';
      prettierItem.icon = 'CheckCheck';
      prettierItem.color = '#61dafb';
      prettierItem.show();
      disposables.push(prettierItem);
      
      try {
        // Register Real Formatter
        if (window.monaco) {
          const provider = window.monaco.languages.registerDocumentFormattingEditProvider('javascript', {
            async provideDocumentFormattingEdits(model, options, token) {
              try {
                const prettier = await import('https://unpkg.com/prettier@3.2.5/standalone.mjs');
                const prettierPluginBabel = await import('https://unpkg.com/prettier@3.2.5/plugins/babel.mjs');
                const prettierPluginEstree = await import('https://unpkg.com/prettier@3.2.5/plugins/estree.mjs');

                const text = model.getValue();
                const formatted = await prettier.default.format(text, {
                  parser: 'babel',
                  plugins: [prettierPluginBabel.default || prettierPluginBabel, prettierPluginEstree.default || prettierPluginEstree],
                  singleQuote: true,
                  tabWidth: options.tabSize,
                });

                return [{
                  range: model.getFullModelRange(),
                  text: formatted
                }];
              } catch (err) {
                console.error("Prettier formatting failed:", err);
                return [];
              }
            }
          });
          disposables.push(provider);
          console.log("✨ Prettier: Real Formatter active");
        } else {
          console.warn("Monaco not found on window, Prettier won't format.");
        }
      } catch (err) {
        console.error("Failed to setup Prettier:", err);
      }
    }

    // 3. Material Icon Theme Simulation
    if (extensionId.includes('material-icon-theme')) {
      store.dispatch(setUIOverride({ key: 'iconTheme', value: 'material' }));
      console.log("📁 Material Icon Theme: Icons updated");
      disposables.push({ dispose: () => store.dispatch(setUIOverride({ key: 'iconTheme', value: 'default' })) });
    }

    // 4. Pyrefly / Python simulation
    if (extensionId.includes('pyrefly') || extensionId.includes('python')) {
      const pythonItem = api.statusBar.createStatusBarItem('python-env', 'right', 110);
      pythonItem.text = 'Python 3.10.12';
      pythonItem.icon = 'CheckCheck';
      pythonItem.show();
      disposables.push(pythonItem);
      console.log("🐍 Python Environment: Detected and active");
    }

    this.activeExtensions.set(extensionId, { api, disposables, timestamp: Date.now() });
    return true;
  }

  deactivate(extensionId) {
    const active = this.activeExtensions.get(extensionId);
    if (!active) return;
    
    console.log(`🛑 DEACTIVATE: ${extensionId}`);
    
    // Dispose all resources created by the extension
    if (active.disposables) {
      active.disposables.forEach(d => d.dispose());
    }

    this.activeExtensions.delete(extensionId);
  }

  // Load all enabled extensions from local storage on startup
  async loadInstalled(installedList) {
    console.log("🛠️ Extension Engine: Booting installed extensions...");
    for (const ext of installedList) {
      if (ext.enabled) {
        await this.activate(ext.id);
      }
    }
  }
}

const extensionService = new ExtensionService();
export default extensionService;
