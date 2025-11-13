class ProjectManager {
    constructor() {
        this.currentProject = null;
        this.projects = new Map();
        this.collaborators = new Map();
        this.realtimeManager = new RealtimeManager();
        this.init();
    }

    async init() {
        await this.loadProjects();
        this.setupRealtimeUpdates();
    }

    async createProject(name, description = '', template = 'pygame', isPublic = false) {
        const projectId = this.generateProjectId();
        const project = {
            id: projectId,
            name,
            description,
            template,
            isPublic,
            owner: window.authManager?.currentUser?.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            files: new Map(),
            settings: this.getProjectSettings(template),
            dependencies: this.getTemplateDependencies(template),
            collaborators: [],
            lastActive: new Date(),
            stats: {
                runs: 0,
                errors: 0,
                playtime: 0
            }
        };

        // Initialize with template files
        const templateFiles = this.getTemplateFiles(template);
        templateFiles.forEach(file => {
            project.files.set(file.path, {
                ...file,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastModifiedBy: window.authManager?.currentUser?.id
            });
        });

        this.projects.set(projectId, project);
        this.currentProject = project;

        await this.saveProject(project);
        this.emit('projectCreated', project);
        
        return project;
    }

    async loadProject(projectId) {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project ${projectId} not found`);
        }

        this.currentProject = project;
        project.lastActive = new Date();
        
        await this.saveProject(project);
        this.emit('projectLoaded', project);
        
        return project;
    }

    async saveProject(project = this.currentProject) {
        if (!project) return;

        project.updatedAt = new Date();
        
        // Save to localStorage (in real app, this would be API call)
        const projectsData = JSON.parse(localStorage.getItem('user_projects') || '{}');
        projectsData[project.id] = this.serializeProject(project);
        localStorage.setItem('user_projects', JSON.stringify(projectsData));

        // Sync with realtime backend if collaborative
        if (project.collaborators.length > 0) {
            await this.realtimeManager.syncProject(project);
        }

        this.emit('projectSaved', project);
    }

    serializeProject(project) {
        return {
            ...project,
            files: Array.from(project.files.entries()),
            collaborators: Array.from(project.collaborators)
        };
    }

    deserializeProject(projectData) {
        return {
            ...projectData,
            files: new Map(projectData.files),
            collaborators: new Set(projectData.collaborators)
        };
    }

    async loadProjects() {
        try {
            const projectsData = JSON.parse(localStorage.getItem('user_projects') || '{}');
            
            Object.entries(projectsData).forEach(([id, projectData]) => {
                this.projects.set(id, this.deserializeProject(projectData));
            });

            this.emit('projectsLoaded', Array.from(this.projects.values()));
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    }

    getTemplateFiles(template) {
        const templates = {
            pygame: [
                {
                    path: 'main.py',
                    content: `import pygame
import sys
import math

# Initialize Pygame
pygame.init()

# Constants
WIDTH, HEIGHT = 800, 600
FPS = 60
BACKGROUND = (20, 25, 45)
PLAYER_COLOR = (65, 105, 225)
PARTICLE_COLOR = (255, 215, 0)

class Player:
    def __init__(self):
        self.radius = 20
        self.x = WIDTH // 2
        self.y = HEIGHT // 2
        self.speed = 5
        self.trail = []
        self.trail_length = 15
    
    def update(self, keys):
        # Movement with boundary checking
        if keys[pygame.K_LEFT] and self.x - self.radius > 0:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] and self.x + self.radius < WIDTH:
            self.x += self.speed
        if keys[pygame.K_UP] and self.y - self.radius > 0:
            self.y -= self.speed
        if keys[pygame.K_DOWN] and self.y + self.radius < HEIGHT:
            self.y += self.speed
        
        # Add current position to trail
        self.trail.append((self.x, self.y))
        if len(self.trail) > self.trail_length:
            self.trail.pop(0)
    
    def draw(self, screen):
        # Draw trail
        for i, (trail_x, trail_y) in enumerate(self.trail):
            alpha = i / len(self.trail)
            radius = self.radius * alpha
            color = (
                int(PLAYER_COLOR[0] * alpha),
                int(PLAYER_COLOR[1] * alpha),
                int(PLAYER_COLOR[2] * alpha)
            )
            pygame.draw.circle(screen, color, (int(trail_x), int(trail_y)), int(radius))
        
        # Draw player
        pygame.draw.circle(screen, PLAYER_COLOR, (self.x, self.y), self.radius)
        pygame.draw.circle(screen, (255, 255, 255), (self.x, self.y), self.radius - 8)

def main():
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Advanced PyGame Template")
    clock = pygame.time.Clock()
    
    player = Player()
    particles = []
    running = True
    
    while running:
        # Event handling
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_SPACE:
                    # Create particles on space press
                    for _ in range(10):
                        particles.append({
                            'x': player.x,
                            'y': player.y,
                            'vx': (math.random() - 0.5) * 10,
                            'vy': (math.random() - 0.5) * 10,
                            'life': 30
                        })
        
        # Input handling
        keys = pygame.key.get_pressed()
        player.update(keys)
        
        # Update particles
        for particle in particles[:]:
            particle['x'] += particle['vx']
            particle['y'] += particle['vy']
            particle['life'] -= 1
            particle['vy'] += 0.2  # Gravity
            
            if particle['life'] <= 0:
                particles.remove(particle)
        
        # Drawing
        screen.fill(BACKGROUND)
        
        # Draw particles
        for particle in particles:
            alpha = particle['life'] / 30
            color = (
                int(PARTICLE_COLOR[0] * alpha),
                int(PARTICLE_COLOR[1] * alpha),
                int(PARTICLE_COLOR[2] * alpha)
            )
            pygame.draw.circle(
                screen, 
                color, 
                (int(particle['x']), int(particle['y'])), 
                3
            )
        
        player.draw(screen)
        
        # Update display
        pygame.display.flip()
        clock.tick(FPS)
    
    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()`
                },
                {
                    path: 'config.py',
                    content: `# Game Configuration

# Display settings
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60
FULLSCREEN = False

# Colors
BACKGROUND_COLOR = (20, 25, 45)
PLAYER_COLOR = (65, 105, 225)
ENEMY_COLOR = (220, 60, 60)
PARTICLE_COLOR = (255, 215, 0)
TEXT_COLOR = (240, 240, 240)

# Game settings
GRAVITY = 0.8
PLAYER_SPEED = 5
PLAYER_JUMP = -15
ENEMY_SPEED = 2

# Debug
DEBUG_MODE = True
SHOW_FPS = True`
                },
                {
                    path: 'utils/helpers.py',
                    content: `# Utility functions
import pygame
import math

def load_image(path, scale=1.0):
    """Load and scale an image"""
    try:
        image = pygame.image.load(path)
        if scale != 1.0:
            new_size = (int(image.get_width() * scale), 
                       int(image.get_height() * scale))
            image = pygame.transform.scale(image, new_size)
        return image.convert_alpha()
    except pygame.error as e:
        print(f"Could not load image: {path}")
        print(e)
        return None

def draw_text(surface, text, size, x, y, color=(255, 255, 255)):
    """Draw text on surface"""
    font = pygame.font.Font(None, size)
    text_surface = font.render(text, True, color)
    text_rect = text_surface.get_rect()
    text_rect.midtop = (x, y)
    surface.blit(text_surface, text_rect)

def distance(p1, p2):
    """Calculate distance between two points"""
    return math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)

