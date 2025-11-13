class MainApp {
    constructor() {
        this.modules = new Map();
        this.isInitialized = false;
        this.appState = {
            currentProject: null,
            currentUser: null,
            settings: {},
            uiState: {}
        };
    }

    async init() {
        try {
            console.log('🚀 Initializing PyGame Editor...');
            
            // Initialize core modules in sequence
            await this.initializeCoreModules();
            await this.initializeUIModules();
            await this.initializeIntegration();
            
            this.isInitialized = true;
            this.emit('appReady');
            
            console.log('✅ PyGame Editor initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showErrorScreen(error);
        }
    }

    async initializeCoreModules() {
        // Initialize authentication
        this.authManager = new AuthManager();
        this.modules.set('auth', this.authManager);
        
        // Initialize file system
        this.fileSystem = new FileSystem();
        this.modules.set('filesystem', this.fileSystem);
        
        // Initialize project manager
        this.projectManager = new ProjectManager();
        this.modules.set('projects', this.projectManager);
        
        // Initialize AI collaboration engine
        this.aiEngine = new AICollaborationEngine();
        this.modules.set('ai', this.aiEngine);

        // Wait for core modules to be ready
        await Promise.all([
            this.authManager.init(),
            this.fileSystem.init(),
            this.projectManager.init(),
            this.aiEngine.init()
        ]);
    }

    async initializeUIModules() {
        // Initialize workspace manager
        this.workspaceManager = new WorkspaceManager();
        this.modules.set('workspace', this.workspaceManager);
        
        // Initialize editor manager
        this.editorManager = new EditorManager();
        this.modules.set('editor', this.editorManager);
        
        // Initialize preview manager
        this.previewManager = new PreviewManager();
        this.modules.set('preview', this.previewManager);
        
        // Initialize terminal manager
        this.terminalManager = new TerminalManager();
        this.modules.set('terminal', this.terminalManager);

        // Wait for UI modules to be ready
        await Promise.all([
            this.workspaceManager.init(),
            this.editorManager.init(),
            this.previewManager.init(),
            this.terminalManager.init()
        ]);
    }

    async initializeIntegration() {
        this.setupModuleCommunication();
        this.setupGlobalEventHandlers();
        this.setupErrorHandling();
        this.setupPerformanceMonitoring();
        this.loadUserPreferences();
    }

    setupModuleCommunication() {
        // Create event bus for inter-module communication
        this.eventBus = new EventBus();
        
        // Register module event handlers
        this.modules.forEach((module, name) => {
            if (typeof module.on === 'function') {
                // Forward module events to global event bus
                module.on('*', (event, data) => {
                    this.eventBus.emit(`${name}:${event}`, data);
                });
            }
        });

        // Setup cross-module event handlers
        this.setupCrossModuleHandlers();
    }

    setupCrossModuleHandlers() {
        // When user logs in, load their projects
        this.eventBus.on('auth:userLoggedIn', (data) => {
            this.appState.currentUser = data.user;
            this.projectManager.loadUserProjects(data.user.id);
            this.updateUIForUser(data.user);
        });

        // When project is loaded, update editors
        this.eventBus.on('projects:projectLoaded', (data) => {
            this.appState.currentProject = data.project;
            this.loadProjectIntoEditors(data.project);
            this.updateUIForProject(data.project);
        });

        // When file is saved, update preview
        this.eventBus.on('editor:fileSaved', (data) => {
            this.previewManager.updatePreview(data.filePath, data.content);
        });

        // When code is run, execute in preview
        this.eventBus.on('workspace:runCode', (data) => {
            this.executeCurrentCode();
        });

        // AI task results
        this.eventBus.on('ai:taskCompleted', (data) => {
            this.handleAITaskResult(data.task);
        });
    }

    setupGlobalEventHandlers() {
        // Handle keyboard shortcuts
        document.addEventListener('keydown', this.handleGlobalKeybindings.bind(this));
        
        // Handle window events
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('online', this.handleOnlineStatus.bind(this));
        window.addEventListener('offline', this.handleOfflineStatus.bind(this));
        
        // Handle app visibility
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    handleGlobalKeybindings(event) {
        const { ctrlKey, metaKey, key, shiftKey } = event;
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdKey = isMac ? metaKey : ctrlKey;

        if (cmdKey) {
            switch (key) {
                case 's':
                    event.preventDefault();
                    this.saveCurrentFile();
                    break;
                case 'r':
                    if (shiftKey) {
                        event.preventDefault();
                        this.restartPreview();
                    }
                    break;
                case 'p':
                    event.preventDefault();
                    this.togglePreview();
                    break;
                case 'k':
                    if (shiftKey) {
                        event.preventDefault();
                        this.focusCommandPalette();
                    }
                    break;
                case '`':
                    event.preventDefault();
                    this.toggleTerminal();
                    break;
                case ',':
                    event.preventDefault();
                    this.openSettings();
                    break;
            }
        }

        // F-key bindings
        if (!cmdKey && !shiftKey && !altKey) {
            switch (key) {
                case 'F5':
                    event.preventDefault();
                    this.runCurrentCode();
                    break;
                case 'F11':
                    event.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'F12':
                    event.preventDefault();
                    this.openDevTools();
                    break;
            }
        }
    }

    async executeCurrentCode() {
        const currentFile = this.workspaceManager.getActiveFile();
        if (!currentFile) return;

        const code = this.editorManager.getFileContent(currentFile);
        
        try {
            this.setAppStatus('Running code...', 'info');
            
            await this.previewManager.executePython(code);
            
            this.setAppStatus('Code executed successfully', 'success');
            
        } catch (error) {
            this.setAppStatus('Execution failed', 'error');
            this.showErrorNotification('Execution Error', error.message);
        }
    }

    async saveCurrentFile() {
        const currentFile = this.workspaceManager.getActiveFile();
        if (currentFile) {
            await this.editorManager.saveFile(currentFile);
            this.showSuccessNotification('File saved successfully');
        }
    }

    togglePreview() {
        this.workspaceManager.togglePanel('preview');
    }

    toggleTerminal() {
        this.workspaceManager.togglePanel('terminal');
    }

    focusCommandPalette() {
        // Implement command palette
        this.showCommandPalette();
    }

    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error);
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event.reason);
        });

        // Module error handling
        this.eventBus.on('*:error', (data) => {
            this.handleModuleError(data);
        });
    }

    handleGlobalError(error) {
        console.error('Global error:', error);
        
        // Don't show error notification for minor errors
        if (error.message?.includes('ResizeObserver')) return;
        
        this.showErrorNotification(
            'Application Error',
            error.message || 'An unexpected error occurred'
        );
    }

    handlePromiseRejection(reason) {
        console.error('Unhandled promise rejection:', reason);
        this.showErrorNotification(
            'Async Error',
            reason?.message || 'An asynchronous operation failed'
        );
    }

    handleModuleError(errorData) {
        const { module, error, context } = errorData;
        console.error(`Module ${module} error:`, error);
        
        this.showErrorNotification(
            `${module} Error`,
            error.message || 'Module operation failed'
        );
    }

    setupPerformanceMonitoring() {
        // Monitor app performance
        this.performanceMonitor = new PerformanceMonitor();
        this.performanceMonitor.start();
        
        // Report performance metrics
        this.performanceMonitor.on('metric', (metric) => {
            if (metric.value > metric.threshold) {
                console.warn('Performance warning:', metric);
            }
        });
    }

    loadUserPreferences() {
        try {
            const preferences = localStorage.getItem('user_preferences');
            if (preferences) {
                this.appState.settings = JSON.parse(preferences);
                this.applyUserPreferences();
            }
        } catch (error) {
            console.error('Failed to load user preferences:', error);
        }
    }

    applyUserPreferences() {
        const { settings } = this.appState;
        
        // Apply theme
        if (settings.theme) {
            this.workspaceManager.switchTheme(settings.theme);
        }
        
        // Apply font size
        if (settings.fontSize) {
            this.editorManager.setFontSize(settings.fontSize);
        }
        
        // Apply other preferences
        if (settings.autoSave !== undefined) {
            this.editorManager.setAutoSave(settings.autoSave);
        }
    }

    updateUIForUser(user) {
        // Update user interface elements
        document.getElementById('userName').textContent = user.username;
        document.getElementById('userAvatar').src = user.avatar;
        
        // Show/hide auth-related UI
        document.getElementById('authModal').style.display = 'none';
        document.getElementById('userMenu').style.display = 'block';
    }

    updateUIForProject(project) {
        // Update project-related UI
        document.getElementById('projectName').textContent = project.name;
        document.title = `${project.name} - PyGame Editor`;
        
        // Update file tree
        this.updateFileTree(project.files);
    }

    updateFileTree(files) {
        const fileTree = document.getElementById('fileTree');
        fileTree.innerHTML = '';
        
        files.forEach((file, path) => {
            const fileElement = this.createFileElement(file);
            fileTree.appendChild(fileElement);
        });
    }

    createFileElement(file) {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.dataset.file = file.path;
        
        const icon = file.path.endsWith('/') ? '📁' : '📄';
        div.innerHTML = `
            <span class="file-icon">${icon}</span>
            <span class="file-name">${this.getFileName(file.path)}</span>
        `;
        
        div.addEventListener('click', () => {
            this.workspaceManager.openFileInEditor(file.path);
        });
        
        return div;
    }

    getFileName(path) {
        return path.split('/').pop();
    }

    setAppStatus(message, type = 'info') {
        const statusElement = document.getElementById('appStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-${type}`;
        }
    }

    showSuccessNotification(message, duration = 3000) {
        this.showNotification(message, 'success', duration);
    }

    showErrorNotification(title, message, duration = 5000) {
        this.showNotification(`${title}: ${message}`, 'error', duration);
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
        
        // Close button handler
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    showErrorScreen(error) {
        // Implement error screen display
        document.body.innerHTML = `
            <div class="error-screen">
                <div class="error-content">
                    <h1>😵 Application Error</h1>
                    <p>Failed to initialize PyGame Editor</p>
                    <pre class="error-details">${error.stack}</pre>
                    <button id="retryButton" class="btn-primary">Retry</button>
                    <button id="resetButton" class="btn-secondary">Reset App</button>
                </div>
            </div>
        `;
        
        document.getElementById('retryButton').addEventListener('click', () => {
            window.location.reload();
        });
        
        document.getElementById('resetButton').addEventListener('click', () => {
            localStorage.clear();
            window.location.reload();
        });
    }

    handleBeforeUnload(event) {
        if (this.editorManager.hasUnsavedChanges()) {
            event.preventDefault();
            event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return event.returnValue;
        }
    }

    handleOnlineStatus() {
        this.showSuccessNotification('Connection restored');
        this.syncPendingChanges();
    }

    handleOfflineStatus() {
        this.showErrorNotification('Connection lost', 'Working in offline mode');
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // App is hidden, save state
            this.autoSaveState();
        } else {
            // App is visible, refresh if needed
            this.refreshAppState();
        }
    }

    autoSaveState() {
        if (this.appState.currentProject) {
            this.projectManager.saveProject(this.appState.currentProject);
        }
    }

    refreshAppState() {
        // Check for updates or refresh data
        this.projectManager.loadProjects();
    }

    async syncPendingChanges() {
        // Sync any pending changes with backend
        if (this.appState.currentProject) {
            await this.projectManager.syncProject(this.appState.currentProject.id);
        }
    }
}

