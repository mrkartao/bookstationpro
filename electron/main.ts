import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { initDatabase } from './services/database.service';
import { LicenseService } from './services/license.service';
import { PrinterService } from './services/printer.service';
import { registerAuthIPC } from './ipc/auth.ipc';
import { registerProductsIPC } from './ipc/products.ipc';
import { registerSalesIPC } from './ipc/sales.ipc';
import { registerPurchasesIPC } from './ipc/purchases.ipc';
import { registerAccountingIPC } from './ipc/accounting.ipc';
import { registerReportsIPC } from './ipc/reports.ipc';
import { registerSettingsIPC } from './ipc/settings.ipc';
import { registerLicenseIPC } from './ipc/license.ipc';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

let mainWindow: BrowserWindow | null = null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

async function createWindow() {
    // Initialize database
    await initDatabase();

    // Check license status
    const licenseService = LicenseService.getInstance();
    const licenseStatus = await licenseService.validateLicense();

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        icon: path.join(__dirname, '../public/icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
        frame: true,
        titleBarStyle: 'default',
        backgroundColor: '#1a1a2e',
    });

    // Register IPC handlers
    registerAuthIPC(ipcMain);
    registerProductsIPC(ipcMain);
    registerSalesIPC(ipcMain);
    registerPurchasesIPC(ipcMain);
    registerAccountingIPC(ipcMain);
    registerReportsIPC(ipcMain);
    registerSettingsIPC(ipcMain);
    registerLicenseIPC(ipcMain, licenseService);

    // Printer IPC
    ipcMain.handle('printer:getList', async () => {
        return await PrinterService.getPrinters();
    });

    ipcMain.handle('printer:print', async (_event, options) => {
        return await PrinterService.print(options);
    });

    // Dialog IPC
    ipcMain.handle('dialog:openFile', async (_event, options) => {
        return await dialog.showOpenDialog(mainWindow!, options);
    });

    ipcMain.handle('dialog:saveFile', async (_event, options) => {
        return await dialog.showSaveDialog(mainWindow!, options);
    });

    // Send license status to renderer
    ipcMain.handle('license:getStatus', () => licenseStatus);

    if (VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