def clamp(value, min_val, max_val):
    """Clamp value between min and max"""
    return max(min_val, min(value, max_val))`
                }
            ],
            empty: [
                {
                    path: 'main.py',
                    content: '# Welcome to PyGame Editor!\n\nprint("Hello, World!")'
                }
            ]
        };

        return templates[template] || templates.empty;
    }

    getProjectSettings(template) {
        const baseSettings = {
            pythonVersion: '3.9',
            autoSave: true,
            autoSaveInterval: 30000,
            linting: {
                enabled: true,
                strict: false
            },
            execution: {
                headless: false,
                virtualDisplay: true
            },
            collaboration: {
                liveShare: false,
                cursorSharing: true
            }
        };

        const templateSettings = {
            pygame: {
                ...baseSettings,
                execution: {
                    ...baseSettings.execution,
                    pygameHeadless: true
                }
            },
            empty: baseSettings
        };

        return templateSettings[template] || baseSettings;
    }

    getTemplateDependencies(template) {
        const dependencies = {
            pygame: ['pygame', 'numpy'],
            empty: []
        };

        return dependencies[template] || [];
    }

    generateProjectId() {
        return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    setupRealtimeUpdates() {
        // Setup realtime collaboration features
        this.realtimeManager.on('fileChanged', (data) => {
            this.handleRemoteFileChange(data);
        });

        this.realtimeManager.on('cursorMoved', (data) => {
            this.handleRemoteCursorMove(data);
        });
    }

    async addCollaborator(projectId, email, role = 'editor') {
        const project = this.projects.get(projectId);
        if (!project) throw new Error('Project not found');

        const collaborator = {
            email,
            role,
            joinedAt: new Date(),
            permissions: this.getRolePermissions(role)
        };

        project.collaborators.push(collaborator);
        await this.saveProject(project);

        // Notify collaborator via realtime system
        await this.realtimeManager.inviteCollaborator(projectId, email, role);

        this.emit('collaboratorAdded', { projectId, collaborator });
    }

    getRolePermissions(role) {
        const roles = {
            viewer: ['read'],
            editor: ['read', 'write', 'comment'],
            admin: ['read', 'write', 'comment', 'manage', 'invite']
        };

        return roles[role] || roles.viewer;
    }
}

class RealtimeManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.listeners = new Map();
    }

    async connect() {
        // Simulate WebSocket connection
        return new Promise((resolve) => {
            setTimeout(() => {
                this.connected = true;
                this.setupSocketHandlers();
                resolve();
            }, 1000);
        });
    }

    setupSocketHandlers() {
        // Simulate realtime event handlers
        this.socket = {
            send: (data) => {
                console.log('Realtime send:', data);
            },
            close: () => {
                this.connected = false;
            }
        };
    }

    async syncProject(project) {
        if (!this.connected) await this.connect();
        
        this.socket.send({
            type: 'PROJECT_SYNC',
            projectId: project.id,
            data: project
        });
    }

    async inviteCollaborator(projectId, email, role) {
        if (!this.connected) await this.connect();

        this.socket.send({
            type: 'INVITE_COLLABORATOR',
            projectId,
            email,
            role
        });
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }
                                                 }
