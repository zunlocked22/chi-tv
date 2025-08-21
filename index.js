const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// The details of the original stream
const ORIGINAL_HOST = "cistakosuza.petica.info:80";
const ORIGINAL_SCHEME = "http";
const MAX_PLAYLIST_SIZE = 15 * 1024; // 15KB buffer, a safe size for a playlist

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

        const isManifest = req.originalUrl.includes('.m3u8') || req.originalUrl.endsWith('25466') || req.originalUrl.endsWith('/');

        if (isManifest) {
            const stream = response.data;
            let body = Buffer.from([]);

            const finish = () => {
                // Clean up listeners to prevent memory leaks
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
                // If we've buffered enough, assume we have the whole playlist and finish
                if (body.length > MAX_PLAYLIST_SIZE) {
                    finish();
                }
            };
            
            stream.on('data', onData);
            stream.on('end', finish); // This handles streams that are not live and end naturally

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
