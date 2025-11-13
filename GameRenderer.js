// Плагин для рендеринга игр
class GameRenderer {
    constructor(container) {
        this.container = container;
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.gameLoop = null;
        this.fps = 60;
        this.stats = {
            frames: 0,
            startTime: 0,
            fps: 0
        };
        this.init();
    }

    init() {
        this.createCanvas();
        this.setupEventListeners();
        this.startStatsMonitoring();
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.className = 'game-canvas';
        
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);
    }

    setupEventListeners() {
        // Обработка событий клавиатуры
        document.addEventListener('keydown', (e) => {
            this.emit('keydown', { event: e, key: e.key, code: e.code });
        });

        document.addEventListener('keyup', (e) => {
            this.emit('keyup', { event: e, key: e.key, code: e.code });
        });

        // Обработка событий мыши
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.emit('mousedown', {
                event: e,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                button: e.button
            });
        });

        this.canvas.addEventListener('mouseup', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.emit('mouseup', {
                event: e,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                button: e.button
            });
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.emit('mousemove', {
                event: e,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        });

        // Обработка касаний для мобильных устройств
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.emit('touchstart', {
                event: e,
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            });
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.emit('touchmove', {
                event: e,
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            });
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.emit('touchend', { event: e });
        });
    }

    // Основные методы рендеринга
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.stats.startTime = performance.now();
        this.stats.frames = 0;
        
        this.gameLoop = setInterval(() => {
            this.update();
            this.render();
        }, 1000 / this.fps);
        
        this.emit('gameStarted');
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        clearInterval(this.gameLoop);
        this.gameLoop = null;
        
        this.emit('gameStopped');
    }

    update() {
        // Вызывается каждый кадр для обновления состояния игры
        this.emit('update');
    }

    render() {
        // Очистка canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Вызов пользовательского рендеринга
        this.emit('render', { ctx: this.ctx, canvas: this.canvas });
        
        // Статистика FPS
        this.stats.frames++;
    }

    // Вспомогательные методы рендеринга
    clear(color = '#000000') {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawRect(x, y, width, height, color = '#ffffff') {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }

    drawCircle(x, y, radius, color = '#ffffff') {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawText(text, x, y, color = '#ffffff', font = '16px Arial') {
        this.ctx.fillStyle = color;
        this.ctx.font = font;
        this.ctx.fillText(text, x, y);
    }

    drawImage(image, x, y, width, height) {
        if (image.complete) {
            this.ctx.drawImage(image, x, y, width, height);
        }
    }

    drawSprite(sprite, x, y, frame = 0) {
        if (sprite && sprite.frames) {
            const frameData = sprite.frames[frame];
            if (frameData) {
                this.ctx.drawImage(
                    sprite.image,
                    frameData.x, frameData.y, frameData.width, frameData.height,
                    x, y, frameData.width, frameData.height
                );
            }
        }
    }

    // Управление размерами canvas
    setSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.emit('resize', { width, height });
    }

    getSize() {
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    setFullscreen() {
        if (this.canvas.requestFullscreen) {
            this.canvas.requestFullscreen();
        } else if (this.canvas.webkitRequestFullscreen) {
            this.canvas.webkitRequestFullscreen();
        }
    }

    // Анимации и эффекты
    createParticleSystem(config) {
        return new ParticleSystem(this.ctx, config);
    }

    createAnimation(frames, fps) {
        return new Animation(frames, fps);
    }

    // Статистика и мониторинг
    startStatsMonitoring() {
        setInterval(() => {
            const now = performance.now();
            const elapsed = (now - this.stats.startTime) / 1000;
            this.stats.fps = Math.round(this.stats.frames / elapsed);
            
            this.stats.frames = 0;
            this.stats.startTime = now;
            
            this.emit('stats', { fps: this.stats.fps });
        }, 1000);
    }

    getStats() {
        return {
            fps: this.stats.fps,
            isRunning: this.isRunning,
            canvasSize: this.getSize()
        };
    }

    // Интеграция с PyGame
    setupPyGameBridge() {
        // Мост между PyGame и нашим рендерером
        window.pygameBridge = {
            drawRect: (x, y, w, h, color) => this.drawRect(x, y, w, h, color),
            drawCircle: (x, y, r, color) => this.drawCircle(x, y, r, color),
            drawText: (text, x, y, color, size) => this.drawText(text, x, y, color, `${size}px Arial`),
            clear: (color) => this.clear(color),
            getSize: () => this.getSize(),
            setSize: (w, h) => this.setSize(w, h)
        };
    }

    // Снимки экрана
    takeScreenshot(format = 'image/png', quality = 0.8) {
        return new Promise((resolve) => {
            this.canvas.toBlob((blob) => {
                resolve(blob);
            }, format, quality);
        });
    }

    downloadScreenshot(filename = 'screenshot.png') {
        this.takeScreenshot().then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // Захват видео (экспорт gameplay)
    startRecording() {
        // Реализация захвата видео с canvas
        console.log('Video recording started');
    }

    stopRecording() {
        console.log('Video recording stopped');
    }
}

// Система частиц
class ParticleSystem {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.particles = [];
        this.config = {
            count: 100,
            life: 100,
            size: 2,
            color: '#ffffff',
            ...config
        };
    }

    emit(x, y) {
        for (let i = 0; i < this.config.count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: this.config.life,
                size: this.config.size,
                color: this.config.color
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    render() {
        this.particles.forEach(particle => {
            const alpha = particle.life / this.config.life;
            this.ctx.fillStyle = particle.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
            this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        });
    }
}

// Система анимации
class Animation {
    constructor(frames, fps) {
        this.frames = frames;
        this.fps = fps;
        this.currentFrame = 0;
        this.lastUpdate = 0;
        this.isPlaying = false;
    }

    play() {
        this.isPlaying = true;
    }

    stop() {
        this.isPlaying = false;
    }

    update(time) {
        if (!this.isPlaying) return;
        
        if (time - this.lastUpdate > 1000 / this.fps) {
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
            this.lastUpdate = time;
        }
    }

    getCurrentFrame() {
        return this.frames[this.currentFrame];
    }

    reset() {
        this.currentFrame = 0;
        this.lastUpdate = 0;
    }
}

Object.assign(GameRenderer.prototype, EventEmitter.prototype);
