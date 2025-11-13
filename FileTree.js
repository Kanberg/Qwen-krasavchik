// Компонент дерева файлов
class FileTree {
    constructor(container, fileSystem) {
        this.container = container;
        this.fileSystem = fileSystem;
        this.selectedFile = null;
        this.expandedFolders = new Set();
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.refresh();
    }

    async refresh() {
        const project = this.fileSystem.getCurrentProject();
        if (!project) return;

        const fileTree = this.fileSystem.getFileTree(project.id);
        this.render(fileTree);
    }

    render(fileTree) {
        this.container.innerHTML = '';
        
        const treeElement = document.createElement('div');
        treeElement.className = 'file-tree';
        
        fileTree.forEach(item => {
            const itemElement = this.createTreeItem(item);
            treeElement.appendChild(itemElement);
        });

        this.container.appendChild(treeElement);
    }

    createTreeItem(item, depth = 0) {
        const itemElement = document.createElement('div');
        itemElement.className = `tree-item tree-item-${item.type}`;
        itemElement.style.paddingLeft = `${depth * 16 + 8}px`;
        
        if (item.type === 'directory') {
            itemElement.innerHTML = this.createFolderElement(item, depth);
            this.setupFolderEvents(itemElement, item);
        } else {
            itemElement.innerHTML = this.createFileElement(item);
            this.setupFileEvents(itemElement, item);
        }

        return itemElement;
    }

    createFolderElement(folder, depth) {
        const isExpanded = this.expandedFolders.has(folder.name);
        const icon = isExpanded ? '📂' : '📁';
        
        return `
            <div class="tree-item-content" data-folder="${folder.name}">
                <span class="tree-icon">${icon}</span>
                <span class="tree-label">${folder.name}</span>
                <span class="tree-badge">${folder.children.length}</span>
            </div>
            <div class="tree-children" style="display: ${isExpanded ? 'block' : 'none'}">
                ${folder.children.map(child => 
                    this.createTreeItem(child, depth + 1).outerHTML
                ).join('')}
            </div>
        `;
    }

    createFileElement(file) {
        const icon = this.getFileIcon(file.path);
        const isSelected = this.selectedFile === file.path;
        
        return `
            <div class="tree-item-content ${isSelected ? 'selected' : ''}" data-file="${file.path}">
                <span class="tree-icon">${icon}</span>
                <span class="tree-label">${this.getFileName(file.path)}</span>
                <span class="tree-status"></span>
            </div>
        `;
    }

