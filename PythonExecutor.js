// Плагин для выполнения Python кода
class PythonExecutor {
    constructor() {
        this.pyodide = null;
        this.isInitialized = false;
        this.outputHandlers = new Set();
        this.errorHandlers = new Set();
        this.init();
    }

    async init() {
        await this.loadPyodide();
        this.setupPythonEnvironment();
    }

    async loadPyodide() {
        try {
            this.emit('status', { type: 'loading', message: 'Loading Python interpreter...' });
            
            // Динамическая загрузка Pyodide
            if (typeof loadPyodide === 'undefined') {
                await this.loadScript('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js');
            }

            this.pyodide = await loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
            });

            // Загрузка необходимых пакетов
            await this.pyodide.loadPackage(['micropip']);
            const micropip = this.pyodide.pyimport('micropip');
            
            this.isInitialized = true;
            this.emit('status', { type: 'ready', message: 'Python 3.9 ready' });
            
        } catch (error) {
            console.error('Failed to load Pyodide:', error);
            this.emit('status', { type: 'error', message: 'Failed to load Python' });
            throw error;
        }
    }

    async loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupPythonEnvironment() {
        if (!this.pyodide) return;

        try {
            // Настройка среды выполнения Python
            const setupCode = `
import sys
import io
import js

class JsOutput(io.StringIO):
    def write(self, text):
        if text.strip():
            js.outputHandler(text)
        return len(text)

    def flush(self):
        pass

# Перенаправляем stdout и stderr
sys.stdout = JsOutput()
sys.stderr = JsOutput()

# Глобальные переменные для игр
WIDTH, HEIGHT = 800, 600

def clear_output():
    """Clear the output console"""
    js.clearOutput()

def help_pygame():
    """Show PyGame help"""
    help_text = """
PyGame Basics:
--------------
import pygame

# Initialize
pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))

# Main loop
running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
    
    # Drawing
    screen.fill((0, 0, 0))
    pygame.display.flip()

pygame.quit()
    """
    print(help_text)
`;
            this.pyodide.runPython(setupCode);
            
            // Экспортируем функции в глобальную область видимости
            window.outputHandler = (text) => this.handleOutput(text);
            window.clearOutput = () => this.clearOutput();
            
        } catch (error) {
            console.error('Failed to setup Python environment:', error);
        }
    }

    async executeCode(code, context = {}) {
        if (!this.isInitialized) {
            throw new Error('Python interpreter not loaded');
        }

        try {
            this.emit('executionStarted', { code, context });
            
            // Подготовка контекста выполнения
            await this.prepareExecutionContext(context);
            
            // Выполнение кода
            const result = await this.pyodide.runPythonAsync(code);
            
            this.emit('executionCompleted', { result, code, context });
            return result;
            
        } catch (error) {
            const enhancedError = this.enhanceError(error, code);
            this.emit('executionError', { error: enhancedError, code, context });
            throw enhancedError;
        }
    }

    async prepareExecutionContext(context) {
        // Установка глобальных переменных
        if (context.variables) {
            for (const [key, value] of Object.entries(context.variables)) {
                this.pyodide.globals.set(key, value);
            }
        }

        // Загрузка дополнительных пакетов
        if (context.packages && context.packages.length > 0) {
            await this.loadPackages(context.packages);
        }
    }

    async loadPackages(packages) {
        const micropip = this.pyodide.pyimport('micropip');
        
        for (const pkg of packages) {
            try {
                await micropip.install(pkg);
                this.emit('packageLoaded', { package: pkg });
            } catch (error) {
                console.warn(`Failed to load package ${pkg}:`, error);
                this.emit('packageError', { package: pkg, error });
            }
        }
    }

    async executePygameCode(code) {
        // Специальная обработка для PyGame кода
        const pygameSetup = `
import pygame
import os
import sys

# Настройка для веб-окружения
os.environ['SDL_VIDEODRIVER'] = 'dummy'
pygame.display.init()
pygame.font.init()

# Создаем виртуальный экран
pygame.display.set_mode((1, 1))
`;

        const fullCode = pygameSetup + '\n' + code;
        return await this.executeCode(fullCode);
    }

    handleOutput(text) {
        this.emit('output', { text, type: 'stdout' });
    }

    handleError(text) {
        this.emit('output', { text, type: 'stderr' });
    }

    clearOutput() {
        this.emit('outputCleared');
    }

    enhanceError(error, code) {
        const errorInfo = {
            message: error.message,
            name: error.name,
            stack: error.stack,
            type: 'python'
        };

        // Парсим Python traceback для лучшего отображения
        if (error.message.includes('File "<exec>"')) {
            const lineMatch = error.message.match(/line (\d+)/);
            if (lineMatch) {
                errorInfo.lineNumber = parseInt(lineMatch[1]);
                errorInfo.codeContext = this.getCodeContext(code, errorInfo.lineNumber);
            }
        }

        return errorInfo;
    }

    getCodeContext(code, lineNumber) {
        const lines = code.split('\n');
        const start = Math.max(0, lineNumber - 3);
        const end = Math.min(lines.length, lineNumber + 2);
        
        return lines.slice(start, end).map((line, index) => ({
            line: start + index + 1,
            code: line,
            isErrorLine: (start + index + 1) === lineNumber
        }));
    }

    // Работа с файлами Python
    async savePythonFile(filename, content) {
        if (!this.pyodide) return;

        try {
            // Сохраняем файл в виртуальной файловой системе Pyodide
            this.pyodide.FS.writeFile(filename, content);
            this.emit('fileSaved', { filename, content });
        } catch (error) {
            console.error('Failed to save Python file:', error);
            throw error;
        }
    }

    async readPythonFile(filename) {
        if (!this.pyodide) return null;

        try {
            const content = this.pyodide.FS.readFile(filename, { encoding: 'utf8' });
            return content;
        } catch (error) {
            console.error('Failed to read Python file:', error);
            return null;
        }
    }

    // Управление состоянием интерпретатора
    async restart() {
        this.pyodide = null;
        this.isInitialized = false;
        await this.init();
    }

    async installPackage(packageName) {
        if (!this.isInitialized) {
            throw new Error('Python interpreter not loaded');
        }

        try {
            const micropip = this.pyodide.pyimport('micropip');
            await micropip.install(packageName);
            this.emit('packageInstalled', { package: packageName });
            return true;
        } catch (error) {
            this.emit('packageInstallFailed', { package: packageName, error });
            throw error;
        }
    }

    getInstalledPackages() {
        if (!this.pyodide) return [];
        
        try {
            const micropip = this.pyodide.pyimport('micropip');
            return micropip.list();
        } catch (error) {
            return [];
        }
    }

    // Получение информации о системе
    getSystemInfo() {
        if (!this.pyodide) return null;

        try {
            const sys = this.pyodide.pyimport('sys');
            return {
                version: sys.version,
                platform: sys.platform,
                executable: sys.executable,
                path: sys.path
            };
        } catch (error) {
            return null;
        }
    }

    // Отладка и профилирование
    async profileCode(code, iterations = 1000) {
        const profileCode = `
import timeit
import sys

def profile_wrapper():
    try:
        exec("""${code.replace(/"/g, '\\"')}""")
        return "success"
    except Exception as e:
        return f"error: {e}"

result = timeit.timeit(profile_wrapper, number=${iterations})
print(f"Execution time for ${iterations} iterations: {result:.4f} seconds")
print(f"Average time per iteration: {result/${iterations}*1000:.2f} ms")
`;
        return await this.executeCode(profileCode);
    }

    // Безопасное выполнение (песочница)
    async executeSafely(code, timeout = 5000) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Execution timeout'));
            }, timeout);

            try {
                const result = await this.executeCode(code);
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }
}

Object.assign(PythonExecutor.prototype, EventEmitter.prototype);
