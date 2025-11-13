// Управление настройками редактора
class SettingsManager {
    constructor() {
        this.settings = new Map();
        this.categories = new Map();
        this.init();
    }

    async init() {
        await this.loadDefaultSettings();
        await this.loadUserSettings();
        this.setupSettingsUI();
    }

    loadDefaultSettings() {
        // Основные настройки редактора
        this.setDefault('editor.fontSize', 14);
        this.setDefault('editor.fontFamily', "'Fira Code', monospace");
        this.setDefault('editor.tabSize', 4);
        this.setDefault('editor.insertSpaces', true);
        this.setDefault('editor.wordWrap', 'off');
        this.setDefault('editor.minimap', true);
        this.setDefault('editor.lineNumbers', 'on');
        this.setDefault('editor.autoSave', true);
        this.setDefault('editor.autoSaveDelay', 1000);

        // Настройки темы
        this.setDefault('theme.current', 'dark');
        this.setDefault('theme.accentColor', '#6366f1');

        // Настройки выполнения кода
        this.setDefault('execution.pythonVersion', '3.9');
        this.setDefault('execution.autoRun', false);
        this.setDefault('execution.headless', true);

        // Настройки AI
        this.setDefault('ai.enabled', true);
        this.setDefault('ai.autoComplete', true);
        this.setDefault('ai.codeReview', true);

        // Настройки интерфейса
        this.setDefault('ui.sidebarVisible', true);
        this.setDefault('ui.previewVisible', true);
        this.setDefault('ui.terminalVisible', false);
        this.setDefault('ui.zenMode', false);
    }

    setDefault(key, value) {
        if (!this.settings.has(key)) {
            this.settings.set(key, value);
        }
    }

    async loadUserSettings() {
        try {
            const saved = localStorage.getItem('pge_settings');
            if (saved) {
                const userSettings = JSON.parse(saved);
                userSettings.forEach(([key, value]) => {
                    this.settings.set(key, value);
                });
            }
        } catch (error) {
            console.error('Failed to load user settings:', error);
        }
    }

