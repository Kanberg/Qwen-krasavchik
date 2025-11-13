class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.isAuthenticated = false;
        this.authListeners = new Set();
        this.init();
    }

    async init() {
        await this.checkExistingAuth();
        this.setupAuthInterception();
    }

    async checkExistingAuth() {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user_data');
        
        if (token && userData) {
            try {
                // Verify token validity
                const isValid = await this.verifyToken(token);
                if (isValid) {
                    this.token = token;
                    this.currentUser = JSON.parse(userData);
                    this.isAuthenticated = true;
                    this.notifyAuthChange();
                } else {
                    this.clearAuth();
                }
            } catch (error) {
                console.error('Auth verification failed:', error);
                this.clearAuth();
            }
        }
    }

    setupAuthInterception() {
        // Intercept fetch requests to add auth headers
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            const headers = {
                ...options.headers,
                'Content-Type': 'application/json'
            };

            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }

            const response = await originalFetch(url, {
                ...options,
                headers
            });

            // Handle auth errors
            if (response.status === 401) {
                this.handleAuthError();
            }

            return response;
        };
    }

    async login(email, password) {
        try {
            // Simulate API call - replace with actual backend
            const response = await this.mockLoginAPI(email, password);
            
            if (response.success) {
                this.token = response.token;
                this.currentUser = response.user;
                this.isAuthenticated = true;
                
                // Persist auth data
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('user_data', JSON.stringify(this.currentUser));
                
                this.notifyAuthChange();
                return { success: true, user: this.currentUser };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signup(username, email, password) {
        try {
            // Simulate API call
            const response = await this.mockSignupAPI(username, email, password);
            
            if (response.success) {
                this.token = response.token;
                this.currentUser = response.user;
                this.isAuthenticated = true;
                
                localStorage.setItem('auth_token', this.token);
                localStorage.setItem('user_data', JSON.stringify(this.currentUser));
                
                this.notifyAuthChange();
                return { success: true, user: this.currentUser };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async logout() {
        // Call logout endpoint if available
        await this.mockLogoutAPI();
        
        this.clearAuth();
        this.notifyAuthChange();
    }

    clearAuth() {
        this.token = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('current_project');
    }

    async verifyToken(token) {
        // Simulate token verification
        return new Promise((resolve) => {
            setTimeout(() => {
                // In real app, this would validate with backend
                resolve(!!token);
            }, 100);
        });
    }

    handleAuthError() {
        this.clearAuth();
        window.dispatchEvent(new CustomEvent('auth_required'));
    }

    // Mock API methods - replace with actual backend calls
    async mockLoginAPI(email, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (email && password.length >= 6) {
                    resolve({
                        success: true,
                        token: 'mock_jwt_token_' + Math.random().toString(36),
                        user: {
                            id: 'user_' + Math.random().toString(36),
                            username: email.split('@')[0],
                            email: email,
                            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
                            joinedAt: new Date().toISOString(),
                            plan: 'free',
                            projects: []
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Invalid credentials'
                    });
                }
            }, 1500);
        });
    }

    async mockSignupAPI(username, email, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (username && email && password.length >= 6) {
                    resolve({
                        success: true,
                        token: 'mock_jwt_token_' + Math.random().toString(36),
                        user: {
                            id: 'user_' + Math.random().toString(36),
                            username: username,
                            email: email,
                            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                            joinedAt: new Date().toISOString(),
                            plan: 'free',
                            projects: []
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Registration failed'
                    });
                }
            }, 1500);
        });
    }

    async mockLogoutAPI() {
        return new Promise((resolve) => {
            setTimeout(resolve, 500);
        });
    }

    // Event system for auth state changes
    onAuthChange(callback) {
        this.authListeners.add(callback);
        return () => this.authListeners.delete(callback);
    }

    notifyAuthChange() {
        this.authListeners.forEach(callback => {
            callback({
                isAuthenticated: this.isAuthenticated,
                user: this.currentUser
            });
        });
    }

    // Social auth methods
    async socialLogin(provider) {
        const providers = {
            google: () => this.googleLogin(),
            github: () => this.githubLogin(),
            // Add more providers
        };

        if (providers[provider]) {
            return await providers[provider]();
        } else {
            throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    async googleLogin() {
        // Implement Google OAuth2 flow
        console.log('Google login flow');
        // This would redirect to Google OAuth or use popup
    }

    async githubLogin() {
        // Implement GitHub OAuth flow
        console.log('GitHub login flow');
    }
}
