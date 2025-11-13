class WorkspaceManager {
    constructor() {
        this.layout = null;
        this.panels = new Map();
        this.activePanel = 'editor';
        this.dockPositions = new Map();
        this.init();
    }

    async init() {
        await this.loadWorkspaceLayout();
        this.setupDragAndDrop();
        this.setupPanelManagement();
        this.setupLayoutPersistence();
    }

    setupDragAndDrop() {
        // Setup panel dragging and resizing
        this.setupPanelResizing();
        this.setupTabDragging();
        this.setupFileTreeDragging();
    }

    setupPanelResizing() {
        const resizablePanels = ['editor', 'preview', 'file-explorer'];
        
        resizablePanels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle';
            resizeHandle.addEventListener('mousedown', this.initResize.bind(this, panelId));
            panel.appendChild(resizeHandle);
        });
    }

    initResize(panelId, e) {
        e.preventDefault();
        const panel = document.getElementById(panelId);
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = parseInt(document.defaultView.getComputedStyle(panel).width, 10);
        const startHeight = parseInt(document.defaultView.getComputedStyle(panel).height, 10);

        const doResize = (e) => {
            if (panelId === 'editor' || panelId === 'preview') {
                const width = startWidth + (e.clientX - startX);
                panel.style.width = width + 'px';
            } else {
                const height = startHeight + (e.clientY - startY);
                panel.style.height = height + 'px';
            }
            this.emit('panelResized', { panelId, dimensions: this.getPanelDimensions(panel) });
        };

        const stopResize = () => {
            document.documentElement.removeEventListener('mousemove', doResize, false);
            document.documentElement.removeEventListener('mouseup', stopResize, false);
            this.saveWorkspaceLayout();
        };

        document.documentElement.addEventListener('mousemove', doResize, false);
        document.documentElement.addEventListener('mouseup', stopResize, false);
    }

    setupTabDragging() {
        let draggedTab = null;

        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('editor-tab')) {
                draggedTab = e.target;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.outerHTML);
                e.target.classList.add('dragging');
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!draggedTab) return;

            const afterElement = this.getDragAfterElement(e.clientX);
            const tabsContainer = document.querySelector('.editor-tabs');
            
            if (afterElement == null) {
                tabsContainer.appendChild(draggedTab);
            } else {
                tabsContainer.insertBefore(draggedTab, afterElement);
            }
        });

        document.addEventListener('dragend', (e) => {
            if (draggedTab) {
                draggedTab.classList.remove('dragging');
                draggedTab = null;
                this.saveWorkspaceLayout();
            }
        });
    }

    getDragAfterElement(x) {
        const tabs = Array.from(document.querySelectorAll('.editor-tab:not(.dragging)'));
        
        return tabs.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    setupFileTreeDragging() {
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('file-item')) {
                const filePath = e.target.dataset.file;
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'file',
                    path: filePath,
                    source: 'file-tree'
                }));
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            
            if (data.type === 'file' && e.target.classList.contains('editor-tabs')) {
                this.openFileInEditor(data.path);
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
    }

    openFileInEditor(filePath) {
        const fileContent = this.getFileContent(filePath);
        this.createEditorTab(filePath, fileContent);
        this.emit('fileOpened', { filePath, content: fileContent });
    }

    createEditorTab(filePath, content) {
        const tabsContainer = document.querySelector('.editor-tabs');
        const tabId = `tab-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        const tab = document.createElement('div');
        tab.className = 'editor-tab active';
        tab.dataset.file = filePath;
        tab.id = tabId;
        tab.draggable = true;
        
        tab.innerHTML = `
            <span class="tab-filename">${this.getFileName(filePath)}</span>
            <span class="tab-close" data-file="${filePath}">×</span>
        `;

        // Add close handler
        tab.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeEditorTab(filePath);
        });

        // Add click handler
        tab.addEventListener('click', () => {
            this.activateEditorTab(filePath);
        });

        tabsContainer.appendChild(tab);
        
        // Create editor instance
        this.createEditorInstance(filePath, content);
        this.activateEditorTab(filePath);
    }

    createEditorInstance(filePath, content) {
        const editorContainer = document.createElement('div');
        editorContainer.className = 'editor-instance';
        editorContainer.id = `editor-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`;
        editorContainer.style.display = 'none';
        
        document.querySelector('.editor-container').appendChild(editorContainer);
        
        // Initialize Monaco editor
        const editor = monaco.editor.create(editorContainer, {
            value: content,
            language: this.getLanguageFromFile(filePath),
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily: "'Fira Code', monospace",
            lineNumbers: 'on',
            folding: true,
            foldingHighlight: true,
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
            guides: { 
                indentation: true,
                bracketPairs: true 
            }
        });

        // Store editor reference
        this.panels.set(filePath, {
            type: 'editor',
            instance: editor,
            container: editorContainer,
            isActive: false
        });

        // Setup editor events
        this.setupEditorEvents(editor, filePath);
    }

    setupEditorEvents(editor, filePath) {
        // Content change with debounce
        const debouncedChange = this.debounce(() => {
            const content = editor.getValue();
            this.emit('editorContentChanged', { filePath, content });
            this.updateTabModifiedState(filePath, true);
        }, 500);

        editor.onDidChangeModelContent(debouncedChange);

        // Cursor position change
        editor.onDidChangeCursorPosition((e) => {
            this.emit('cursorPositionChanged', {
                filePath,
                position: e.position,
                selection: editor.getSelection()
            });
        });

        // Selection change
        editor.onDidChangeCursorSelection((e) => {
            this.emit('selectionChanged', {
                filePath,
                selection: e.selection
            });
        });
    }

    activateEditorTab(filePath) {
        // Deactivate all tabs and editors
        document.querySelectorAll('.editor-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.editor-instance').forEach(editor => {
            editor.style.display = 'none';
        });

        // Activate target tab and editor
        const tab = document.querySelector(`[data-file="${filePath}"]`);
        const editor = document.getElementById(`editor-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`);
        
        if (tab && editor) {
            tab.classList.add('active');
            editor.style.display = 'block';
            
            const panel = this.panels.get(filePath);
            if (panel) {
                panel.isActive = true;
                panel.instance.layout();
            }
        }

        this.emit('editorTabActivated', { filePath });
    }

    closeEditorTab(filePath) {
        const tab = document.querySelector(`[data-file="${filePath}"]`);
        const editor = document.getElementById(`editor-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`);
        
        if (tab) tab.remove();
        if (editor) editor.remove();
        
        this.panels.delete(filePath);
        this.emit('editorTabClosed', { filePath });
    }

    updateTabModifiedState(filePath, isModified) {
        const tab = document.querySelector(`[data-file="${filePath}"]`);
        if (tab) {
            const filenameElement = tab.querySelector('.tab-filename');
            if (isModified) {
                filenameElement.textContent = this.getFileName(filePath) + ' •';
                tab.classList.add('modified');
            } else {
                filenameElement.textContent = this.getFileName(filePath);
                tab.classList.remove('modified');
            }
        }
    }

    getFileName(filePath) {
        return filePath.split('/').pop();
    }

    getLanguageFromFile(filePath) {
        const extension = filePath.split('.').pop();
        const languageMap = {
            'py': 'python',
            'js': 'javascript',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown'
        };
        return languageMap[extension] || 'plaintext';
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async loadWorkspaceLayout() {
        try {
            const savedLayout = localStorage.getItem('workspace_layout');
            if (savedLayout) {
                this.layout = JSON.parse(savedLayout);
                this.applySavedLayout();
            } else {
                this.setupDefaultLayout();
            }
        } catch (error) {
            console.error('Failed to load workspace layout:', error);
            this.setupDefaultLayout();
        }
    }

    setupDefaultLayout() {
        this.layout = {
            panels: {
                'file-explorer': { width: '280px', visible: true },
                'editor': { width: 'calc(100% - 280px - 45%)', visible: true },
                'preview': { width: '45%', visible: true },
                'console': { height: '200px', visible: false },
                'ai-assistant': { width: '300px', visible: false }
            },
            tabs: {
                order: ['main.py'],
                active: 'main.py'
            },
            theme: 'dark',
            zoom: 1.0
        };
    }

    applySavedLayout() {
        Object.entries(this.layout.panels).forEach(([panelId, config]) => {
            const panel = document.getElementById(panelId);
            if (panel && config.visible) {
                if (config.width) panel.style.width = config.width;
                if (config.height) panel.style.height = config.height;
            } else if (panel) {
                panel.style.display = 'none';
            }
        });

        // Restore tab order and active tab
        if (this.layout.tabs) {
            this.layout.tabs.order.forEach(filePath => {
                this.openFileInEditor(filePath);
            });
            if (this.layout.tabs.active) {
                this.activateEditorTab(this.layout.tabs.active);
            }
        }
    }

    saveWorkspaceLayout() {
        // Capture current layout state
        this.layout.panels = {};
        
        ['file-explorer', 'editor', 'preview', 'console', 'ai-assistant'].forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                this.layout.panels[panelId] = {
                    width: panel.style.width,
                    height: panel.style.height,
                    visible: panel.style.display !== 'none'
                };
            }
        });

        // Save tab state
        const tabs = Array.from(document.querySelectorAll('.editor-tab'));
        this.layout.tabs = {
            order: tabs.map(tab => tab.dataset.file),
            active: document.querySelector('.editor-tab.active')?.dataset.file
        };

        localStorage.setItem('workspace_layout', JSON.stringify(this.layout));
    }

    setupLayoutPersistence() {
        // Auto-save layout changes
        window.addEventListener('beforeunload', () => {
            this.saveWorkspaceLayout();
        });

        // Save on resize
        window.addEventListener('resize', this.debounce(() => {
            this.saveWorkspaceLayout();
        }, 1000));
    }

    togglePanel(panelId) {
        const panel = document.getElementById(panelId);
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
            this.saveWorkspaceLayout();
            this.emit('panelToggled', { panelId, visible: !isVisible });
        }
    }

    switchTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        this.layout.theme = themeName;
        this.saveWorkspaceLayout();
        this.emit('themeChanged', { theme: themeName });
    }

    setZoom(zoomLevel) {
        document.documentElement.style.zoom = zoomLevel;
        this.layout.zoom = zoomLevel;
        this.saveWorkspaceLayout();
        this.emit('zoomChanged', { zoom: zoomLevel });
    }
            }
