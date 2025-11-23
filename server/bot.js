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
let Client, LocalAuth, qrcode, express, cors, dotenv;
let fs, path, os, tar, supabaseJs;

try {
    const ww = require('whatsapp-web.js');
    Client = ww.Client;
    LocalAuth = ww.LocalAuth;
    qrcode = require('qrcode-terminal');
    // optional: server-side QR image generation
    // we'll require 'qrcode' when needed (lightweight)
    express = require('express');
    cors = require('cors');
    dotenv = require('dotenv');
    fs = require('fs');
    path = require('path');
    os = require('os');
    tar = require('tar');
    supabaseJs = require('@supabase/supabase-js');
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
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Initialize WhatsApp Client
const DATA_PATH = process.env.SESSION_PATH || './wwebjs_auth';

// Supabase session storage configuration (optional)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'wwebjs-sessions';
const SESSION_ID = process.env.SESSION_ID || 'default';
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (e) {
        console.warn('Failed to initialize Supabase client:', e);
        supabase = null;
    }
}

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: DATA_PATH }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true 
    }
});

// State
let isReady = false;
let currentQR = null;
// helper to generate PNG data URL for QR codes
async function generateQrPng(qr) {
    if (!qr) return null;
    try {
        const qrcode = require('qrcode');
        const dataUrl = await qrcode.toDataURL(qr, { margin: 1 });
        return dataUrl;
    } catch (e) {
        console.warn('Failed to generate QR PNG:', e);
        return null;
    }
}

// --- Session persistence helpers (Supabase) ---
async function uploadSessionToSupabase(dataPath) {
    if (!supabase) return false;
    try {
        await fs.promises.access(dataPath);
    } catch (e) {
        return false;
    }

    const tmpTar = path.join(os.tmpdir(), `wwebjs_${SESSION_ID}.tar.gz`);
    try {
        await tar.c({ gzip: true, file: tmpTar, cwd: dataPath }, ['.']);
        const fileStream = fs.createReadStream(tmpTar);
        const remotePath = `${SESSION_ID}.tar.gz`;
        const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(remotePath, fileStream, { upsert: true });
        await fs.promises.unlink(tmpTar).catch(() => {});
        if (error) {
            console.warn('Supabase upload error', error);
            return false;
        }
        console.log('Session uploaded to Supabase');
        return true;
    } catch (e) {
        console.warn('Error creating/uploading session tar:', e);
        try { await fs.promises.unlink(tmpTar).catch(() => {}); } catch {}
        return false;
    }
}

async function downloadSessionFromSupabase(dataPath) {
    if (!supabase) return false;
    const remotePath = `${SESSION_ID}.tar.gz`;
    try {
        const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(remotePath);
        if (error) {
            console.log('No session archive found in Supabase or download error:', error.message || error);
            return false;
        }

        // Convert data to buffer (works in Node when data.arrayBuffer exists)
        let buffer;
        if (typeof data.arrayBuffer === 'function') {
            const ab = await data.arrayBuffer();
            buffer = Buffer.from(ab);
        } else if (Buffer.isBuffer(data)) {
            buffer = data;
        } else {
            // fallback: try to stream to buffer
            const chunks = [];
            for await (const chunk of data) chunks.push(chunk);
            buffer = Buffer.concat(chunks);
        }

        const tmpTar = path.join(os.tmpdir(), `wwebjs_${SESSION_ID}.tar.gz`);
        await fs.promises.writeFile(tmpTar, buffer);
        await fs.promises.mkdir(dataPath, { recursive: true });
        await tar.x({ file: tmpTar, C: dataPath });
        await fs.promises.unlink(tmpTar).catch(() => {});
        console.log('Session downloaded and extracted from Supabase');
        return true;
    } catch (e) {
        console.warn('Error downloading/extracting session:', e);
        return false;
    }
}

