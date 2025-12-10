import { IpcMain } from 'electron';
import { getSqliteDb } from '../services/database.service';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

interface UserData {
    username: string;
    password: string;
    role: 'admin' | 'user';
    fullName: string;
    fullNameAr?: string;
}

export function registerAuthIPC(ipcMain: IpcMain): void {
    // Login
    ipcMain.handle('auth:login', async (_event, username: string, password: string) => {
        try {
            const db = getSqliteDb();

            const user = db.prepare(`
        SELECT id, username, password_hash, role, full_name, full_name_ar, is_active
        FROM users
        WHERE username = ?
      `).get(username) as {
                id: number;
                username: string;
                password_hash: string;
                role: string;
                full_name: string;
                full_name_ar: string;
                is_active: number;
            } | undefined;

            if (!user) {
                return { success: false, error: 'Utilisateur non trouvé' };
            }

            if (!user.is_active) {
                return { success: false, error: 'Compte désactivé' };
            }

            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if (!isPasswordValid) {
                return { success: false, error: 'Mot de passe incorrect' };
            }

            // Update last login
            db.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').run(user.id);

            // Generate session token
            const token = uuidv4();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

            db.prepare(`
        INSERT INTO sessions (user_id, token, expires_at)
        VALUES (?, ?, ?)
      `).run(user.id, token, expiresAt.toISOString());

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    fullName: user.full_name,
                    fullNameAr: user.full_name_ar,
                },
                token,
            };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Erreur de connexion' };
        }
    });

    // Logout
    ipcMain.handle('auth:logout', async (_event) => {
        try {
            // In a real app, we would invalidate the session token here
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Get current user
    ipcMain.handle('auth:getCurrentUser', async (_event) => {
        // This would typically validate the session token
        return null;
    });

    // Create user
    ipcMain.handle('auth:createUser', async (_event, userData: UserData) => {
        try {
            const db = getSqliteDb();

            // Check if username exists
            const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(userData.username);
            if (existing) {
                return { success: false, error: 'Ce nom d\'utilisateur existe déjà' };
            }

            // Hash password
            const passwordHash = await bcrypt.hash(userData.password, 12);

            const result = db.prepare(`
        INSERT INTO users (username, password_hash, role, full_name, full_name_ar)
        VALUES (?, ?, ?, ?, ?)
      `).run(
                userData.username,
                passwordHash,
                userData.role,
                userData.fullName,
                userData.fullNameAr || null
            );

            return {
                success: true,
                userId: result.lastInsertRowid,
            };
        } catch (error) {
            console.error('Create user error:', error);
            return { success: false, error: 'Erreur lors de la création de l\'utilisateur' };
        }
    });

    // Update user
    ipcMain.handle('auth:updateUser', async (_event, id: number, userData: Partial<UserData>) => {
        try {
            const db = getSqliteDb();

            const updates: string[] = [];
            const values: any[] = [];

            if (userData.fullName) {
                updates.push('full_name = ?');
                values.push(userData.fullName);
            }

            if (userData.fullNameAr !== undefined) {
                updates.push('full_name_ar = ?');
                values.push(userData.fullNameAr);
            }

            if (userData.role) {
                updates.push('role = ?');
                values.push(userData.role);
            }

            if (userData.password) {
                const passwordHash = await bcrypt.hash(userData.password, 12);
                updates.push('password_hash = ?');
                values.push(passwordHash);
            }

            updates.push('updated_at = datetime("now")');
            values.push(id);

            db.prepare(`
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);

            return { success: true };
        } catch (error) {
            console.error('Update user error:', error);
            return { success: false, error: 'Erreur lors de la mise à jour' };
        }
    });

    // Delete user
    ipcMain.handle('auth:deleteUser', async (_event, id: number) => {
        try {
            const db = getSqliteDb();

            // Don't delete, just deactivate
            db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);

            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Get all users
    ipcMain.handle('auth:getUsers', async () => {
        try {
            const db = getSqliteDb();

            const users = db.prepare(`
        SELECT id, username, role, full_name, full_name_ar, is_active, created_at, last_login
        FROM users
        ORDER BY created_at DESC
      `).all();

            return { success: true, users };
        } catch (error) {
            return { success: false, error: (error as Error).message, users: [] };
        }
    });

    // Change password
    ipcMain.handle('auth:changePassword', async (_event, userId: number, oldPassword: string, newPassword: string) => {
        try {
            const db = getSqliteDb();

            const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as { password_hash: string } | undefined;

            if (!user) {
                return { success: false, error: 'Utilisateur non trouvé' };
            }

            const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
            if (!isOldPasswordValid) {
                return { success: false, error: 'Ancien mot de passe incorrect' };
            }

            const newPasswordHash = await bcrypt.hash(newPassword, 12);
            db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').run(newPasswordHash, userId);

            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });
}