    async saveUserSettings() {
        try {
            const settingsArray = Array.from(this.settings.entries());
            localStorage.setItem('pge_settings', JSON.stringify(settingsArray));
            this.emit('settingsChanged', { settings: this.getAllSettings() });
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    // Работа с настройками
    get(key, defaultValue = null) {
        return this.settings.get(key) ?? defaultValue;
    }

    set(key, value) {
        const oldValue = this.settings.get(key);
        this.settings.set(key, value);
        
        if (oldValue !== value) {
            this.emit('settingChanged', { key, value, oldValue });
            this.saveUserSettings();
        }
    }

    getAllSettings() {
        return Object.fromEntries(this.settings);
    }

    resetToDefaults() {
        this.settings.clear();
        this.loadDefaultSettings();
        this.saveUserSettings();
    }

    // UI для настроек
    setupSettingsUI() {
        this.categories.set('editor', {
            name: 'Editor',
            icon: '📝',
            settings: [
                {
                    key: 'editor.fontSize',
                    name: 'Font Size',
                    type: 'number',
                    min: 8,
                    max: 24,
                    description: 'Size of the font in the editor'
                },
                {
                    key: 'editor.fontFamily',
                    name: 'Font Family',
                    type: 'select',
                    options: [
                        "'Fira Code', monospace",
                        "'Cascadia Code', monospace", 
                        "'Monaco', 'Menlo', monospace",
                        "'Courier New', monospace"
                    ],
                    description: 'Font family for code editing'
                },
                {
                    key: 'editor.tabSize',
                    name: 'Tab Size',
                    type: 'number',
                    min: 2,
                    max: 8,
                    description: 'Number of spaces per tab'
                },
                {
                    key: 'editor.insertSpaces',
                    name: 'Insert Spaces',
                    type: 'boolean',
                    description: 'Use spaces instead of tabs'
                },
                {
                    key: 'editor.autoSave',
                    name: 'Auto Save',
                    type: 'boolean',
                    description: 'Automatically save files'
                }
            ]
        });

        this.categories.set('theme', {
            name: 'Theme & Appearance',
            icon: '🎨',
            settings: [
                {
                    key: 'theme.current',
                    name: 'Theme',
                    type: 'select',
                    options: ['dark', 'light', 'blue', 'purple'],
                    description: 'Color theme of the editor'
                },
                {
                    key: 'theme.accentColor',
                    name: 'Accent Color',
                    type: 'color',
                    description: 'Primary color for UI elements'
                }
            ]
        });

        this.categories.set('execution', {
            name: 'Code Execution',
            icon: '🚀',
            settings: [
                {
                    key: 'execution.pythonVersion',
                    name: 'Python Version',
                    type: 'select',
                    options: ['3.8', '3.9', '3.10', '3.11'],
                    description: 'Python version for code execution'
                },
                {
                    key: 'execution.autoRun',
                    name: 'Auto Run',
                    type: 'boolean',
                    description: 'Run code automatically on changes'
                }
            ]
        });

        this.categories.set('ai', {
            name: 'AI Assistant',
            icon: '🤖',
            settings: [
                {
                    key: 'ai.enabled',
                    name: 'AI Assistant',
                    type: 'boolean',
                    description: 'Enable AI code assistance'
                },
                {
                    key: 'ai.autoComplete',
                    name: 'Auto Complete',
                    type: 'boolean',
                    description: 'Show AI-powered code completions'
                },
                {
                    key: 'ai.codeReview',
                    name: 'Code Review',
                    type: 'boolean',
                    description: 'Automatically review code for improvements'
                }
            ]
        });
    }

    // Открытие модального окна настроек
    openSettingsModal() {
        const modal = this.createSettingsModal();
        document.body.appendChild(modal);
        this.showCategory('editor');
    }

    createSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.innerHTML = `
            <div class="settings-content">
                <div class="settings-header">
                    <h2>Settings</h2>
                    <button class="settings-close">&times;</button>
                </div>
                <div class="settings-body">
                    <div class="settings-sidebar">
                        ${this.renderCategories()}
                    </div>
                    <div class="settings-main">
                        <div id="settings-category-content"></div>
                    </div>
                </div>
                <div class="settings-footer">
                    <button class="btn-secondary" id="settings-reset">Reset to Defaults</button>
                    <button class="btn-primary" id="settings-save">Save Settings</button>
                </div>
            </div>
        `;

        this.setupModalEvents(modal);
        return modal;
    }

    renderCategories() {
        let html = '';
        this.categories.forEach((category, id) => {
            html += `
                <div class="settings-category" data-category="${id}">
                    <span class="category-icon">${category.icon}</span>
                    <span class="category-name">${category.name}</span>
                </div>
            `;
        });
        return html;
    }

    setupModalEvents(modal) {
        // Закрытие модального окна
        modal.querySelector('.settings-close').addEventListener('click', () => {
            modal.remove();
        });

        // Клик по категории
        modal.querySelectorAll('.settings-category').forEach(category => {
            category.addEventListener('click', () => {
                const categoryId = category.dataset.category;
                this.showCategory(categoryId, modal);
            });
        });

        // Кнопки
        modal.querySelector('#settings-reset').addEventListener('click', () => {
            this.resetToDefaults();
            this.refreshSettingsUI(modal);
        });

        modal.querySelector('#settings-save').addEventListener('click', () => {
            this.saveUserSettings();
            modal.remove();
        });

        // Закрытие по клику вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showCategory(categoryId, modal) {
        const category = this.categories.get(categoryId);
        if (!category) return;

        // Обновляем активную категорию
        modal.querySelectorAll('.settings-category').forEach(cat => {
            cat.classList.remove('active');
        });
        modal.querySelector(`[data-category="${categoryId}"]`).classList.add('active');

        // Показываем настройки категории
        const content = modal.querySelector('#settings-category-content');
        content.innerHTML = this.renderCategorySettings(category);
        
        this.setupSettingsInputs(content);
    }

    renderCategorySettings(category) {
        let html = `<h3>${category.name}</h3>`;
        
        category.settings.forEach(setting => {
            html += this.renderSettingField(setting);
        });

        return html;
    }

    renderSettingField(setting) {
        const currentValue = this.get(setting.key);
        
        switch (setting.type) {
            case 'boolean':
                return `
                    <div class="setting-field">
                        <label class="setting-label">
                            <input type="checkbox" 
                                   data-key="${setting.key}" 
                                   ${currentValue ? 'checked' : ''}>
                            <span class="setting-name">${setting.name}</span>
                        </label>
                        <div class="setting-description">${setting.description}</div>
                    </div>
                `;
            
            case 'number':
                return `
                    <div class="setting-field">
                        <label class="setting-name">${setting.name}</label>
                        <input type="number" 
                               data-key="${setting.key}"
                               value="${currentValue}"
                               min="${setting.min}" 
                               max="${setting.max}">
                        <div class="setting-description">${setting.description}</div>
                    </div>
                `;
            
            case 'select':
                return `
                    <div class="setting-field">
                        <label class="setting-name">${setting.name}</label>
                        <select data-key="${setting.key}">
                            ${setting.options.map(opt => 
                                `<option value="${opt}" ${opt === currentValue ? 'selected' : ''}>${opt}</option>`
                            ).join('')}
                        </select>
                        <div class="setting-description">${setting.description}</div>
                    </div>
                `;
            
            case 'color':
                return `
                    <div class="setting-field">
                        <label class="setting-name">${setting.name}</label>
                        <input type="color" 
                               data-key="${setting.key}"
                               value="${currentValue}">
                        <div class="setting-description">${setting.description}</div>
                    </div>
                `;
            
            default:
                return '';
        }
    }

    setupSettingsInputs(container) {
        container.querySelectorAll('input, select').forEach(input => {
            const key = input.dataset.key;
            
            input.addEventListener('change', (e) => {
                let value;
                
                if (input.type === 'checkbox') {
                    value = input.checked;
                } else if (input.type === 'number') {
                    value = parseInt(input.value);
                } else {
                    value = input.value;
                }
                
                this.set(key, value);
            });
        });
    }

    refreshSettingsUI(modal) {
        const activeCategory = modal.querySelector('.settings-category.active');
        if (activeCategory) {
            this.showCategory(activeCategory.dataset.category, modal);
        }
    }

    // Применение настроек к редактору
    applyEditorSettings(editor) {
        if (!editor) return;

        const options = {
            fontSize: this.get('editor.fontSize'),
            fontFamily: this.get('editor.fontFamily'),
            tabSize: this.get('editor.tabSize'),
            insertSpaces: this.get('editor.insertSpaces'),
            wordWrap: this.get('editor.wordWrap'),
            minimap: { enabled: this.get('editor.minimap') },
            lineNumbers: this.get('editor.lineNumbers')
        };

        editor.updateOptions(options);
    }

    // Применение темы
    applyTheme() {
        const theme = this.get('theme.current');
        document.documentElement.setAttribute('data-theme', theme);
        
        const accentColor = this.get('theme.accentColor');
        document.documentElement.style.setProperty('--primary-color', accentColor);
    }
}

Object.assign(SettingsManager.prototype, EventEmitter.prototype);
