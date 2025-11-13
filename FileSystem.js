class FileSystem {
    constructor() {
        this.projects = new Map();
        this.currentProjectId = null;
        this.storageAdapter = new IndexedDBAdapter();
        this.init();
    }

    async init() {
        await this.storageAdapter.init();
        await this.loadProjects();
    }

    async createProject(name, template = 'empty') {
        const projectId = this.generateProjectId();
        const project = {
            id: projectId,
            name,
            createdAt: new Date(),
            updatedAt: new Date(),
            files: new Map(),
            settings: this.getDefaultSettings(),
            dependencies: []
        };

        // Add template files
        const templateFiles = this.getTemplateFiles(template);
        templateFiles.forEach(file => {
            project.files.set(file.path, file);
        });

        this.projects.set(projectId, project);
        await this.saveProject(project);
        
        return project;
    }

    getTemplateFiles(template) {
        const templates = {
            empty: [
                { path: 'main.py', content: '# Write your Python code here\nprint("Hello PyGame!")' }
            ],
            pygame: [
                { 
                    path: 'main.py', 
                    content: `import pygame
import sys

# Initialize pygame
pygame.init()

# Screen setup
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("My PyGame")

# Colors
BACKGROUND = (20, 30, 40)
PLAYER_COLOR = (65, 105, 225)

# Player
player = pygame.Rect(375, 275, 50, 50)
player_speed = 5

# Game loop
clock = pygame.time.Clock()
running = True

while running:
    # Event handling
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
    
    # Input handling
    keys = pygame.key.get_pressed()
    if keys[pygame.K_LEFT] and player.left > 0:
        player.x -= player_speed
    if keys[pygame.K_RIGHT] and player.right < WIDTH:
        player.x += player_speed
    if keys[pygame.K_UP] and player.top > 0:
        player.y -= player_speed
    if keys[pygame.K_DOWN] and player.bottom < HEIGHT:
        player.y += player_speed
    
    # Drawing
    screen.fill(BACKGROUND)
    pygame.draw.rect(screen, PLAYER_COLOR, player)
    
    # Update display
    pygame.display.flip()
    clock.tick(60)

pygame.quit()
sys.exit()`
                }
            ],
            platformer: [
                {
                    path: 'main.py',
                    content: `# Platformer game template
import pygame
import sys

class Player:
    def __init__(self, x, y):
        self.rect = pygame.Rect(x, y, 30, 50)
        self.velocity_y = 0
        self.jump_power = -15
        self.gravity = 0.8
        self.is_jumping = False
    
    def update(self, platforms):
        # Apply gravity
        self.velocity_y += self.gravity
        self.rect.y += self.velocity_y
        
        # Platform collision
        for platform in platforms:
            if self.rect.colliderect(platform):
                if self.velocity_y > 0:  # Falling
                    self.rect.bottom = platform.top
                    self.velocity_y = 0
                    self.is_jumping = False
        
    def jump(self):
        if not self.is_jumping:
            self.velocity_y = self.jump_power
            self.is_jumping = True

def main():
    pygame.init()
    screen = pygame.display.set_mode((800, 600))
    clock = pygame.time.Clock()
    
    player = Player(100, 300)
    platforms = [
        pygame.Rect(0, 550, 800, 50),
        pygame.Rect(200, 450, 200, 20),
        pygame.Rect(500, 350, 200, 20)
    ]
    
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    player.jump()
        
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            player.rect.x -= 5
        if keys[pygame.K_RIGHT]:
            player.rect.x += 5
        
        player.update(platforms)
        
        # Drawing
        screen.fill((30, 30, 50))
        for platform in platforms:
            pygame.draw.rect(screen, (100, 200, 100), platform)
        pygame.draw.rect(screen, (220, 100, 100), player.rect)
        
        pygame.display.flip()
        clock.tick(60)
    
    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()`
                }
            ]
        };

        return templates[template] || templates.empty;
    }

    async saveFile(projectId, filePath, content) {
        const project = this.projects.get(projectId);
        if (project) {
            if (!project.files.has(filePath)) {
                project.files.set(filePath, { path: filePath, content: '' });
            }
            
            const file = project.files.get(filePath);
            file.content = content;
            file.updatedAt = new Date();
            project.updatedAt = new Date();
            
            await this.saveProject(project);
            this.emit('fileSaved', { projectId, filePath, content });
        }
    }

    async deleteFile(projectId, filePath) {
        const project = this.projects.get(projectId);
        if (project && project.files.has(filePath)) {
            project.files.delete(filePath);
            project.updatedAt = new Date();
            await this.saveProject(project);
        }
    }

    getFileTree(projectId) {
        const project = this.projects.get(projectId);
        if (!project) return [];
        
        const tree = [];
        const filesByDir = new Map();
        
        // Organize files by directory
        project.files.forEach(file => {
            const pathParts = file.path.split('/');
            if (pathParts.length === 1) {
                tree.push({ ...file, type: 'file' });
            } else {
                const dir = pathParts[0];
                if (!filesByDir.has(dir)) {
                    filesByDir.set(dir, []);
                }
                filesByDir.get(dir).push({
                    ...file,
                    name: pathParts[1],
                    type: 'file'
                });
            }
        });
        
        // Add directories to tree
        filesByDir.forEach((files, dirName) => {
            tree.push({
                name: dirName,
                type: 'directory',
                children: files
            });
        });
        
        return tree;
    }

    generateProjectId() {
        return 'proj_' + Math.random().toString(36).substr(2, 9);
    }

    getDefaultSettings() {
        return {
            pythonVersion: '3.9',
            autoSave: true,
            autoSaveInterval: 30000,
            theme: 'dark',
            fontSize: 14,
            fontFamily: 'Fira Code',
            enableLinting: true,
            tabSize: 4,
            insertSpaces: true
        };
    }
}

class IndexedDBAdapter {
    constructor() {
        this.dbName = 'PyGameEditor';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create projects store
                if (!db.objectStoreNames.contains('projects')) {
                    const store = db.createObjectStore('projects', { keyPath: 'id' });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
                
                // Create user settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async saveProject(project) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readwrite');
            const store = transaction.objectStore('projects');
            
            // Convert Map to Array for storage
            const projectToSave = {
                ...project,
                files: Array.from(project.files.entries())
            };
            
            const request = store.put(projectToSave);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async loadProjects() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const request = store.getAll();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const projects = request.result.map(projectData => ({
                    ...projectData,
                    files: new Map(projectData.files)
                }));
                resolve(projects);
            };
        });
    }
              }
