import { create } from 'zustand';

interface User {
    id: number;
    username: string;
    role: 'admin' | 'user';
    fullName: string;
    fullNameAr?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
            const result = await window.electronAPI.auth.login(username, password);

            if (result.success) {
                set({
                    user: result.user,
                    token: result.token,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                });

                // Store token in localStorage for persistence
                localStorage.setItem('auth_token', result.token);
                localStorage.setItem('auth_user', JSON.stringify(result.user));

                return true;
            } else {
                set({
                    isLoading: false,
                    error: result.error || 'Login failed',
                });
                return false;
            }
        } catch (error) {
            set({
                isLoading: false,
                error: 'Connection error',
            });
            return false;
        }
    },

    logout: async () => {
        try {
            await window.electronAPI.auth.logout();
        } catch (e) {
            // Ignore logout errors
        }

        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');

        set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
        });
    },

    checkAuth: async () => {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                set({
                    user,
                    token,
                    isAuthenticated: true,
                });
            } catch {
                // Invalid stored data, clear it
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
            }
        }
    },

    clearError: () => {
        set({ error: null });
    },
}));
