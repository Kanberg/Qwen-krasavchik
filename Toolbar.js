// Компонент панели инструментов
class Toolbar {
    constructor(container) {
        this.container = container;
        this.buttons = new Map();
        this.dropdowns = new Map();
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="toolbar-group">
                        <button class="toolbar-btn" id="btn-new-file" title="New File (Ctrl+N)">
                            <span class="btn-icon">📄</span>
                            <span class="btn-text">New</span>
                        </button>
                        <button class="toolbar-btn" id="btn-save" title="Save (Ctrl+S)">
                            <span class="btn-icon">💾</span>
                            <span class="btn-text">Save</span>
                        </button>
                        <button class="toolbar-btn" id="btn-save-all" title="Save All (Ctrl+Shift+S)">
                            <span class="btn-icon">💾💾</span>
                        </button>
                    </div>

                    <div class="toolbar-group">
                        <button class="toolbar-btn" id="btn-undo" title="Undo (Ctrl+Z)">
                            <span class="btn-icon">↶</span>
                        </button>
                        <button class="toolbar-btn" id="btn-redo" title="Redo (Ctrl+Y)">
                            <span class="btn-icon">↷</span>
                        </button>
                    </div>

                    <div class="toolbar-group">
                        <button class="toolbar-btn" id="btn-run" title="Run Code (F5)">
                            <span class="btn-icon">▶️</span>
                            <span class="btn-text">Run</span>
                        </button>
                        <button class="toolbar-btn" id="btn-stop" title="Stop Execution (Shift+F5)">
                            <span class="btn-icon">⏹️</span>
                        </button>
                        <button class="toolbar-btn" id="btn-debug" title="Debug (F6)">
                            <span class="btn-icon">🐛</span>
                            <span class="btn-text">Debug</span>
                        </button>
                    </div>
                </div>

                <div class="toolbar-center">
                    <div class="toolbar-group">
                        <div class="dropdown" id="dropdown-project">
                            <button class="toolbar-btn dropdown-btn">
                                <span class="btn-icon">📁</span>
                                <span class="btn-text" id="current-project">No Project</span>
                                <span class="dropdown-arrow">▼</span>
                            </button>
                            <div class="dropdown-menu"></div>
                        </div>
                    </div>
                </div>

                <div class="toolbar-right">
                    <div class="toolbar-group">
                        <button class="toolbar-btn" id="btn-ai-assist" title="AI Assistant (Ctrl+K)">
                            <span class="btn-icon">🤖</span>
                            <span class="btn-text">AI Assist</span>
                        </button>
                    </div>

                    <div class="toolbar-group">
                        <div class="dropdown" id="dropdown-view">
                            <button class="toolbar-btn dropdown-btn">
                                <span class="btn-icon">👁️</span>
                                <span class="btn-text">View</span>
                                <span class="dropdown-arrow">▼</span>
                            </button>
                            <div class="dropdown-menu"></div>
                        </div>

                        <div class="dropdown" id="dropdown-theme">
                            <button class="toolbar-btn dropdown-btn">
                                <span class="btn-icon">🎨</span>
                                <span class="btn-text">Theme</span>
                                <span class="dropdown-arrow">▼</span>
                            </button>
                            <div class="dropdown-menu"></div>
                        </div>

                        <button class="toolbar-btn" id="btn-settings" title="Settings (Ctrl+,)">
                            <span class="btn-icon">⚙️</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.initializeButtons();
        this.initializeDropdowns();
    }

