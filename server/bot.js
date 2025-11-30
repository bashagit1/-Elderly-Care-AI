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
let Client, LocalAuth, MessageMedia, qrcode, express, cors, dotenv, createClient;

try {
    const ww = require('whatsapp-web.js');
    Client = ww.Client;
    LocalAuth = ww.LocalAuth;
    MessageMedia = ww.MessageMedia; // Required for images
    qrcode = require('qrcode-terminal');
    express = require('express');
    cors = require('cors');
    dotenv = require('dotenv');
    const supabasePkg = require('@supabase/supabase-js');
    createClient = supabasePkg.createClient;
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

// Robust CORS to allow Netlify frontend
app.use(cors({
    origin: '*', // Allow all origins for simplicity in this setup
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Increase limit for base64 images to avoid PayloadTooLargeError
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 3001;

// --- SUPABASE MAINTENANCE SETUP ---
// Using hardcoded fallbacks to ensure cleanup works even if ENV vars are missing on Railway
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zaiektkvhjfndfebolao.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphaWVrdGt2aGpmbmRmZWJvbGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3OTM3NTEsImV4cCI6MjA3OTM2OTc1MX0.34BB18goOvIpwPci2u25JLoC7l9PRfanpC9C4DS4RfQ';

let supabase = null;
if (createClient) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase connected for maintenance tasks');
}

// --- GLOBAL STATE & QUEUE ---
let isReady = false;
let currentQR = null;

// The Queue ensures we process one batch of updates at a time.
const jobQueue = [];
let isProcessingQueue = false;
let lastJobStartTime = 0; // Timestamp to track stuck jobs

// --- SCHEDULED MAINTENANCE (THE "DEEP" FIX) ---
// 1. Puppeteer Memory Cleanup (Every 24 Hours)
setInterval(() => {
    console.log('[MAINTENANCE] Performing daily scheduled restart to clean memory...');
    process.exit(0); // Railway will restart it fresh
}, 24 * 60 * 60 * 1000); 

// 2. Database Image Cleanup (Every 1 Hour)
// Deletes images older than 15 hours to prevent database bloat/timeouts
setInterval(async () => {
    if (!supabase) return;

    console.log('[MAINTENANCE] Running 15-Hour Image Cleanup...');
    const timeLimit = new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString();

    try {
        // Clear image_urls for logs older than 15 hours
        const { error } = await supabase
            .from('activity_logs')
            .update({ image_urls: [] })
            .lt('created_at', timeLimit);
        
        if (error) {
            console.error('[CLEANUP] Error:', error.message);
        } else {
            console.log('[CLEANUP] Old images removed to save database space.');
        }
    } catch (err) {
        console.error('[CLEANUP] Failed:', err.message);
    }
}, 60 * 60 * 1000);


// --- HEARTBEAT & SELF-HEALING (WATCHDOG) ---
// Monitor not just RAM, but Client State and STUCK QUEUES.
setInterval(async () => {
    const memUsage = process.memoryUsage();
    const ram = Math.round(memUsage.heapUsed / 1024 / 1024);
    const uptime = Math.floor(process.uptime());
    
    console.log(`[HEARTBEAT] Uptime: ${uptime}s | RAM: ${ram}MB | Queue: ${jobQueue.length} | Ready: ${isReady}`);

    // WATCHDOG: Check for STUCK JOBS
    // If we are "processing" a job for more than 2 minutes (120000ms), the browser is frozen.
    if (isProcessingQueue && lastJobStartTime > 0) {
        const duration = Date.now() - lastJobStartTime;
        if (duration > 120000) { 
            console.error(`[WATCHDOG] 🚨 CRITICAL: Job stuck for ${Math.round(duration/1000)}s. Browser likely frozen.`);
            console.error('[WATCHDOG] Force restarting server to clear fault...');
            process.exit(1); // Railway will restart the container fresh
        }
    }

    // Active Health Check
    if (isReady) {
        try {
            // Ask puppeteer for the state. If this hangs/fails, the browser is dead.
            // We race against a timeout because sometimes getState() hangs indefinitely.
            const statePromise = client.getState();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
            
            await Promise.race([statePromise, timeoutPromise]);
        } catch (e) {
            console.error('[HEARTBEAT] Client unresponsive/timeout. Force Restarting...', e.message);
            process.exit(1);
        }
    }
}, 60000); // Check every 60 seconds

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // AGGRESSIVE RESOURCE SAVING ARGS
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Critical for Docker/Railway
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions', // Save RAM
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--mute-audio', // Don't let browser handle audio
            '--no-default-browser-check',
            '--autoplay-policy=user-gesture-required',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-component-update',
            '--disable-features=Translate',
            '--disable-hang-monitor',
            '--disable-ipc-flooding-protection',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--disable-sync',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--password-store=basic',
            '--use-mock-keychain'
        ],
        headless: true,
        // Spoof User Agent to look like a real Windows PC (Prevents WhatsApp disconnects)
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
    }
});

client.on('qr', (qr) => {
    currentQR = qr;
    isReady = false;
    console.log('QR RECEIVED. Scan this to login.');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Client is ready!');
    isReady = true;
    currentQR = null;
});

