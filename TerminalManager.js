class TerminalManager {
    constructor() {
        this.terminals = new Map();
        this.activeTerminal = null;
        this.history = [];
        this.historyIndex = -1;
        this.init();
    }

    async init() {
        await this.loadTerminalDependencies();
        this.setupTerminalContainer();
        this.setupEventListeners();
        this.startPythonTerminal();
    }

    async loadTerminalDependencies() {
        // Load xterm.js for terminal emulation
        if (typeof Terminal === 'undefined') {
            await this.loadScript('https://unpkg.com/xterm@5.3.0/lib/xterm.js');
            await this.loadScript('https://unpkg.com/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js');
            await this.loadScript('https://unpkg.com/xterm-addon-web-links@0.8.0/lib/xterm-addon-web-links.js');
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupTerminalContainer() {
        const container = document.getElementById('terminal-container');
        if (!container) {
            console.error('Terminal container not found');
            return;
        }

        this.terminal = new Terminal({
            theme: {
                background: '#1e1e1e',
                foreground: '#cccccc',
                cursor: '#ffffff',
                selection: '#3a3d41',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
                brightBlack: '#666666',
                brightRed: '#f14c4c',
                brightGreen: '#23d18b',
                brightYellow: '#f5f543',
                brightBlue: '#3b8eea',
                brightMagenta: '#d670d6',
                brightCyan: '#29b8db',
                brightWhite: '#ffffff'
            },
            fontSize: 14,
            fontFamily: "'Fira Code', 'Cascadia Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
            cursorBlink: true,
            scrollback: 10000,
            tabStopWidth: 8,
            bellStyle: 'sound'
        });

        // Load addons
        this.fitAddon = new FitAddon.FitAddon();
        this.webLinksAddon = new WebLinksAddon.WebLinksAddon();

        this.terminal.loadAddon(this.fitAddon);
        this.terminal.loadAddon(this.webLinksAddon);

        this.terminal.open(container);
        this.fitAddon.fit();

        this.setupTerminalHandlers();
    }

    setupTerminalHandlers() {
        this.terminal.onData(this.handleTerminalInput.bind(this));
        this.terminal.onKey(this.handleTerminalKey.bind(this));
        
        // Handle paste events
        this.terminal.element.addEventListener('paste', this.handlePaste.bind(this));
        
        // Handle resize
        window.addEventListener('resize', () => {
            this.fitAddon.fit();
        });
    }

    handleTerminalInput(data) {
        if (this.activeTerminal) {
            this.activeTerminal.write(data);
        } else {
            this.terminal.write(data);
        }
    }

    handleTerminalKey(event) {
        const { domEvent } = event;
        const { key, ctrlKey, altKey, metaKey } = domEvent;

        // Handle special key combinations
        if (ctrlKey) {
            switch (key) {
                case 'c':
                    if (this.terminal.hasSelection()) {
                        this.copySelection();
                    } else {
                        this.sendInterrupt();
                    }
                    domEvent.preventDefault();
                    break;
                case 'l':
                    this.clearTerminal();
                    domEvent.preventDefault();
                    break;
                case 'd':
                    this.sendEOF();
                    domEvent.preventDefault();
                    break;
            }
        }

        // Handle arrow keys for history navigation
        if (key === 'ArrowUp') {
            this.navigateHistory(-1);
            domEvent.preventDefault();
        } else if (key === 'ArrowDown') {
            this.navigateHistory(1);
            domEvent.preventDefault();
        } else if (key === 'Enter') {
            this.handleCommandEnter();
        }
    }

    handleCommandEnter() {
        const command = this.getCurrentLine();
        if (command.trim()) {
            this.addToHistory(command);
            this.executeCommand(command);
        }
        this.terminal.write('\r\n');
    }

    async executeCommand(command) {
        // Handle built-in commands
        const builtInCommands = {
            'clear': () => this.clearTerminal(),
            'history': () => this.showHistory(),
            'help': () => this.showHelp(),
            'pwd': () => this.showWorkingDirectory(),
            'ls': () => this.listFiles(),
            'cd': (args) => this.changeDirectory(args)
        };

        const [cmd, ...args] = command.trim().split(' ');
        const normalizedCmd = cmd.toLowerCase();

        if (builtInCommands[normalizedCmd]) {
            await builtInCommands[normalizedCmd](args);
            return;
        }

        // Execute Python code
        if (window.pyodide && this.isPythonCode(command)) {
            await this.executePythonCode(command);
        } else {
            this.terminal.writeln(`Command not found: ${command}`);
        }
    }

    isPythonCode(input) {
        const pythonKeywords = ['import', 'def ', 'class ', 'print', 'if ', 'for ', 'while ', 'return'];
        return pythonKeywords.some(keyword => input.includes(keyword)) || 
               input.trim().endsWith(':') ||
               input.includes('=');
    }

    async executePythonCode(code) {
        try {
            this.terminal.write('🐍 Executing Python code...\r\n');
            
            const result = await window.pyodide.runPythonAsync(code);
            
            if (result !== undefined) {
                this.terminal.writeln(`Result: ${result}`);
            }
            
            this.terminal.write('✅ Execution completed\r\n');
        } catch (error) {
            this.terminal.writeln(`❌ Error: ${error.message}`);
        }
    }

    async startPythonTerminal() {
        if (!window.pyodide) {
            this.terminal.writeln('🚀 Loading Python interpreter...');
            return;
        }

        this.terminal.writeln('\r\n');
        this.terminal.writeln('🐍 PyGame Editor - Interactive Python Terminal');
        this.terminal.writeln('✨ Type Python code or help() for assistance');
        this.terminal.writeln('──────────────────────────────────────────────');
        this.terminal.write('\r\n$ ');

        // Setup Python environment
        await this.setupPythonEnvironment();
    }

    async setupPythonEnvironment() {
        const setupCode = `
import sys
import io

class TerminalOutput(io.StringIO):
    def write(self, text):
        if text.strip():
            # Send output to terminal
            js.terminalWrite(text)
        return len(text)

# Redirect stdout and stderr
sys.stdout = TerminalOutput()
sys.stderr = TerminalOutput()

def clear():
    """Clear the terminal"""
    js.clearTerminal()

def help():
    """Show help information"""
    help_text = """
PyGame Editor Terminal Help:
──────────────────────────
• Type Python code directly
• Use clear() to clear terminal
• Use help() to show this message
• Press Ctrl+C to interrupt execution
• Press Ctrl+D to exit

Available modules: pygame, math, random, sys, os
    """
    print(help_text)
`;

        try {
            await window.pyodide.runPythonAsync(setupCode);
            
            // Expose terminal functions to Python
            window.js = {
                terminalWrite: (text) => {
                    this.terminal.write(text);
                },
                clearTerminal: () => {
                    this.clearTerminal();
                }
            };
        } catch (error) {
            console.error('Failed to setup Python environment:', error);
        }
    }

    addToHistory(command) {
        this.history.push(command);
        this.historyIndex = this.history.length;
        
        // Keep history manageable
        if (this.history.length > 100) {
            this.history.shift();
        }
    }

    navigateHistory(direction) {
        if (this.history.length === 0) return;

        this.historyIndex = Math.max(0, Math.min(this.history.length, this.historyIndex + direction));
        
        if (this.historyIndex < this.history.length) {
            this.setCurrentLine(this.history[this.historyIndex]);
        } else {
            this.setCurrentLine('');
        }
    }

    getCurrentLine() {
        // This would need to track the current input line
        // Simplified implementation
        return this.currentInput || '';
    }

    setCurrentLine(text) {
        this.currentInput = text;
        // In a real implementation, this would update the terminal display
    }

    clearTerminal() {
        this.terminal.clear();
        this.terminal.write('$ ');
    }

    showHistory() {
        this.terminal.writeln('\r\nCommand History:');
        this.history.forEach((cmd, index) => {
            this.terminal.writeln(` ${index + 1}. ${cmd}`);
        });
        this.terminal.write('$ ');
    }

    showHelp() {
        const helpText = `
Available Commands:
──────────────────
• clear     - Clear terminal
• history   - Show command history
• help      - Show this help
• pwd       - Show current directory
• ls        - List files
• cd <dir>  - Change directory

Python Examples:
───────────────
>>> print("Hello, World!")
>>> import pygame
>>> x = 5 + 3
>>> def greet(name): return f"Hello {name}"

Press Ctrl+C to interrupt execution
Press Ctrl+D to send EOF
`.trim();

        this.terminal.writeln('\r\n' + helpText);
        this.terminal.write('$ ');
    }

    showWorkingDirectory() {
        this.terminal.writeln('\r\n/projects/current');
        this.terminal.write('$ ');
    }

    listFiles() {
        const files = ['main.py', 'game.py', 'config.py', 'utils/', 'assets/'];
        this.terminal.writeln('\r\n' + files.join('  '));
        this.terminal.write('$ ');
    }

    changeDirectory(args) {
        if (args.length === 0) {
            this.terminal.writeln('\r\ncd: missing directory');
        } else {
            this.terminal.writeln(`\r\nChanged directory to /${args[0]}`);
        }
        this.terminal.write('$ ');
    }

    copySelection() {
        const selection = this.terminal.getSelection();
        if (selection) {
            navigator.clipboard.writeText(selection).then(() => {
                this.terminal.write('\r\n📋 Copied to clipboard\r\n');
            });
        }
    }

    sendInterrupt() {
        this.terminal.write('^C\r\n');
        // Handle interrupt signal
        this.terminal.write('$ ');
    }

    sendEOF() {
        this.terminal.write('^D\r\n');
        this.terminal.writeln('Use "exit" to leave the terminal');
        this.terminal.write('$ ');
    }

    handlePaste(event) {
        const pasteData = event.clipboardData.getData('text');
        this.terminal.write(pasteData);
        event.preventDefault();
    }

    resizeTerminal() {
        this.fitAddon.fit();
    }

    focusTerminal() {
        this.terminal.focus();
    }

    writeOutput(text) {
        this.terminal.write(text);
    }

    writelnOutput(text) {
        this.terminal.writeln(text);
    }

    clearCurrentLine() {
        this.terminal.write('\r\x1b[K');
    }
  }