    initializeButtons() {
        const buttonIds = [
            'btn-new-file', 'btn-save', 'btn-save-all', 'btn-undo', 'btn-redo',
            'btn-run', 'btn-stop', 'btn-debug', 'btn-ai-assist', 'btn-settings'
        ];

        buttonIds.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                this.buttons.set(id, button);
            }
        });
    }

    initializeDropdowns() {
        const dropdowns = ['project', 'view', 'theme'];
        
        dropdowns.forEach(name => {
            const dropdown = document.getElementById(`dropdown-${name}`);
            if (dropdown) {
                this.dropdowns.set(name, dropdown);
                this.setupDropdown(dropdown, name);
            }
        });
    }

    setupDropdown(dropdownElement, type) {
        const button = dropdownElement.querySelector('.dropdown-btn');
        const menu = dropdownElement.querySelector('.dropdown-menu');

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown(menu);
        });

        // Заполняем меню в зависимости от типа
        this.populateDropdownMenu(menu, type);
    }

    populateDropdownMenu(menu, type) {
        switch (type) {
            case 'project':
                this.populateProjectDropdown(menu);
                break;
            case 'view':
                this.populateViewDropdown(menu);
                break;
            case 'theme':
                this.populateThemeDropdown(menu);
                break;
        }
    }

    populateProjectDropdown(menu) {
        menu.innerHTML = `
            <div class="dropdown-item" data-action="new-project">
                <span class="item-icon">🆕</span>
                New Project
            </div>
            <div class="dropdown-item" data-action="open-project">
                <span class="item-icon">📂</span>
                Open Project
            </div>
            <div class="dropdown-separator"></div>
            <div class="dropdown-item" data-action="project-settings">
                <span class="item-icon">⚙️</span>
                Project Settings
            </div>
            <div class="dropdown-item" data-action="export-project">
                <span class="item-icon">📤</span>
                Export Project
            </div>
        `;

        this.setupDropdownEvents(menu, 'project');
    }

    populateViewDropdown(menu) {
        menu.innerHTML = `
            <div class="dropdown-item" data-action="toggle-sidebar">
                <span class="item-icon">📁</span>
                Toggle Sidebar
            </div>
            <div class="dropdown-item" data-action="toggle-preview">
                <span class="item-icon">👁️</span>
                Toggle Preview
            </div>
            <div class="dropdown-item" data-action="toggle-terminal">
                <span class="item-icon">💻</span>
                Toggle Terminal
            </div>
            <div class="dropdown-separator"></div>
            <div class="dropdown-item" data-action="zoom-in">
                <span class="item-icon">🔍</span>
                Zoom In
            </div>
            <div class="dropdown-item" data-action="zoom-out">
                <span class="item-icon">🔍</span>
                Zoom Out
            </div>
            <div class="dropdown-item" data-action="reset-zoom">
                <span class="item-icon">🔍</span>
                Reset Zoom
            </div>
        `;

        this.setupDropdownEvents(menu, 'view');
    }

    populateThemeDropdown(menu) {
        menu.innerHTML = `
            <div class="dropdown-item" data-action="theme-dark">
                <span class="item-icon">🌙</span>
                Dark Theme
            </div>
            <div class="dropdown-item" data-action="theme-light">
                <span class="item-icon">☀️</span>
                Light Theme
            </div>
            <div class="dropdown-item" data-action="theme-blue">
                <span class="item-icon">🔵</span>
                Blue Theme
            </div>
            <div class="dropdown-item" data-action="theme-purple">
                <span class="item-icon">🟣</span>
                Purple Theme
            </div>
        `;

        this.setupDropdownEvents(menu, 'theme');
    }

    setupDropdownEvents(menu, type) {
        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleDropdownAction(type, action);
                this.hideAllDropdowns();
            });
        });
    }

    handleDropdownAction(type, action) {
        switch (type) {
            case 'project':
                this.handleProjectAction(action);
                break;
            case 'view':
                this.handleViewAction(action);
                break;
            case 'theme':
                this.handleThemeAction(action);
                break;
        }
    }

    handleProjectAction(action) {
        switch (action) {
            case 'new-project':
                this.emit('newProject');
                break;
            case 'open-project':
                this.emit('openProject');
                break;
            case 'project-settings':
                this.emit('projectSettings');
                break;
            case 'export-project':
                this.emit('exportProject');
                break;
        }
    }

    handleViewAction(action) {
        switch (action) {
            case 'toggle-sidebar':
                this.emit('toggleSidebar');
                break;
            case 'toggle-preview':
                this.emit('togglePreview');
                break;
            case 'toggle-terminal':
                this.emit('toggleTerminal');
                break;
            case 'zoom-in':
                this.emit('zoomIn');
                break;
            case 'zoom-out':
                this.emit('zoomOut');
                break;
            case 'reset-zoom':
                this.emit('resetZoom');
                break;
        }
    }

    handleThemeAction(action) {
        const theme = action.replace('theme-', '');
        this.emit('themeChange', { theme });
    }

    setupEventListeners() {
        // Обработчики кнопок
        this.buttons.get('btn-new-file').addEventListener('click', () => {
            this.emit('newFile');
        });

        this.buttons.get('btn-save').addEventListener('click', () => {
            this.emit('saveFile');
        });

        this.buttons.get('btn-save-all').addEventListener('click', () => {
            this.emit('saveAllFiles');
        });

        this.buttons.get('btn-run').addEventListener('click', () => {
            this.emit('runCode');
        });

        this.buttons.get('btn-stop').addEventListener('click', () => {
            this.emit('stopExecution');
        });

        this.buttons.get('btn-ai-assist').addEventListener('click', () => {
            this.emit('openAIAssistant');
        });

        this.buttons.get('btn-settings').addEventListener('click', () => {
            this.emit('openSettings');
        });

        // Закрытие dropdown при клике вне их
        document.addEventListener('click', () => {
            this.hideAllDropdowns();
        });

        // Обновление состояния кнопок
        this.setupButtonStates();
    }

    setupButtonStates() {
        // Пример: отключаем кнопку Undo если нечего отменять
        this.updateUndoRedoStates();
        
        // Обновляем состояние кнопок при изменениях
        window.eventBus.on('editor:contentChanged', () => {
            this.updateUndoRedoStates();
        });
    }

    updateUndoRedoStates() {
        // В реальном приложении здесь была бы проверка истории изменений
        const hasUndo = true; // Заглушка
        const hasRedo = false; // Заглушка
        
        this.buttons.get('btn-undo').disabled = !hasUndo;
        this.buttons.get('btn-redo').disabled = !hasRedo;
    }

    toggleDropdown(menu) {
        const isVisible = menu.style.display === 'block';
        this.hideAllDropdowns();
        
        if (!isVisible) {
            menu.style.display = 'block';
        }
    }

    hideAllDropdowns() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }

    // Публичные методы для обновления состояния
    updateProjectName(name) {
        const element = document.getElementById('current-project');
        if (element) {
            element.textContent = name || 'No Project';
        }
    }

    setRunningState(isRunning) {
        const runBtn = this.buttons.get('btn-run');
        const stopBtn = this.buttons.get('btn-stop');
        
        if (isRunning) {
            runBtn.disabled = true;
            stopBtn.disabled = false;
            runBtn.querySelector('.btn-icon').textContent = '🔄';
        } else {
            runBtn.disabled = false;
            stopBtn.disabled = true;
            runBtn.querySelector('.btn-icon').textContent = '▶️';
        }
    }

    showNotification(buttonId, message, duration = 2000) {
        const button = this.buttons.get(buttonId);
        if (!button) return;

        const originalHTML = button.innerHTML;
        const originalTitle = button.title;

        button.innerHTML = `<span class="btn-icon">✅</span><span class="btn-text">${message}</span>`;
        button.style.opacity = '0.8';

        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.title = originalTitle;
            button.style.opacity = '1';
        }, duration);
    }
}

Object.assign(Toolbar.prototype, EventEmitter.prototype);