client.on('authenticated', () => {
    console.log('✅ AUTHENTICATED');
    isReady = true;
    currentQR = null;
});

client.on('auth_failure', (msg) => {
    console.error('❌ AUTHENTICATION FAILURE', msg);
    isReady = false;
    process.exit(1);
});

client.on('disconnected', (reason) => {
    console.log('⚠️ Client was logged out:', reason);
    isReady = false;
    console.log('RESTARTING SERVER TO REFRESH SESSION...');
    process.exit(1); 
});

// Initialize client
console.log('Initializing WhatsApp Client...');
try {
    client.initialize().catch(err => {
        console.error("Client initialization failed:", err);
        process.exit(1);
    });
} catch (err) {
    console.error("Synchronous client error:", err);
    process.exit(1);
}

// --- QUEUE PROCESSOR ---
async function processQueue() {
    if (isProcessingQueue || jobQueue.length === 0) return;

    isProcessingQueue = true;
    lastJobStartTime = Date.now(); // Mark start time for Watchdog
    
    const job = jobQueue.shift(); // Get the oldest job

    console.log(`[QUEUE] Processing job for Group ${job.groupId} (${job.imageUrls?.length || 0} images)`);

    try {
        await processJob(job);
    } catch (err) {
        console.error(`[QUEUE] Job Failed:`, err);
    } finally {
        isProcessingQueue = false;
        lastJobStartTime = 0; // Reset watchdog timer
        // Wait a small bit before next job to let CPU cool down
        setTimeout(processQueue, 1000); 
    }
}

async function processJob(job) {
    const { groupId, message, imageUrls } = job;
    const hasImages = imageUrls && imageUrls.length > 0;
    const hasText = message && message.trim().length > 0;

    // 1. Send Images
    if (hasImages) {
        for (let i = 0; i < imageUrls.length; i++) {
            const url = imageUrls[i];
            let media = null; 

            try {
                if (url.startsWith('data:')) {
                    const parts = url.split(',');
                    const mimeMatch = parts[0].match(/:(.*?);/);
                    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
                    const data = parts[1];
                    media = new MessageMedia(mime, data, `update_${Date.now()}_${i}.jpg`);
                } else {
                    media = await MessageMedia.fromUrl(url);
                }
                
                if (media) {
                    const sendPromise = client.sendMessage(groupId, media);
                    // 20s Timeout per image (increased for safety)
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout sending image')), 20000)
                    );
                    
                    await Promise.race([sendPromise, timeoutPromise]);
                    console.log(`[QUEUE] Sent image ${i + 1}/${imageUrls.length}`);
                }
            } catch (imgErr) {
                console.error(`[QUEUE] Error sending image ${i+1}:`, imgErr.message);
            } finally {
                media = null; // Free RAM immediately
                if (global.gc) { global.gc(); } // Hint garbage collector if available
            }
            
            // 2s delay between images to prevent rate limiting
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    // 2. Send Text
    if (hasText) {
        try {
            await client.sendMessage(groupId, message);
            console.log('[QUEUE] Text message sent.');
        } catch (e) {
            console.error('[QUEUE] Failed to send text:', e.message);
        }
    }
}


// --- API ENDPOINTS ---

app.get('/', (req, res) => {
    const uptime = process.uptime();
    res.send(`Elderly Care Watch AI Bot Server is Running! Uptime: ${Math.floor(uptime)}s | Queue: ${jobQueue.length}`);
});

app.get('/status', (req, res) => {
    res.json({ 
        status: isReady ? 'connected' : 'disconnected',
        hasQR: !!currentQR
    });
});

app.get('/qr', (req, res) => {
    res.json({ qr: currentQR });
});

app.get('/groups', async (req, res) => {
    if (!isReady) {
        return res.json([]); 
    }
    
    try {
        let attempts = 0;
        let groups = [];
        
        while (attempts < 3 && groups.length === 0) {
            const chats = await client.getChats();
            groups = chats
                .filter(chat => chat.isGroup || chat.id._serialized.endsWith('@g.us'))
                .map(chat => ({
                    id: chat.id._serialized,
                    name: chat.name || 'Unknown Group'
                }));

            if (groups.length === 0) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;
            } else {
                break;
            }
        }
        res.json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.json([]);
    }
});

// The POST endpoint now simply adds to Queue
app.post('/send-update', (req, res) => {
    if (!isReady) {
        return res.status(503).json({ error: 'WhatsApp not connected' });
    }

    const { groupId, message, imageUrls } = req.body;

    if (!groupId) {
        return res.status(400).json({ error: 'Missing groupId' });
    }

    // Validation
    // ALLOW EMPTY MESSAGE if images exist (As per user request)
    if ((!message || message.trim() === '') && (!imageUrls || imageUrls.length === 0)) {
        return res.status(400).json({ error: 'At least a message or an image is required' });
    }

    // Add to Queue
    jobQueue.push({ groupId, message, imageUrls });
    console.log(`[API] Job added to queue. Queue length: ${jobQueue.length}`);
    
    // Trigger processing if idle
    processQueue();

    // Reply immediately
    res.json({ success: true, status: 'queued' });
});

app.listen(PORT, () => {
    console.log(`AI Agent Server running on port ${PORT}`);
});