client.on('qr', (qr) => {
    // Update current QR
    currentQR = qr;
    isReady = false;
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
    isReady = true;
    currentQR = null; // Clear QR when connected
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
    isReady = true;
    currentQR = null;
    // After authentication, persist session to Supabase (if configured)
    (async () => {
        try {
            await uploadSessionToSupabase(DATA_PATH);
        } catch (e) {
            console.warn('Failed to upload session on auth:', e);
        }
    })();
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    isReady = false;
    // Try to safely destroy and re-initialize to recover
    (async () => {
        try {
            await client.destroy();
        } catch (e) {
            /* ignore */
        }
        // short delay before re-init
        setTimeout(() => client.initialize(), 2000);
    })();
});

// Attempt to restore session from Supabase BEFORE initializing the client when possible
async function tryRestoreAndInit() {
    if (supabase) {
        try {
            const restored = await downloadSessionFromSupabase(DATA_PATH);
            if (restored) {
                console.log('Restored session from Supabase — initializing client with restored session');
            } else {
                console.log('No session restored from Supabase (starting fresh)');
            }
        } catch (e) {
            console.warn('Session restore attempt failed:', e);
        }
    }

    try {
        client.initialize();
    } catch (e) {
        console.error('Failed to initialize WhatsApp client:', e);
    }
}

tryRestoreAndInit();

// --- API ENDPOINTS ---

// 1. Check Status & Get QR info
app.get('/status', (req, res) => {
    res.json({ 
        status: isReady ? 'connected' : 'disconnected',
        hasQR: !!currentQR
    });
});

// Root health endpoint
app.get('/', (req, res) => {
    res.json({ status: isReady ? 'connected' : 'disconnected' });
});

// 2. Get QR Code (Raw Data)
app.get('/qr', (req, res) => {
    res.json({ qr: currentQR });
});

// Return QR as PNG (image/png) data so users can scan from the browser
app.get('/qr/png', async (req, res) => {
    if (!currentQR) return res.status(404).send('No QR available');
    try {
        const dataUrl = await generateQrPng(currentQR);
        if (!dataUrl) return res.status(500).send('Failed to generate QR image');
        const base64 = dataUrl.split(',')[1];
        const imgBuf = Buffer.from(base64, 'base64');
        res.type('image/png').send(imgBuf);
    } catch (e) {
        res.status(500).send('QR generation error');
    }
});

// Return QR as SVG (scalable, often smaller for browser scanning)
app.get('/qr/svg', async (req, res) => {
    if (!currentQR) return res.status(404).send('No QR available');
    try {
        const qrcode = require('qrcode');
        const svg = await qrcode.toString(currentQR, { type: 'svg', margin: 1 });
        res.type('image/svg+xml').send(svg);
    } catch (e) {
        console.warn('Failed to generate QR SVG:', e);
        res.status(500).send('QR SVG generation error');
    }
});

// Simple HTML page to view and scan QR (scaled for easier scanning on Railway UI)
app.get('/qr/page', (req, res) => {
    const html = `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>WhatsApp Bot — QR</title>
  <style>body{display:flex;height:100vh;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif} .card{max-width:420px;padding:16px;border:1px solid #eaeaea;border-radius:8px;text-align:center} img{width:320px;max-width:100%} pre{white-space:pre-wrap;word-break:break-word;text-align:left;}</style>
</head>
<body>
  <div class="card">
    <h3>Scan WhatsApp QR</h3>
    <p>If the image looks too large or small, try the SVG version or download and scan.</p>
    <img src="/qr/png" alt="WhatsApp QR" />
    <div style="margin-top:12px">
      <a href="/qr/svg" target="_blank">Open SVG (scalable)</a> · <a href="/qr/png" download="qr.png">Download PNG</a>
    </div>
    <p style="font-size:12px;margin-top:8px;color:#666">Once authenticated the bot will report 'status: connected' at <code>/status</code>.</p>
  </div>
</body>
</html>`;
    res.type('text/html').send(html);
});

