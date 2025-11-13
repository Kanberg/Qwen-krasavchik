// Компонент строки состояния
class StatusBar {
    constructor(container) {
        this.container = container;
        this.elements = new Map();
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="status-bar">
                <div class="status-left">
                    <span class="status-item" id="status-cursor">Ln 1, Col 1</span>
                    <span class="status-item" id="status-language">Python</span>
                    <span class="status-item" id="status-encoding">UTF-8</span>
                </div>
                <div class="status-center">
                    <span class="status-item" id="status-project">No project</span>
                    <span class="status-item" id="status-branch">main</span>
                </div>
                <div class="status-right">
                    <span class="status-item" id="status-python">Python 3.9</span>
                    <span class="status-item" id="status-interpreter">🟢 Ready</span>
                    <span class="status-item" id="status-memory">Mem: 0MB</span>
                </div>
            </div>
        `;

        // Инициализируем элементы
        this.elements.set('cursor', document.getElementById('status-cursor'));
        this.elements.set('language', document.getElementById('status-language'));
        this.elements.set('encoding', document.getElementById('status-encoding'));
        this.elements.set('project', document.getElementById('status-project'));
        this.elements.set('branch', document.getElementById('status-branch'));
        this.elements.set('python', document.getElementById('status-python'));
        this.elements.set('interpreter', document.getElementById('status-interpreter'));
        this.elements.set('memory', document.getElementById('status-memory'));
    }

    setupEventListeners() {
        // Клик на статусе Python переключает версию
        this.elements.get('python').addEventListener('click', () => {
            this.togglePythonVersion();
        });

        // Клик на статусе интерпретатора перезагружает его
        this.elements.get('interpreter').addEventListener('click', () => {
            this.restartInterpreter();
        });

        // Обновление использования памяти
        this.startMemoryMonitoring();
    }

    // Обновление позиции курсора
    updateCursorPosition(line, column) {
        const element = this.elements.get('cursor');
        if (element) {
            element.textContent = `Ln ${line}, Col ${column}`;
        }
    }

    // Обновление языка
    updateLanguage(language) {
        const element = this.elements.get('language');
        if (element) {
            element.textContent = this.getLanguageDisplayName(language);
        }
    }

    // Обновление проекта
    updateProject(project) {
        const element = this.elements.get('project');
        if (element) {
            element.textContent = project ? project.name : 'No project';
        }
    }

    // Обновление статуса интерпретатора
    updateInterpreterStatus(status, message = '') {
        const element = this.elements.get('interpreter');
        if (element) {
            const statusIcons = {
                ready: '🟢',
                loading: '🟡',
                error: '🔴',
                executing: '🔵'
            };

            const icon = statusIcons[status] || '⚪';
            element.textContent = `${icon} ${message || this.getStatusMessage(status)}`;
            element.className = `status-item status-${status}`;
        }
    }

    // Показ временного сообщения
    showTempMessage(message, type = 'info', duration = 3000) {
        const tempElement = document.createElement('div');
        tempElement.className = `status-temp status-temp-${type}`;
        tempElement.textContent = message;

        this.container.appendChild(tempElement);

        setTimeout(() => {
            if (tempElement.parentNode) {
                tempElement.parentNode.removeChild(tempElement);
            }
        }, duration);
    }

    // Прогресс-бар для длительных операций
    showProgress(message, progress = 0) {
        let progressElement = document.getElementById('status-progress');
        
        if (!progressElement) {
            progressElement = document.createElement('div');
            progressElement.id = 'status-progress';
            progressElement.className = 'status-progress';
            this.container.appendChild(progressElement);
        }

        progressElement.innerHTML = `
            <div class="progress-text">${message}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        `;

        if (progress >= 100) {
            setTimeout(() => {
                if (progressElement.parentNode) {
                    progressElement.parentNode.removeChild(progressElement);
                }
            }, 1000);
        }
    }

    // Мониторинг памяти
    startMemoryMonitoring() {
        const updateMemoryUsage = () => {
            if (performance.memory) {
                const memory = performance.memory;
                const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
                
                this.elements.get('memory').textContent = `Mem: ${usedMB}MB`;
                
                // Предупреждение при высоком использовании памяти
                if (usedMB > 500) {
                    this.elements.get('memory').classList.add('status-warning');
                } else {
                    this.elements.get('memory').classList.remove('status-warning');
                }
            }
        };

        setInterval(updateMemoryUsage, 5000);
        updateMemoryUsage();
    }

    // Вспомогательные методы
    getLanguageDisplayName(language) {
        const names = {
            'python': 'Python',
            'javascript': 'JavaScript',
            'html': 'HTML',
            'css': 'CSS',
            'json': 'JSON',
            'markdown': 'Markdown'
        };
        return names[language] || language;
    }

    getStatusMessage(status) {
        const messages = {
            'ready': 'Ready',
            'loading': 'Loading...',
            'error': 'Error',
            'executing': 'Executing...'
        };
        return messages[status] || status;
    }

    togglePythonVersion() {
        const versions = ['3.8', '3.9', '3.10', '3.11'];
        const current = this.elements.get('python').textContent.replace('Python ', '');
        const currentIndex = versions.indexOf(current);
        const nextIndex = (currentIndex + 1) % versions.length;
        
        this.elements.get('python').textContent = `Python ${versions[nextIndex]}`;
        this.emit('pythonVersionChanged', { version: versions[nextIndex] });
    }

    async restartInterpreter() {
        this.updateInterpreterStatus('loading', 'Restarting...');
        
        try {
            // Перезагрузка Pyodide
            if (window.pyodide) {
                window.pyodide = null;
            }
            
            await window.app.previewManager.initPyodide();
            this.updateInterpreterStatus('ready', 'Ready');
            this.showTempMessage('Python interpreter restarted', 'success');
            
        } catch (error) {
            this.updateInterpreterStatus('error', 'Restart failed');
            this.showTempMessage('Failed to restart interpreter', 'error');
        }
    }

    // Индикатор записи файла
    showSavingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'status-saving';
        indicator.textContent = 'Saving...';
        
        this.container.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 1000);
    }

    // Индикатор синхронизации
    showSyncIndicator(syncing = true) {
        let syncElement = document.getElementById('status-sync');
        
        if (syncing) {
            if (!syncElement) {
                syncElement = document.createElement('div');
                syncElement.id = 'status-sync';
                syncElement.className = 'status-sync';
                syncElement.textContent = '🔄 Syncing...';
                this.container.appendChild(syncElement);
            }
        } else {
            if (syncElement) {
                syncElement.textContent = '✅ Synced';
                setTimeout(() => {
                    if (syncElement.parentNode) {
                        syncElement.parentNode.removeChild(syncElement);
                    }
                }, 2000);
            }
        }
    }
}

Object.assign(StatusBar.prototype, EventEmitter.prototype);
