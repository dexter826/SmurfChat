import CryptoJS from 'crypto-js';

export const generateMasterKey = (email, password) => {
    const combined = `${email}:${password}`;
    return CryptoJS.SHA256(combined).toString();
};

export const encryptContent = (content, masterKey) => {
    if (!content || !masterKey) {
        throw new Error('Content and master key are required for encryption');
    }
    try {
        return CryptoJS.AES.encrypt(content, masterKey).toString();
    } catch (error) {
        throw new Error('Failed to encrypt content: ' + error.message);
    }
};

export const decryptContent = (encryptedContent, masterKey) => {
    if (!encryptedContent || !masterKey) {
        throw new Error('Encrypted content and master key are required for decryption');
    }
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedContent, masterKey);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) {
            throw new Error('Invalid decryption key or corrupted data');
        }
        return decrypted;
    } catch (error) {
        throw new Error('Failed to decrypt content: ' + error.message);
    }
};

export const generateRandomKey = (length = 32) => {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const hashContent = (content) => {
    if (!content) {
        throw new Error('Content is required for hashing');
    }
    return CryptoJS.SHA256(content).toString();
};

export const verifyContentIntegrity = (content, hash) => {
    if (!content || !hash) {
        return false;
    }
    try {
        const calculatedHash = hashContent(content);
        return calculatedHash === hash;
    } catch (error) {
        return false;
    }
};

export const encryptFileData = (fileData, masterKey) => {
    if (!fileData || !masterKey) {
        throw new Error('File data and master key are required for encryption');
    }
    try {
        const fileDataString = JSON.stringify(fileData);
        return encryptContent(fileDataString, masterKey);
    } catch (error) {
        throw new Error('Failed to encrypt file data: ' + error.message);
    }
};

export const decryptFileData = (encryptedFileData, masterKey) => {
    if (!encryptedFileData || !masterKey) {
        throw new Error('Encrypted file data and master key are required for decryption');
    }
    try {
        const decryptedString = decryptContent(encryptedFileData, masterKey);
        return JSON.parse(decryptedString);
    } catch (error) {
        throw new Error('Failed to decrypt file data: ' + error.message);
    }
};

export const encryptLocationData = (locationData, masterKey) => {
    if (!locationData || !masterKey) {
        throw new Error('Location data and master key are required for encryption');
    }
    try {
        const locationDataString = JSON.stringify(locationData);
        return encryptContent(locationDataString, masterKey);
    } catch (error) {
        throw new Error('Failed to encrypt location data: ' + error.message);
    }
};

export const decryptLocationData = (encryptedLocationData, masterKey) => {
    if (!encryptedLocationData || !masterKey) {
        throw new Error('Encrypted location data and master key are required for decryption');
    }
    try {
        const decryptedString = decryptContent(encryptedLocationData, masterKey);
        return JSON.parse(decryptedString);
    } catch (error) {
        throw new Error('Failed to decrypt location data: ' + error.message);
    }
};
