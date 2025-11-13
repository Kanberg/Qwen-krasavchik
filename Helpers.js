// Утилиты и вспомогательные функции
class Helpers {
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static generateId(length = 8) {
        return Math.random().toString(36).substring(2, 2 + length);
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (obj instanceof Object) {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    static async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    static getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    }

    static getFileNameWithoutExtension(filename) {
        return filename.replace(/\.[^/.]+$/, "");
    }

    static isImageFile(filename) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        const ext = this.getFileExtension(filename).toLowerCase();
        return imageExtensions.includes(ext);
    }

    static isCodeFile(filename) {
        const codeExtensions = ['py', 'js', 'html', 'css', 'json', 'md', 'txt'];
        const ext = this.getFileExtension(filename).toLowerCase();
        return codeExtensions.includes(ext);
    }

    static async loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    static async fetchWithTimeout(url, options = {}, timeout = 5000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    static createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.substring(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
        
        return element;
    }

    static showNotification(message, type = 'info', duration = 3000) {
        const notification = this.createElement('div', {
            className: `notification notification-${type}`
        }, [message]);
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
        
        return notification;
    }

    static formatPythonCode(code) {
        // Простой форматировщик Python кода
        return code
            .replace(/\t/g, '    ') // Заменяем табы на 4 пробела
            .replace(/\n\s*\n\s*\n/g, '\n\n') // Убираем лишние пустые строки
            .trim() + '\n'; // Добавляем финальный перенос строки
    }

    static detectCodeIssues(code, language = 'python') {
        const issues = [];
        
        if (language === 'python') {
            // Проверка на отсутствие pygame.init()
            if (code.includes('pygame.') && !code.includes('pygame.init()')) {
                issues.push({
                    type: 'warning',
                    message: 'Pygame used but not initialized',
                    line: this.findLineNumber(code, 'pygame.')
                });
            }
            
            // Проверка на бесконечные циклы без break
            if (code.includes('while True:') && !code.includes('break')) {
                issues.push({
                    type: 'warning', 
                    message: 'Potential infinite loop - consider adding break condition',
                    line: this.findLineNumber(code, 'while True:')
                });
            }
        }
        
        return issues;
    }

    static findLineNumber(code, searchText) {
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(searchText)) {
                return i + 1;
            }
        }
        return -1;
    }

    static calculateCodeMetrics(code) {
        const lines = code.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        
        return {
            totalLines: lines.length,
            codeLines: nonEmptyLines.length,
            emptyLines: lines.length - nonEmptyLines.length,
            characters: code.length,
            complexity: this.calculateComplexity(code)
        };
    }

    static calculateComplexity(code) {
        // Простая метрика сложности кода
        let complexity = 0;
        const complexityKeywords = ['if ', 'for ', 'while ', 'def ', 'class ', 'try:', 'except '];
        
        complexityKeywords.forEach(keyword => {
            const matches = code.match(new RegExp(keyword, 'g'));
            if (matches) complexity += matches.length;
        });
        
        return complexity;
    }

    static async compressImage(file, maxWidth = 800, quality = 0.8) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob(resolve, 'image/jpeg', quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    static createColorPalette(baseColor, count = 5) {
        const palette = [];
        const base = this.hexToRgb(baseColor);
        
        for (let i = 0; i < count; i++) {
            const factor = (i / (count - 1)) * 2 - 1; // -1 to 1
            const r = Math.min(255, Math.max(0, base.r + factor * 50));
            const g = Math.min(255, Math.max(0, base.g + factor * 50));
            const b = Math.min(255, Math.max(0, base.b + factor * 50));
            
            palette.push(this.rgbToHex(r, g, b));
        }
        
        return palette;
    }

    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    static rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
}

// Экспортируем утилиты в глобальную область видимости
window.Helpers = Helpers;
