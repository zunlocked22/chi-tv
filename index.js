const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// The details of the original stream
const ORIGINAL_HOST = "cistakosuza.petica.info:80";
const ORIGINAL_SCHEME = "http";
const MAX_PLAYLIST_SIZE = 15 * 1024; // 15KB buffer

// Middleware to add CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// The main proxy route
app.get('/*', async (req, res) => {
    let requestPath = req.originalUrl;
    
    // Check if the URL is for the "raw" mode for OTT Navigator
    const isRawRequest = req.path.startsWith('/raw/');
    
    if (isRawRequest) {
        // If it's a raw request, we remove the /raw/ part before sending to the origin
        requestPath = req.originalUrl.substring(4);
    }

    const originalUrl = `${ORIGINAL_SCHEME}://${ORIGINAL_HOST}${requestPath}`;
    console.log(`Mode: ${isRawRequest ? 'RAW' : 'CLEAN'} | Proxying for: ${originalUrl}`);

    try {
        const response = await axios({
            method: 'get',
            url: originalUrl,
            responseType: 'stream',
            headers: {
                'Host': ORIGINAL_HOST,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
            }
        });

        // IF THE REQUEST IS FOR RAW MODE (OTT NAVIGATOR)
        if (isRawRequest) {
            // Just pipe the raw, messy, never-ending stream. OTT Navigator can handle it.
            response.data.pipe(res);
            return; // Stop here for raw requests
        }

        // IF THE REQUEST IS FOR CLEAN MODE (JW PLAYER / WEBSITE)
        const isManifest = requestPath.includes('.m3u8') || requestPath.endsWith('25466') || requestPath.endsWith('/');

        if (isManifest) {
            const stream = response.data;
            let body = Buffer.from([]);

            const finish = () => {
                stream.removeListener('data', onData);
                stream.removeListener('end', finish);
                stream.destroy();
                if (!res.headersSent) {
                    let m3u8Content = body.toString('utf8');
                    const regex = new RegExp(`${ORIGINAL_SCHEME}://${ORIGINAL_HOST}`, 'g');
                    m3u8Content = m3u8Content.replace(regex, '');
                    res.send(m3u8Content);
                }
            };

            const onData = (chunk) => {
                body = Buffer.concat([body, chunk]);
                if (body.length > MAX_PLAYLIST_SIZE) {
                    finish();
                }
            };
            
            stream.on('data', onData);
            stream.on('end', finish);

        } else {
            // For .ts video segments, pipe them directly
            response.data.pipe(res);
        }

    } catch (error) {
        console.error("Error in proxy request:", error.message);
        res.status(502).send('Error fetching from the original server.');
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server listening on port ${PORT}`);
});
