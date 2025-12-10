import NodeRSA from 'node-rsa';
import { machineId } from 'node-machine-id';
import { createHash } from 'crypto';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { networkInterfaces } from 'os';

export interface LicenseRequest {
    macHash: string;
    deviceId: string;
    customerName: string;
    requestDate: string;
    appVersion: string;
}

export interface License {
    customerId: string;
    customerName: string;
    macHash: string;
    deviceId: string;
    features: string[];
    issueDate: string;
    expiresAt?: string;
    signature: string;
}

export interface LicenseStatus {
    isValid: boolean;
    isTrial: boolean;
    customerName?: string;
    features: string[];
    expiresAt?: string;
    daysRemaining?: number;
    error?: string;
}

export class LicenseService {
    private static instance: LicenseService;
    private publicKey: NodeRSA | null = null;
    private license: License | null = null;
    private licenseStatus: LicenseStatus;

    private constructor() {
        this.licenseStatus = {
            isValid: false,
            isTrial: true,
            features: [],
        };
        this.loadPublicKey();
    }

    public static getInstance(): LicenseService {
        if (!LicenseService.instance) {
            LicenseService.instance = new LicenseService();
        }
        return LicenseService.instance;
    }

    private loadPublicKey(): void {
        try {
            // In production, the public key is bundled with the app
            const publicKeyPath = app.isPackaged
                ? path.join(process.resourcesPath, 'public-key.pem')
                : path.join(__dirname, '../../public/public-key.pem');

            if (fs.existsSync(publicKeyPath)) {
                const keyData = fs.readFileSync(publicKeyPath, 'utf8');
                this.publicKey = new NodeRSA(keyData);
            } else {
                console.warn('Public key not found, license validation will fail');
            }
        } catch (error) {
            console.error('Failed to load public key:', error);
        }
    }

    private getLicensePath(): string {
        const userDataPath = app.getPath('userData');
        return path.join(userDataPath, 'license.json');
    }

    public getMacAddress(): string {
        const interfaces = networkInterfaces();

        for (const name of Object.keys(interfaces)) {
            const iface = interfaces[name];
            if (!iface) continue;

            for (const info of iface) {
                // Skip internal and non-IPv4 interfaces
                if (info.internal || info.family !== 'IPv4') continue;

                // Return the first valid MAC address
                if (info.mac && info.mac !== '00:00:00:00:00:00') {
                    return info.mac;
                }
            }
        }

        return 'unknown';
    }

    public getMacHash(): string {
        const mac = this.getMacAddress();
        return createHash('sha256').update(mac).digest('hex');
    }

    public async getDeviceId(): Promise<string> {
        try {
            return await machineId();
        } catch {
            return 'unknown-device';
        }
    }

    public async getMachineInfo(): Promise<{ macHash: string; deviceId: string; macAddress: string }> {
        const deviceId = await this.getDeviceId();
        return {
            macAddress: this.getMacAddress(),
            macHash: this.getMacHash(),
            deviceId,
        };
    }

    public async generateLicenseRequest(customerName: string): Promise<LicenseRequest> {
        const deviceId = await this.getDeviceId();

        return {
            macHash: this.getMacHash(),
            deviceId,
            customerName,
            requestDate: new Date().toISOString(),
            appVersion: app.getVersion(),
        };
    }

    public async validateLicense(): Promise<LicenseStatus> {
        try {
            const licensePath = this.getLicensePath();

            // Check if license file exists
            if (!fs.existsSync(licensePath)) {
                this.licenseStatus = {
                    isValid: false,
                    isTrial: true,
                    features: ['basic'],
                    error: 'No license file found',
                };
                return this.licenseStatus;
            }

            // Read and parse license
            const licenseData = fs.readFileSync(licensePath, 'utf8');
            this.license = JSON.parse(licenseData) as License;

            // Validate MAC hash
            const currentMacHash = this.getMacHash();
            if (this.license.macHash !== currentMacHash) {
                this.licenseStatus = {
                    isValid: false,
                    isTrial: true,
                    features: ['basic'],
                    error: 'License is not valid for this machine',
                };
                return this.licenseStatus;
            }

            // Validate device ID
            const currentDeviceId = await this.getDeviceId();
            if (this.license.deviceId !== currentDeviceId) {
                this.licenseStatus = {
                    isValid: false,
                    isTrial: true,
                    features: ['basic'],
                    error: 'License is not valid for this device',
                };
                return this.licenseStatus;
            }

            // Verify RSA signature
            if (this.publicKey) {
                const dataToVerify = JSON.stringify({
                    customerId: this.license.customerId,
                    customerName: this.license.customerName,
                    macHash: this.license.macHash,
                    deviceId: this.license.deviceId,
                    features: this.license.features,
                    issueDate: this.license.issueDate,
                    expiresAt: this.license.expiresAt,
                });

                const isSignatureValid = this.publicKey.verify(
                    Buffer.from(dataToVerify),
                    Buffer.from(this.license.signature, 'base64')
                );

                if (!isSignatureValid) {
                    this.licenseStatus = {
                        isValid: false,
                        isTrial: true,
                        features: ['basic'],
                        error: 'Invalid license signature',
                    };
                    return this.licenseStatus;
                }
            }

            // Check expiry
            if (this.license.expiresAt) {
                const expiryDate = new Date(this.license.expiresAt);
                const now = new Date();

                if (now > expiryDate) {
                    this.licenseStatus = {
                        isValid: false,
                        isTrial: true,
                        features: ['basic'],
                        expiresAt: this.license.expiresAt,
                        error: 'License has expired',
                    };
                    return this.licenseStatus;
                }

                const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                this.licenseStatus = {
                    isValid: true,
                    isTrial: false,
                    customerName: this.license.customerName,
                    features: this.license.features,
                    expiresAt: this.license.expiresAt,
                    daysRemaining,
                };
            } else {
                // Perpetual license
                this.licenseStatus = {
                    isValid: true,
                    isTrial: false,
                    customerName: this.license.customerName,
                    features: this.license.features,
                };
            }

            return this.licenseStatus;
        } catch (error) {
            console.error('License validation error:', error);
            this.licenseStatus = {
                isValid: false,
                isTrial: true,
                features: ['basic'],
                error: 'Failed to validate license',
            };
            return this.licenseStatus;
        }
    }

    public async activateLicense(licenseData: string): Promise<LicenseStatus> {
        try {
            // Parse the license data
            const license = JSON.parse(licenseData) as License;

            // Temporarily store for validation
            const licensePath = this.getLicensePath();
            fs.writeFileSync(licensePath, licenseData, 'utf8');

            // Validate the new license
            const status = await this.validateLicense();

            if (!status.isValid) {
                // Remove invalid license
                fs.unlinkSync(licensePath);
            }

            return status;
        } catch (error) {
            console.error('License activation error:', error);
            return {
                isValid: false,
                isTrial: true,
                features: ['basic'],
                error: 'Failed to activate license: ' + (error as Error).message,
            };
        }
    }

    public getLicenseStatus(): LicenseStatus {
        return this.licenseStatus;
    }

    public hasFeature(feature: string): boolean {
        return this.licenseStatus.features.includes(feature) ||
            this.licenseStatus.features.includes('all');
    }
}
