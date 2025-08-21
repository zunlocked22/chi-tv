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
            responseType: 'stream', // This is important for streaming video data
            headers: {
                'Host': ORIGINAL_HOST,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
            }
        });

        // If the content is an M3U8 playlist, we don't stream it.
        // We read it, modify it, and then send it.
        if (req.originalUrl.includes('.m3u8') || req.originalUrl.endsWith(ORIGINAL_HOST) || req.originalUrl.endsWith('/')) {
             const chunks = [];
             for await (const chunk of response.data) {
                 chunks.push(chunk);
             }
             let m3u8Content = Buffer.concat(chunks).toString('utf8');
             
             // Rewrite absolute URLs within the playlist to be relative
             const regex = new RegExp(`${ORIGINAL_SCHEME}://${ORIGINAL_HOST}`, 'g');
             m3u8Content = m3u8Content.replace(regex, '');

             res.send(m3u8Content);
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