    setupFolderEvents(element, folder) {
        const content = element.querySelector('.tree-item-content');
        content.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFolder(folder.name, element);
        });

        // Контекстное меню для папок
        content.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showFolderContextMenu(e, folder);
        });
    }

    setupFileEvents(element, file) {
        const content = element.querySelector('.tree-item-content');
        content.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectFile(file.path, element);
        });

        content.addEventListener('dblclick', () => {
            this.openFile(file.path);
        });

        // Контекстное меню для файлов
        content.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showFileContextMenu(e, file);
        });

        // Drag and drop
        content.setAttribute('draggable', 'true');
        content.addEventListener('dragstart', (e) => {
            this.handleDragStart(e, file);
        });
    }

    toggleFolder(folderName, element) {
        if (this.expandedFolders.has(folderName)) {
            this.expandedFolders.delete(folderName);
            element.querySelector('.tree-children').style.display = 'none';
            element.querySelector('.tree-icon').textContent = '📁';
        } else {
            this.expandedFolders.add(folderName);
            element.querySelector('.tree-children').style.display = 'block';
            element.querySelector('.tree-icon').textContent = '📂';
        }
    }

    selectFile(filePath, element) {
        // Убираем выделение с предыдущего файла
        document.querySelectorAll('.tree-item-content.selected').forEach(item => {
            item.classList.remove('selected');
        });

        // Выделяем новый файл
        element.classList.add('selected');
        this.selectedFile = filePath;

        this.emit('fileSelected', { filePath });
    }

    openFile(filePath) {
        this.emit('fileOpen', { filePath });
    }

    async createNewFile(parentFolder = '') {
        const fileName = prompt('Enter file name:');
        if (!fileName) return;

        const filePath = parentFolder ? `${parentFolder}/${fileName}` : fileName;
        
        try {
            await this.fileSystem.createFile(this.fileSystem.getCurrentProject().id, filePath);
            await this.refresh();
            this.emit('fileCreated', { filePath });
        } catch (error) {
            alert('Failed to create file: ' + error.message);
        }
    }

    async createNewFolder(parentFolder = '') {
        const folderName = prompt('Enter folder name:');
        if (!folderName) return;

        const folderPath = parentFolder ? `${parentFolder}/${folderName}` : folderName;
        
        try {
            await this.fileSystem.createFolder(this.fileSystem.getCurrentProject().id, folderPath);
            await this.refresh();
            this.expandedFolders.add(folderName);
        } catch (error) {
            alert('Failed to create folder: ' + error.message);
        }
    }

    async deleteFile(filePath) {
        if (!confirm(`Delete ${filePath}?`)) return;

        try {
            await this.fileSystem.deleteFile(this.fileSystem.getCurrentProject().id, filePath);
            await this.refresh();
            this.emit('fileDeleted', { filePath });
        } catch (error) {
            alert('Failed to delete file: ' + error.message);
        }
    }

    showFileContextMenu(event, file) {
        const menu = this.createContextMenu([
            {
                label: 'Open',
                action: () => this.openFile(file.path)
            },
            {
                label: 'Rename',
                action: () => this.renameFile(file.path)
            },
            { type: 'separator' },
            {
                label: 'Delete',
                action: () => this.deleteFile(file.path),
                className: 'danger'
            }
        ]);

        this.showMenuAtPosition(menu, event.clientX, event.clientY);
    }

    showFolderContextMenu(event, folder) {
        const menu = this.createContextMenu([
            {
                label: 'New File',
                action: () => this.createNewFile(folder.name)
            },
            {
                label: 'New Folder',
                action: () => this.createNewFolder(folder.name)
            },
            { type: 'separator' },
            {
                label: 'Rename',
                action: () => this.renameFolder(folder.name)
            },
            {
                label: 'Delete',
                action: () => this.deleteFolder(folder.name),
                className: 'danger'
            }
        ]);

        this.showMenuAtPosition(menu, event.clientX, event.clientY);
    }

    createContextMenu(items) {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        
        items.forEach(item => {
            if (item.type === 'separator') {
                const separator = document.createElement('div');
                separator.className = 'menu-separator';
                menu.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = `menu-item ${item.className || ''}`;
                menuItem.textContent = item.label;
                menuItem.addEventListener('click', () => {
                    item.action();
                    this.hideContextMenu();
                });
                menu.appendChild(menuItem);
            }
        });

        return menu;
    }

    showMenuAtPosition(menu, x, y) {
        this.hideContextMenu();
        
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        document.body.appendChild(menu);

        // Закрытие меню при клике вне его
        setTimeout(() => {
            document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
        });
    }

    hideContextMenu() {
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }

    getFileIcon(filePath) {
        const extension = filePath.split('.').pop();
        const iconMap = {
            'py': '🐍',
            'js': '📜',
            'html': '🌐',
            'css': '🎨',
            'json': '📋',
            'md': '📝',
            'txt': '📄',
            'png': '🖼️',
            'jpg': '🖼️',
            'gif': '🖼️',
            'mp3': '🎵',
            'wav': '🎵'
        };
        return iconMap[extension] || '📄';
    }

    getFileName(path) {
        return path.split('/').pop();
    }

    handleDragStart(event, file) {
        event.dataTransfer.setData('application/json', JSON.stringify({
            type: 'file',
            path: file.path,
            source: 'file-tree'
        }));
    }
}

// Миксин для EventEmitter
Object.assign(FileTree.prototype, EventEmitter.prototype);
