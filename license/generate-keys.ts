/**
 * License Key Generation Tool
 * Run with: npx tsx license/generate-keys.ts
 * 
 * This generates RSA key pair:
 * - private-key.pem: Keep this SECRET, used to sign licenses
 * - public-key.pem: Embed this in the application
 */

import NodeRSA from 'node-rsa';
import fs from 'fs';
import path from 'path';

const KEY_SIZE = 2048;

function generateKeys() {
    console.log('🔐 Generating RSA key pair...\n');

    const key = new NodeRSA({ b: KEY_SIZE });

    const privateKey = key.exportKey('pkcs1-private-pem');
    const publicKey = key.exportKey('pkcs1-public-pem');

    const outputDir = path.join(__dirname, '../');
    const publicDir = path.join(__dirname, '../public');

    // Ensure directories exist
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    // Save private key (KEEP SECRET!)
    fs.writeFileSync(path.join(outputDir, 'private-key.pem'), privateKey);
    console.log('✅ Private key saved to: private-key.pem');
    console.log('   ⚠️  KEEP THIS FILE SECRET! Do not distribute with the app!\n');

    // Save public key (embed in app)
    fs.writeFileSync(path.join(publicDir, 'public-key.pem'), publicKey);
    console.log('✅ Public key saved to: public/public-key.pem');
    console.log('   ℹ️  This file should be distributed with the app.\n');

    console.log('🎉 Key generation complete!\n');
    console.log('Next steps:');
    console.log('1. Store private-key.pem in a secure location');
    console.log('2. Use sign-license.ts to create licenses for customers');
    console.log('3. The app will use public-key.pem to verify licenses');
}

generateKeys();
