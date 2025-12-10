import { IpcMain } from 'electron';
import { LicenseService } from '../services/license.service';

export function registerLicenseIPC(ipcMain: IpcMain, licenseService: LicenseService): void {
    // Get license status
    ipcMain.handle('license:getStatus', async () => {
        return licenseService.getLicenseStatus();
    });

    // Get machine info for license request
    ipcMain.handle('license:getMachineInfo', async () => {
        try {
            const machineInfo = await licenseService.getMachineInfo();
            return { success: true, ...machineInfo };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Generate license request file
    ipcMain.handle('license:generateRequest', async (_event, customerName: string) => {
        try {
            const request = await licenseService.generateLicenseRequest(customerName);
            return { success: true, request };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Activate license
    ipcMain.handle('license:activate', async (_event, licenseData: string) => {
        try {
            const status = await licenseService.activateLicense(licenseData);
            return { success: status.isValid, status };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });
}
