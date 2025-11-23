import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * ELDERLY CARE WATCH AI - BOT AGENT
 * 
 * Instructions:
 * 1. Install dependencies: npm install
 * 2. Run: node server/bot.js
 */

// --- DEPENDENCY CHECK ---
let Client, LocalAuth, MessageMedia, qrcode, express, cors, dotenv;

try {
    const ww = require('whatsapp-web.js');
    Client = ww.Client;
    LocalAuth = ww.LocalAuth;
    MessageMedia = ww.MessageMedia; // Required for images
    qrcode = require('qrcode-terminal');
    express = require('express');
    cors = require('cors');
    dotenv = require('dotenv');
} catch (e) {
    console.error('\n\n❌ ERROR: MISSING DEPENDENCIES ❌');
    console.error('-----------------------------------');
    console.error('The "whatsapp-web.js" or other libraries are missing.');
    console.error('Please run the following command in your terminal to fix this:');
    console.error('\n    npm install\n');
    console.error('Then try running the bot again.');
    console.error('-----------------------------------\n');
    process.exit(1);
}

dotenv.config();

const app = express();
app.use(cors());
// Increase limit for base64 images
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3001;

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
        headless: true 
    }
});

// State
let isReady = false;
let currentQR = null;

client.on('qr', (qr) => {
    // Update current QR
    currentQR = qr;
    isReady = false;
    console.log('QR RECEIVED. Scan this to login.');
    // Print QR to terminal for debugging if local
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Client is ready!');
    isReady = true;
    currentQR = null; // Clear QR when connected
});

client.on('authenticated', () => {
    console.log('✅ AUTHENTICATED');
    isReady = true;
    currentQR = null;
});

client.on('auth_failure', (msg) => {
    console.error('❌ AUTHENTICATION FAILURE', msg);
    isReady = false;
});

client.on('disconnected', (reason) => {
    console.log('⚠️ Client was logged out', reason);
    isReady = false;
    // Re-initialize to allow re-scanning
    client.initialize();
});

// Initialize client
console.log('Initializing WhatsApp Client...');
try {
    client.initialize().catch(err => {
        console.error("Client initialization failed:", err);
    });
} catch (err) {
    console.error("Synchronous client error:", err);
}

// --- API ENDPOINTS ---

// 0. Root Health Check
app.get('/', (req, res) => {
    res.send('Elderly Care Watch AI Bot Server is Running!');
});

// 1. Check Status & Get QR info
app.get('/status', (req, res) => {
    // Log less frequently to avoid spam
    // console.log(`[${new Date().toISOString()}] Status check received. Ready: ${isReady}`);
    res.json({ 
        status: isReady ? 'connected' : 'disconnected',
        hasQR: !!currentQR
    });
});

// 2. Get QR Code (Raw Data)
app.get('/qr', (req, res) => {
    res.json({ qr: currentQR });
});

// 3. Get All Groups (For Admin Discovery)
app.get('/groups', async (req, res) => {
    if (!isReady) {
        console.warn('GET /groups failed: Client not ready');
        return res.status(503).json({ error: 'WhatsApp not connected' });
    }
    
    try {
        console.log('Fetching chats...');
        const chats = await client.getChats();
        console.log(`Found ${chats.length} total chats.`);
        
        // Filter for groups: either isGroup property OR id ends with @g.us
        const groups = chats
            .filter(chat => chat.isGroup || chat.id._serialized.endsWith('@g.us'))
            .map(chat => ({
                id: chat.id._serialized,
                name: chat.name || 'Unknown Group'
            }));
            
        console.log(`Filtered to ${groups.length} groups.`);
        
        if (groups.length === 0) {
            console.log("No groups found. This might be because the chat history hasn't synced yet.");
        }
        
        res.json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Send Update
app.post('/send-update', async (req, res) => {
    if (!isReady) {
        console.warn('POST /send-update failed: Client not ready');
        return res.status(503).json({ error: 'WhatsApp not connected' });
    }

    const { groupId, message, imageUrls } = req.body;

    if (!groupId || !message) {
        return res.status(400).json({ error: 'Missing groupId or message' });
    }

    console.log(`Processing update for group: ${groupId}`);

    try {
        // 1. Send Text
        await client.sendMessage(groupId, message);
        console.log('Text message sent.');

        // 2. Send Images
        if (imageUrls && imageUrls.length > 0) {
             console.log(`Processing ${imageUrls.length} images...`);
             
             // Send sequentially to ensure order
             for (const url of imageUrls) {
                try {
                    let media;
                    // Handle Base64 Data URI
                    if (url.startsWith('data:')) {
                        const parts = url.split(',');
                        const mime = parts[0].match(/:(.*?);/)[1];
                        const data = parts[1];
                        media = new MessageMedia(mime, data, 'update.jpg');
                    } else {
                        // Handle Remote URL
                        media = await MessageMedia.fromUrl(url);
                    }
                    
                    if (media) {
                        await client.sendMessage(groupId, media);
                        console.log('Image sent successfully.');
                    }
                } catch (imgErr) {
                    console.error('Failed to process/send an image:', imgErr.message);
                }
                
                // Small delay between images to prevent rate limiting issues
                await new Promise(r => setTimeout(r, 500));
             }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Send failed:', error);
        // If it's an invalid ID error, tell the user
        if (error.message.includes('invalid Wid')) {
            return res.status(400).json({ error: 'Invalid Group ID. Please scan groups again.' });
        }
        res.status(500).json({ error: 'Failed to send message: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`AI Agent Server running on port ${PORT}`);
});