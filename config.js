// =================================================================================================
//                                        IMPORTANT
// =================================================================================================
// How to get your Group IDs (JID):
// 1. Add your bot's WhatsApp number to the primary group and all secondary groups.
// 2. In the `index.js` file, find the 'messages.upsert' event handler.
// 3. Temporarily uncomment the line that looks like: // console.log('Received message in group:', m.key.remoteJid);
// 4. Run the bot (`npm start`).
// 5. Send a message in each group (the primary one and all secondary ones).
// 6. The group's ID (like '123456789-123345@g.us') will be printed in your terminal.
// 7. Copy the ID for each group and paste it into the configuration below.
// 8. Replace 'YOUR_PRIMARY_GROUP_ID@g.us' with the actual ID of your main group.
// 9. Add the IDs of the other 29 groups to the `SECONDARY_GROUP_IDS` array.
// 10. Once you have all the IDs, remember to comment out the console.log line in `index.js` again.
// =================================================================================================

/**
 * The JID of the primary group from which actions will be mirrored.
 * @type {string}
 */
export const PRIMARY_GROUP_ID = 'YOUR_PRIMARY_GROUP_ID@g.us';

/**
 * An array of JIDs for the secondary groups where actions will be mirrored.
 * @type {string[]}
 */
export const SECONDARY_GROUP_IDS = [
    // Example: '1234567890-1234567@g.us',
    // Add up to 29 secondary group IDs here.
];

// --- Optional Settings ---

/**
 * Set to true if you want to mirror messages sent by *any* admin in the primary group.
 * Set to false if you only want to mirror messages sent by *you* (the bot's number).
 * @type {boolean}
 */
export const MIRROR_ALL_ADMINS = false;

/**
 * Set to true to enable detailed logging for debugging purposes.
 * @type {boolean}
 */
export const DEBUG_MODE = false;
