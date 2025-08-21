const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// The details of the original stream
const ORIGINAL_HOST = "cistakosuza.petica.info:80";
const ORIGINAL_SCHEME = "http";

// Middleware to add CORS headers to every response
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// The main proxy route
app.get('/*', async (req, res) => {
    const originalUrl = `${ORIGINAL_SCHEME}://${ORIGINAL_HOST}${req.originalUrl}`;
    
    console.log(`Proxying request for: ${originalUrl}`);

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

        // Check if the request is for the M3U8 playlist itself
        const isManifest = req.originalUrl.includes('.m3u8') || req.originalUrl.endsWith('25466') || req.originalUrl.endsWith('/');

        if (isManifest) {
            const stream = response.data;
            // When we receive the VERY FIRST chunk of data...
            stream.on('data', (chunk) => {
                // Assume it's the playlist text
                let m3u8Content = chunk.toString('utf8');
                
                // Rewrite any absolute URLs inside it to be relative
                const regex = new RegExp(`${ORIGINAL_SCHEME}://${ORIGINAL_HOST}`, 'g');
                m3u8Content = m3u8Content.replace(regex, '');
                
                // Immediately send the playlist to the player
                res.send(m3u8Content);
                
                // CRITICAL STEP: Destroy the connection to the source so we don't download forever
                stream.destroy();
            });
        } else {
            // For all other content (like .ts video segments), pipe it directly
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
