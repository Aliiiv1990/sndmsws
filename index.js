import { Boom } from '@hapi/boom';
import baileys, {
    useMultiFileAuthState,
    DisconnectReason,
    isJidGroup
} from '@whiskeysockets/baileys';
const { default: makeWASocket } = baileys;
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import {
    PRIMARY_GROUP_ID,
    SECONDARY_GROUP_IDS
} from './config.js';
import {
    loadMappings,
    addMapping,
    getMapping,
    removeMapping
} from './messageStore.js';

const logger = pino({
    level: 'silent'
});

async function connectToWhatsApp() {
    // --- Authentication and State ---
    const {
        state,
        saveCreds
    } = await useMultiFileAuthState('baileys_auth_info');
    loadMappings();

    // --- Socket Creation ---
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger,
        getMessage: async (key) => {
            // Returning undefined signals that the message is not in our store.
            return undefined;
        },
    });

    // --- Event Handlers ---
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const {
            connection,
            lastDisconnect,
            qr
        } = update;
        if (qr) {
            console.log('QR code received, please scan:');
            qrcode.generate(qr, {
                small: true
            });
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom) ?
                lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut :
                true;
            console.log(
                'Connection closed due to',
                lastDisconnect?.error,
                ', reconnecting',
                shouldReconnect
            );
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('Connection opened!');
            console.log(`Bot is ready. Mirroring from ${PRIMARY_GROUP_ID} to ${SECONDARY_GROUP_IDS.length} groups.`);
        }
    });

    // --- Main Logic: Message Handling ---

    // 1. Handle new messages (to mirror them)
    sock.ev.on('messages.upsert', async (event) => {
        if (event.type !== 'notify') {
            return;
        }

        for (const m of event.messages) {
            // Uncomment the line below to find group JIDs
            // if (isJidGroup(m.key.remoteJid)) console.log('Received message in group:', m.key.remoteJid);

            // Check if the message is from the user in the primary group
            if (m.key.remoteJid === PRIMARY_GROUP_ID && m.key.fromMe && m.message) {
                console.log(`Mirroring message from primary group: ${m.key.id}`);

                for (const secondaryJid of SECONDARY_GROUP_IDS) {
                    try {
                        const mirroredMsg = await sock.sendMessage(secondaryJid, {
                            forward: m
                        });
                        addMapping(m.key, mirroredMsg);
                        console.log(`Message ${m.key.id} forwarded to ${secondaryJid}`);
                    } catch (err) {
                        console.error(`Failed to forward message to ${secondaryJid}:`, err);
                    }
                }
            }
        }
    });

    // 2. Handle message updates (for edits and deletes)
    sock.ev.on('messages.update', async (updates) => {
        for (const {
                key,
                update
            } of updates) {
            // Handle message deletion (revoke)
            if (update.protocolMessage?.type === 'REVOKE') {
                const revokedKey = update.protocolMessage.key;
                if (revokedKey.remoteJid === PRIMARY_GROUP_ID) {
                    console.log(`Deletion detected for message ${revokedKey.id} in primary group.`);
                    const mapping = getMapping(revokedKey);
                    if (mapping) {
                        for (const mirrored of mapping.mirrored) {
                            try {
                                await sock.sendMessage(mirrored.chatId, {
                                    delete: mirrored.key
                                });
                                console.log(`Mirrored message deleted in ${mirrored.chatId}`);
                            } catch (err) {
                                console.error(`Failed to delete message in ${mirrored.chatId}:`, err);
                            }
                        }
                        removeMapping(revokedKey);
                    }
                }
            }
            // Handle message edits
            else if (update.message?.editedMessage) {
                if (key.remoteJid === PRIMARY_GROUP_ID) {
                    console.log(`Edit detected for message ${key.id} in primary group.`);
                    const mapping = getMapping(key);
                    if (mapping) {
                        // The new content is inside the editedMessage protocol message
                        const newText = update.message.editedMessage.message?.protocolMessage?.editedMessage?.conversation ||
                            update.message.editedMessage.message?.extendedTextMessage?.text;

                        if (newText) {
                            for (const mirrored of mapping.mirrored) {
                                try {
                                    await sock.sendMessage(mirrored.chatId, {
                                        text: newText,
                                        edit: mirrored.key,
                                    });
                                    console.log(`Mirrored message edited in ${mirrored.chatId}`);
                                } catch (err) {
                                    console.error(`Failed to edit message in ${mirrored.chatId}:`, err);
                                }
                            }
                        } else {
                            console.log(`Could not extract new text for edited message ${key.id}. Skipping edit.`);
                        }
                    }
                }
            }
        }
    });
}

// --- Start the bot ---
console.log('Starting WhatsApp Mirror Bot...');
connectToWhatsApp().catch(err => console.log("Unexpected error: " + err))
