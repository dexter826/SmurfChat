/**
 * Encryption Utilities - SmurfChat
 *
 * Provides encryption and decryption functions for secure message storage.
 * Uses AES encryption with a master key derived from user credentials.
 *
 * @fileoverview Encryption utilities for end-to-end message security
 * @version 1.0.0
 * @since 2025-09-24
 */

import CryptoJS from 'crypto-js';

/**
 * Generate a master key from user email and password
 * This key will be used to encrypt/decrypt all user messages
 *
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {string} Master key for encryption
 */
export const generateMasterKey = (email, password) => {
    const combined = `${email}:${password}`;
    return CryptoJS.SHA256(combined).toString();
};

/**
 * Encrypt message content using AES encryption
 *
 * @param {string} content - Plain text content to encrypt
 * @param {string} masterKey - Master key for encryption
 * @returns {string} Encrypted content
 */
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

/**
 * Decrypt message content using AES decryption
 *
 * @param {string} encryptedContent - Encrypted content to decrypt
 * @param {string} masterKey - Master key for decryption
 * @returns {string} Decrypted plain text content
 */
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

/**
 * Generate a random encryption key for additional security
 * This can be used as an additional layer of encryption
 *
 * @param {number} length - Length of the random key (default: 32)
 * @returns {string} Random encryption key
 */
export const generateRandomKey = (length = 32) => {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Hash content for integrity verification
 * Uses SHA-256 to create a hash of the content
 *
 * @param {string} content - Content to hash
 * @returns {string} SHA-256 hash of the content
 */
export const hashContent = (content) => {
    if (!content) {
        throw new Error('Content is required for hashing');
    }

    return CryptoJS.SHA256(content).toString();
};

/**
 * Verify content integrity by comparing hash
 *
 * @param {string} content - Original content
 * @param {string} hash - Hash to verify against
 * @returns {boolean} True if content matches hash
 */
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

/**
 * Encrypt file data (metadata only, not the actual file)
 * Encrypts file name, size, and other metadata
 *
 * @param {object} fileData - File metadata to encrypt
 * @param {string} masterKey - Master key for encryption
 * @returns {string} Encrypted file data
 */
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

/**
 * Decrypt file data
 *
 * @param {string} encryptedFileData - Encrypted file data
 * @param {string} masterKey - Master key for decryption
 * @returns {object} Decrypted file data object
 */
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

/**
 * Encrypt location data
 *
 * @param {object} locationData - Location data to encrypt
 * @param {string} masterKey - Master key for encryption
 * @returns {string} Encrypted location data
 */
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

/**
 * Decrypt location data
 *
 * @param {string} encryptedLocationData - Encrypted location data
 * @param {string} masterKey - Master key for decryption
 * @returns {object} Decrypted location data object
 */
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