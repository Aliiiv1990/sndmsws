import fs from 'fs';
import path from 'path';

const MAPPINGS_FILE = path.resolve(process.cwd(), 'message-mappings.json');
let messageMappings = {};

/**
 * Converts a Baileys message key into a consistent string format for use as a map key.
 * @param {import('@whiskeysockets/baileys').WAMessageKey} key The message key.
 * @returns {string} A string representation of the key.
 */
const keyToString = (key) => `${key.remoteJid}|${key.id}`;

/**
 * Loads the message mappings from the JSON file into memory.
 * Creates the file if it doesn't exist.
 */
export function loadMappings() {
    try {
        if (fs.existsSync(MAPPINGS_FILE)) {
            const fileContent = fs.readFileSync(MAPPINGS_FILE, 'utf-8');
            if (fileContent) {
                messageMappings = JSON.parse(fileContent);
                console.log('Message mappings loaded successfully.');
            }
        } else {
            fs.writeFileSync(MAPPINGS_FILE, JSON.stringify({}));
            console.log('Message mappings file created.');
        }
    } catch (error) {
        console.error('Failed to load or create message mappings file:', error);
        // In case of a corrupted file, start with a clean slate
        messageMappings = {};
    }
}

/**
 * Saves the current message mappings from memory to the JSON file.
 * This function is throttled to prevent excessive writes.
 */
let saveTimeout = null;
function scheduleSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(messageMappings, null, 2));
        } catch (error) {
            console.error('Failed to save message mappings:', error);
        }
    }, 1000); // Save 1 second after the last change
}

/**
 * Adds a mapping between an original message and a mirrored message.
 * @param {import('@whiskeysockets/baileys').WAMessageKey} originalKey The key of the source message.
 * @param {import('@whiskeysockets/baileys').proto.IWebMessageInfo} mirroredMessage The full message info of the mirrored message.
 */
export function addMapping(originalKey, mirroredMessage) {
    const originalKeyStr = keyToString(originalKey);
    if (!messageMappings[originalKeyStr]) {
        messageMappings[originalKeyStr] = {
            original: originalKey,
            mirrored: [],
        };
    }
    messageMappings[originalKeyStr].mirrored.push({
        key: mirroredMessage.key,
        chatId: mirroredMessage.key.remoteJid,
    });
    scheduleSave();
}

/**
 * Retrieves the mapping information for a given original message key.
 * @param {import('@whiskeysockets/baileys').WAMessageKey} originalKey The key of the source message.
 * @returns {object | undefined} The mapping object if found, otherwise undefined.
 */
export function getMapping(originalKey) {
    const originalKeyStr = keyToString(originalKey);
    return messageMappings[originalKeyStr];
}

/**
 * Removes the mapping for a given original message key.
 * @param {import('@whiskeysockets/baileys').WAMessageKey} originalKey The key of the source message.
 */
export function removeMapping(originalKey) {
    const originalKeyStr = keyToString(originalKey);
    if (messageMappings[originalKeyStr]) {
        delete messageMappings[originalKeyStr];
        scheduleSave();
    }
}
