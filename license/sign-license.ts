/**
 * License Signing Tool
 * Run with: npx tsx license/sign-license.ts <request-file.json>
 * 
 * This tool signs a license request file with the private key.
 * The output is a license file that can be distributed to the customer.
 */

import NodeRSA from 'node-rsa';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface LicenseRequest {
    macHash: string;
    deviceId: string;
    customerName: string;
    requestDate: string;
    appVersion?: string;
}

interface License {
    customerId: string;
    customerName: string;
    macHash: string;
    deviceId: string;
    features: string[];
    issueDate: string;
    expiresAt?: string;
    signature: string;
}

function signLicense() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.log('Usage: npx tsx license/sign-license.ts <request-file.json> [--expires <days>] [--features <feature1,feature2>]');
        console.log('\nExample:');
        console.log('  npx tsx license/sign-license.ts customer-request.json --expires 365 --features all');
        process.exit(1);
    }

    const requestFile = args[0];
    let expirationDays: number | null = null;
    let features: string[] = ['all'];

    // Parse optional arguments
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--expires' && args[i + 1]) {
            expirationDays = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--features' && args[i + 1]) {
            features = args[i + 1].split(',');
            i++;
        }
    }

    // Read request file
    if (!fs.existsSync(requestFile)) {
        console.error(`❌ Request file not found: ${requestFile}`);
        process.exit(1);
    }

    const requestData = fs.readFileSync(requestFile, 'utf8');
    const request: LicenseRequest = JSON.parse(requestData);

    console.log('\n📋 License Request:');
    console.log(`   Customer: ${request.customerName}`);
    console.log(`   MAC Hash: ${request.macHash.substring(0, 16)}...`);
    console.log(`   Device ID: ${request.deviceId.substring(0, 16)}...`);
    console.log(`   Request Date: ${request.requestDate}`);

    // Read private key
    const privateKeyPath = path.join(__dirname, '../private-key.pem');
    if (!fs.existsSync(privateKeyPath)) {
        console.error('\n❌ Private key not found!');
        console.error('   Run: npx tsx license/generate-keys.ts');
        process.exit(1);
    }

    const privateKeyData = fs.readFileSync(privateKeyPath, 'utf8');
    const key = new NodeRSA(privateKeyData);

    // Create license
    const issueDate = new Date().toISOString();
    let expiresAt: string | undefined;

    if (expirationDays) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + expirationDays);
        expiresAt = expiry.toISOString();
    }

    const licenseData = {
        customerId: uuidv4(),
        customerName: request.customerName,
        macHash: request.macHash,
        deviceId: request.deviceId,
        features,
        issueDate,
        expiresAt,
    };

    // Sign the license
    const dataToSign = JSON.stringify(licenseData);
    const signature = key.sign(Buffer.from(dataToSign), 'base64');

    const license: License = {
        ...licenseData,
        signature,
    };

    // Save license file
    const outputFilename = `license-${request.customerName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    const outputPath = path.join(__dirname, outputFilename);

    fs.writeFileSync(outputPath, JSON.stringify(license, null, 2));

    console.log('\n✅ License generated successfully!');
    console.log(`   File: ${outputFilename}`);
    console.log(`   Customer ID: ${license.customerId}`);
    console.log(`   Features: ${features.join(', ')}`);
    if (expiresAt) {
        console.log(`   Expires: ${new Date(expiresAt).toLocaleDateString()}`);
    } else {
        console.log(`   Expires: Never (perpetual license)`);
    }
    console.log('\n📧 Send this file to the customer to activate their license.');
}

signLicense();
