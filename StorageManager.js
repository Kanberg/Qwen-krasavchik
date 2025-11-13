// Управление локальным хранилищем
class StorageManager {
    constructor() {
        this.prefix = 'pge_';
        this.cache = new Map();
        this.init();
    }

    async init() {
        await this.migrateOldData();
        this.setupAutoCleanup();
    }

    // Базовые методы
    set(key, value, options = {}) {
        const storageKey = this.prefix + key;
        const data = {
            value: value,
            timestamp: Date.now(),
            expires: options.expires ? Date.now() + options.expires : null,
            version: options.version || '1.0'
        };

        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(storageKey, serialized);
            this.cache.set(storageKey, data);
            return true;
        } catch (error) {
            console.error('Storage set failed:', error);
            return false;
        }
    }

    get(key, defaultValue = null) {
        const storageKey = this.prefix + key;
        
        // Проверяем кэш
        if (this.cache.has(storageKey)) {
            const cached = this.cache.get(storageKey);
            if (!this.isExpired(cached)) {
                return cached.value;
            }
        }

        // Читаем из localStorage
        try {
            const item = localStorage.getItem(storageKey);
            if (!item) return defaultValue;

            const data = JSON.parse(item);
            
            // Проверяем срок годности
            if (this.isExpired(data)) {
                this.remove(key);
                return defaultValue;
            }

            // Обновляем кэш
            this.cache.set(storageKey, data);
            return data.value;

        } catch (error) {
            console.error('Storage get failed:', error);
            return defaultValue;
        }
    }

    remove(key) {
        const storageKey = this.prefix + key;
        localStorage.removeItem(storageKey);
        this.cache.delete(storageKey);
    }

    clear() {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.prefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            this.cache.delete(key);
        });
    }

    // Специализированные методы для редактора
    saveProjectState(projectId, state) {
        return this.set(`project_${projectId}`, state, {
            expires: 7 * 24 * 60 * 60 * 1000 // 7 дней
        });
    }

    loadProjectState(projectId) {
        return this.get(`project_${projectId}`, {
            files: {},
            cursorPositions: {},
            openTabs: []
        });
    }

    saveUserPreferences(prefs) {
        return this.set('user_preferences', prefs);
    }

    loadUserPreferences() {
        return this.get('user_preferences', {
            theme: 'dark',
            fontSize: 14,
            autoSave: true,
            tabSize: 4
        });
    }

    saveEditorState(filePath, state) {
        const editorStates = this.get('editor_states', {});
        editorStates[filePath] = {
            ...state,
            lastAccessed: Date.now()
        };
        return this.set('editor_states', editorStates);
    }

    loadEditorState(filePath) {
        const editorStates = this.get('editor_states', {});
        return editorStates[filePath] || null;
    }

    // Вспомогательные методы
    isExpired(data) {
        return data.expires && Date.now() > data.expires;
    }

    async migrateOldData() {
        // Миграция данных со старых версий
        const oldKeys = ['current_project', 'user_settings', 'workspace_layout'];
        oldKeys.forEach(oldKey => {
            const oldValue = localStorage.getItem(oldKey);
            if (oldValue) {
                this.set(oldKey, JSON.parse(oldValue));
                localStorage.removeItem(oldKey);
            }
        });
    }

    setupAutoCleanup() {
        // Автоочистка устаревших данных раз в день
        const lastCleanup = this.get('last_cleanup', 0);
        if (Date.now() - lastCleanup > 24 * 60 * 60 * 1000) {
            this.cleanupExpired();
            this.set('last_cleanup', Date.now());
        }
    }

    cleanupExpired() {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.prefix)) {
                try {
                    const item = localStorage.getItem(key);
                    const data = JSON.parse(item);
                    if (this.isExpired(data)) {
                        localStorage.removeItem(key);
                        this.cache.delete(key);
                    }
                } catch (error) {
                    // Невалидные данные - удаляем
                    localStorage.removeItem(key);
                    this.cache.delete(key);
                }
            }
        }
    }

    // Статистика
    getStorageInfo() {
        let totalSize = 0;
        let itemCount = 0;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.prefix)) {
                const value = localStorage.getItem(key);
                totalSize += key.length + value.length;
                itemCount++;
            }
        }

        return {
            totalSize: totalSize,
            itemCount: itemCount,
            usage: ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(2) + '%'
        };
    }
}