// 3. Get All Groups (For Admin Discovery)
app.get('/groups', async (req, res) => {
    if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });
    
    try {
        const chats = await client.getChats();
        const groups = chats
            .filter(chat => chat.isGroup)
            .map(chat => ({
                id: chat.id._serialized,
                name: chat.name
            }));
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Send Update
app.post('/send-update', async (req, res) => {
    if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });

    const { groupId, message, imageUrls } = req.body;

    if (!groupId || !message) {
        return res.status(400).json({ error: 'Missing groupId or message' });
    }

    try {
        // Send Text
        // If there are images, try to send them with the message as caption on the first
        // image. Otherwise just send the text message.

        // Helper: convert a single URL or data URI to a MessageMedia instance
        async function urlOrDataToMessageMedia(input) {
            const ww = require('whatsapp-web.js');
            // If it's a data URI (base64)
            if (typeof input === 'string' && input.startsWith('data:')) {
                // data:[<mediatype>][;base64],<data>
                // Use indexOf/substring/slice rather than a large-regex capture to avoid
                // creating huge intermediate strings when payloads are large.
                const commaIndex = input.indexOf(',');
                if (commaIndex === -1) throw new Error('Invalid data URI');

                // header is the part between 'data:' and the comma (e.g. 'image/png;base64')
                const header = input.slice(5, commaIndex);
                const semiIndex = header.indexOf(';');
                const mime = semiIndex === -1 ? header : header.slice(0, semiIndex);

                // base64 part: slice from the comma+1 to the end. Using slice avoids
                // split/regex and is a lower-overhead operation.
                const b64 = input.slice(commaIndex + 1);
                return new ww.MessageMedia(mime, b64);
            }

            // Otherwise treat it as a remote URL
            try {
                const resp = await fetch(input);
                if (!resp.ok) throw new Error(`Failed to fetch ${input}: ${resp.status}`);
                const contentType = resp.headers.get('content-type') || 'application/octet-stream';
                const ab = await resp.arrayBuffer();
                const buffer = Buffer.from(ab);
                const b64 = buffer.toString('base64');
                return new ww.MessageMedia(contentType, b64);
            } catch (err) {
                throw new Error(`Failed to load image ${input}: ${err.message}`);
            }
        }

        // If there are images, convert and send them
        if (imageUrls && imageUrls.length > 0) {
            // Prepare MessageMedia objects
            const medias = [];
            const errors = [];
            console.log(`Preparing to send ${imageUrls.length} images to ${groupId}`);
            for (const url of imageUrls) {
                try {
                    console.log('Loading image:', url && (url.length > 120 ? url.slice(0,120)+'...' : url));
                    const media = await urlOrDataToMessageMedia(url);
                    // Basic sanity: ensure media has data
                    if (!media || !media.data) {
                        throw new Error('Empty media data');
                    }
                    medias.push(media);
                    console.log('Image prepared (size approx):', media.data.length ? `${Math.ceil(media.data.length/1024)} KB` : 'unknown');
                } catch (e) {
                    console.warn('Image skipped:', e.message);
                    errors.push({ url, error: e.message });
                }
            }

            let sentCount = 0;
            if (medias.length === 0) {
                // No images could be prepared, fallback to text
                console.log('No valid images prepared; sending text only');
                await client.sendMessage(groupId, message);
            } else {
                // Send first media with caption (message), then remaining medias without caption
                try {
                    console.log('Sending first image with caption');
                    const m0 = await client.sendMessage(groupId, medias[0], { caption: message });
                    sentCount++;
                    for (let i = 1; i < medias.length; i++) {
                        // small delay to avoid rate issues
                        await new Promise(r => setTimeout(r, 250));
                        try {
                            await client.sendMessage(groupId, medias[i]);
                            sentCount++;
                        } catch (e) {
                            console.error('Failed to send media index', i, e.message || e);
                            errors.push({ index: i, error: e.message || String(e) });
                        }
                    }
                } catch (e) {
                    console.error('Failed to send media messages:', e);
                    errors.push({ sendError: e.message || String(e) });
                    // fallback: try to send text only
                    try { await client.sendMessage(groupId, message); } catch (e2) { console.warn('Fallback text send failed', e2.message || e2); }
                }
            }

            return res.json({ success: true, sentImages: sentCount, prepared: medias.length, errors });
        } else {
            const info = await client.sendMessage(groupId, message);
            return res.json({ success: true, messageId: info && info.id ? info.id._serialized || info.id : null });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Send failed:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

app.listen(PORT, () => {
    console.log(`AI Agent Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down...');
    try { await client.destroy(); } catch (e) {}
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    try { await client.destroy(); } catch (e) {}
    process.exit(0);
});