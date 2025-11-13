// Утилита для работы с событиями
class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    on(event, listener) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(listener);
        return this;
    }

    off(event, listener) {
        if (this.events.has(event)) {
            this.events.get(event).delete(listener);
        }
        return this;
    }

    emit(event, ...args) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(listener => {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
        return this;
    }

    once(event, listener) {
        const onceWrapper = (...args) => {
            this.off(event, onceWrapper);
            listener(...args);
        };
        return this.on(event, onceWrapper);
    }

    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
        return this;
    }

    listenerCount(event) {
        return this.events.has(event) ? this.events.get(event).size : 0;
    }

    eventNames() {
        return Array.from(this.events.keys());
    }
}

// Глобальная шина событий для всего приложения
window.eventBus = new EventEmitter();
