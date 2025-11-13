class EditorManager {
    constructor() {
        this.editors = new Map();
        this.currentFile = null;
        this.autoSaveInterval = null;
        this.setupMonaco();
    }

    async setupMonaco() {
        await this.loadMonaco();
        this.setupGlobalKeybindings();
        this.startAutoSave();
    }

    async loadMonaco() {
        return new Promise((resolve) => {
            require.config({
                paths: { 
                    'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs',
                    'python': '/js/monaco-python'
                }
            });

            require(['vs/editor/editor.main', 'vs/language/python/monaco.contribution'], () => {
                this.setupPythonLanguageFeatures();
                resolve();
            });
        });
    }

    setupPythonLanguageFeatures() {
        monaco.languages.registerCompletionItemProvider('python', {
            provideCompletionItems: (model, position) => {
                const suggestions = this.getPythonSuggestions();
                return { suggestions };
            }
        });

        monaco.languages.registerHoverProvider('python', {
            provideHover: (model, position) => {
                return this.getPythonHover(model, position);
            }
        });
    }

    createEditor(container, filePath, content = '') {
        const editor = monaco.editor.create(container, {
            value: content,
            language: 'python',
            theme: 'vs-dark',
            fontSize: 14,
            fontFamily: 'Fira Code, Menlo, Monaco, monospace',
            lineHeight: 1.5,
            letterSpacing: 0.5,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            formatOnType: true,
            formatOnPaste: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            parameterHints: { enabled: true },
            bracketPairColorization: { enabled: true },
            guides: { 
                indentation: true,
                bracketPairs: true
            },
            smoothScrolling: true,
            mouseWheelZoom: true,
            padding: { top: 10, bottom: 10 },
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on'
        });

        // Register editor events
        this.setupEditorEvents(editor, filePath);
        this.editors.set(filePath, editor);
        
        return editor;
    }

    setupEditorEvents(editor, filePath) {
        const debouncedSave = this.debounce(() => {
            this.saveFile(filePath);
        }, 1000);

        editor.onDidChangeModelContent(debouncedSave);
        
        editor.onDidChangeCursorPosition((e) => {
            this.emit('cursorChange', {
                filePath,
                position: e.position,
                selection: editor.getSelection()
            });
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            this.saveFile(filePath);
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote, () => {
            this.emit('toggleConsole');
        });
    }

    getPythonSuggestions() {
        return [
            {
                label: 'pygame.init',
                kind: monaco.languages.CompletionItemKind.Function,
                documentation: 'Initialize all imported pygame modules',
                insertText: 'pygame.init()'
            },
            {
                label: 'pygame.display.set_mode',
                kind: monaco.languages.CompletionItemKind.Function,
                documentation: 'Initialize a window or screen for display',
                insertText: 'pygame.display.set_mode((${1:width}, ${2:height}))'
            },
            {
                label: 'game_loop',
                kind: monaco.languages.CompletionItemKind.Snippet,
                documentation: 'Standard PyGame main loop template',
                insertText: [
                    'def main():',
                    '\tpygame.init()',
                    '\tscreen = pygame.display.set_mode((800, 600))',
                    '\tclock = pygame.time.Clock()',
                    '\trunning = True',
                    '\t',
                    '\twhile running:',
                    '\t\tfor event in pygame.event.get():',
                    '\t\t\tif event.type == pygame.QUIT:',
                    '\t\t\t\trunning = False',
                    '\t\t',
                    '\t\t# Game logic here',
                    '\t\t',
                    '\t\tscreen.fill((0, 0, 0))',
                    '\t\t# Drawing code here',
                    '\t\t',
                    '\t\tpygame.display.flip()',
                    '\t\tclock.tick(60)',
                    '\t',
                    '\tpygame.quit()',
                    '',
                    'if __name__ == "__main__":',
                    '\tmain()'
                ].join('\n')
            }
        ];
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

    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.saveAll();
        }, 30000); // 30 seconds
    }

    saveFile(filePath) {
        const editor = this.editors.get(filePath);
        if (editor) {
            const content = editor.getValue();
            this.emit('fileSaved', { filePath, content });
        }
    }

    saveAll() {
        this.editors.forEach((editor, filePath) => {
            this.saveFile(filePath);
        });
    }
}
