declare module 'node-rsa' {
    class NodeRSA {
        constructor(key?: string | object, format?: string, options?: object);
        generateKeyPair(bitLength?: number, exponent?: number): void;
        exportKey(format?: string): string;
        importKey(key: string | object, format?: string): void;
        encrypt(buffer: string | Buffer, encoding?: string, sourceEncoding?: string): string | Buffer;
        decrypt(buffer: string | Buffer, encoding?: string): string | Buffer;
        sign(buffer: string | Buffer, encoding?: string, sourceEncoding?: string): string | Buffer;
        verify(buffer: string | Buffer, signature: string | Buffer, encoding?: string, sourceEncoding?: string): boolean;
    }
    export = NodeRSA;
}
