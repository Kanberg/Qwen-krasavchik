class PreviewManager {
    constructor() {
        this.previewFrame = null;
        this.isRunning = false;
        this.currentSession = null;
        this.consoleBuffer = [];
        this.setupPreviewEnvironment();
    }

    setupPreviewEnvironment() {
        this.previewFrame = document.getElementById('previewFrame');
        this.setupConsoleInterception();
        this.setupErrorHandling();
    }

    setupConsoleInterception() {
        // Override console methods to capture output
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn
        };

        ['log', 'error', 'warn'].forEach(method => {
            console[method] = (...args) => {
                originalConsole[method](...args);
                this.captureConsoleOutput(method, args);
            };
        });
    }

    captureConsoleOutput(level, args) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        this.consoleBuffer.push({
            level,
            message,
            timestamp: new Date().toISOString()
        });

        this.emit('consoleOutput', {
            level,
            message,
            timestamp: new Date()
        });
    }

    async executePython(code) {
        if (!window.pyodide) {
            throw new Error('Python interpreter not loaded');
        }

        this.isRunning = true;
        this.emit('executionStarted');

        try {
            // Clear previous state
            this.consoleBuffer = [];
            
            // Setup virtual display for pygame
            await this.setupVirtualDisplay();
            
            // Execute code
            const result = await window.pyodide.runPythonAsync(code);
            
            this.emit('executionCompleted', { result });
            return result;
            
        } catch (error) {
            this.handleExecutionError(error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    async setupVirtualDisplay() {
        const virtualDisplayCode = `
import pygame
import os
import sys

# Set SDL to use dummy video driver for headless execution
if 'pygame' in sys.modules:
    os.environ['SDL_VIDEODRIVER'] = 'dummy'
    pygame.display.init()
    pygame.display.set_mode((1, 1))
`;
        try {
            await window.pyodide.runPythonAsync(virtualDisplayCode);
        } catch (error) {
            console.warn('Virtual display setup failed:', error);
        }
    }

    handleExecutionError(error) {
        const enhancedError = this.enhanceErrorReporting(error);
        this.emit('executionError', enhancedError);
        
        // Display error in preview
        this.showErrorInPreview(enhancedError);
    }

    enhanceErrorReporting(error) {
        const stackTrace = error.stack || error.toString();
        
        // Add line numbers and context
        const enhancedError = {
            message: error.message,
            stack: stackTrace,
            type: error.name,
            timestamp: new Date(),
            context: this.extractErrorContext(stackTrace)
        };
        
        return enhancedError;
    }

    extractErrorContext(stackTrace) {
        // Parse Python traceback to extract useful information
        const lines = stackTrace.split('\n');
        const context = {
            lineNumber: null,
            functionName: null,
            codeSnippet: null
        };

        for (const line of lines) {
            const lineMatch = line.match(/File "<exec>", line (\d+)/);
            if (lineMatch) {
                context.lineNumber = parseInt(lineMatch[1]);
            }
        }

        return context;
    }

    showErrorInPreview(error) {
        const errorHTML = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: 'Fira Code', monospace; 
            background: #1e1e1e; 
            color: #f8f8f2; 
            padding: 20px; 
            margin: 0; 
        }
        .error-container { 
            max-width: 800px; 
            margin: 0 auto; 
        }
        .error-header { 
            color: #ff5555; 
            font-size: 1.5em; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #ff5555; 
            padding-bottom: 10px; 
        }
        .error-message { 
            background: #282a36; 
            padding: 15px; 
            border-radius: 5px; 
            border-left: 4px solid #ff5555; 
            margin-bottom: 15px; 
        }
        .stack-trace { 
            background: #44475a; 
            padding: 15px; 
            border-radius: 5px; 
            font-size: 0.9em; 
            white-space: pre-wrap; 
            overflow-x: auto; 
        }
        .line-number { 
            color: #bd93f9; 
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-header">🐍 Python Execution Error</div>
        <div class="error-message">
            <strong>${error.type}:</strong> ${error.message}
        </div>
        <div class="stack-trace">${error.stack}</div>
    </div>
</body>
</html>`;

        this.previewFrame.srcdoc = errorHTML;
    }

    createGamePreview(code) {
        const previewHTML = this.generateGamePreviewHTML(code);
        this.previewFrame.srcdoc = previewHTML;
        
        // Inject Pyodide and execute
        this.injectPyodideAndExecute(code);
    }

    generateGamePreviewHTML(code) {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            background: #000; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            font-family: Arial, sans-serif; 
        }
        #game-container { 
            position: relative; 
        }
        #game-canvas { 
            border: 2px solid #333; 
            background: #111; 
        }
        #loading { 
            color: #fff; 
            font-size: 18px; 
        }
        #error { 
            color: #ff4444; 
            padding: 20px; 
            background: #1a1a1a; 
            border-radius: 5px; 
            margin: 20px; 
        }
    </style>
</head>
<body>
    <div id="game-container">
        <div id="loading">🚀 Loading Python Game...</div>
        <canvas id="game-canvas" width="800" height="600" style="display: none;"></canvas>
        <div id="error" style="display: none;"></div>
    </div>

    <script src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"></script>
    <script>
        let pyodide;
        
        async function main() {
            try {
                pyodide = await loadPyodide({
                    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
                });
                
                // Load required packages
                await pyodide.loadPackage(['micropip']);
                const micropip = pyodide.pyimport('micropip');
                
                // Setup pygame environment
                await setupPygame();
                
                // Execute user code
                await pyodide.runPythonAsync(\`${this.escapeCode(code)}\`);
                
                document.getElementById('loading').style.display = 'none';
                document.getElementById('game-canvas').style.display = 'block';
                
            } catch (error) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'block';
                document.getElementById('error').innerHTML = '<h3>Error:</h3><pre>' + error.toString() + '</pre>';
            }
        }
        
        async function setupPygame() {
            // Pygame setup code here
        }
        
        main();
    </script>
</body>
</html>`;
    }

    escapeCode(code) {
        return code.replace(/`/g, '\\`').replace(/\${/g, '\\${');
    }
}