// Event Bus for module communication
class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        // Exact match listeners
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }

        // Wildcard listeners
        if (this.listeners.has('*')) {
            this.listeners.get('*').forEach(callback => {
                try {
                    callback(event, data);
                } catch (error) {
                    console.error(`Error in wildcard event listener:`, error);
                }
            });
        }
    }
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.listeners = new Set();
    }

    start() {
        this.monitorMemory();
        this.monitorCPU();
        this.monitorFrameRate();
    }

    monitorMemory() {
        if (performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                this.recordMetric('memory', {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit
                });
            }, 10000);
        }
    }

    monitorCPU() {
        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if (entry.duration > 50) {
                        this.recordMetric('long_task', {
                            duration: entry.duration,
                            name: entry.name
                        });
                    }
                });
            });
            observer.observe({ entryTypes: ['longtask'] });
        }
    }

    monitorFrameRate() {
        let frames = 0;
        let lastTime = performance.now();
        
        const checkFPS = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                this.recordMetric('fps', fps);
                frames = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(checkFPS);
        };
        
        checkFPS();
    }

    recordMetric(name, value) {
        this.metrics.set(name, {
            value,
            timestamp: Date.now()
        });

        this.emit('metric', { name, value });
    }

    on(event, callback) {
        this.listeners.add(callback);
    }

    emit(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
            console.error('Performance monitor error:', error);
            }
        });
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    window.app = new MainApp();
    await window.app.init();
});
