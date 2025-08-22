const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// The details of the original stream
const ORIGINAL_HOST = "cistakosuza.petica.info:80";
const ORIGINAL_SCHEME = "http";

// The main proxy route
app.get('/*', async (req, res) => {
    const originalUrl = `${ORIGINAL_SCHEME}://${ORIGINAL_HOST}${req.originalUrl}`;
    console.log(`Proxying in RAW mode for: ${originalUrl}`);

    try {
        const response = await axios({
            method: 'get',
            url: originalUrl,
            responseType: 'stream',
            headers: {
                'Host': ORIGINAL_HOST,
                'User-Agent': 'OTT-Navigator' // A simple user-agent for this player
            }
        });
        
        // Just pass the raw data directly through.
        response.data.pipe(res);

    } catch (error) {
        console.error("Error in proxy request:", error.message);
        res.status(502).send('Error fetching from the original server.');
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server listening on port ${PORT}`);
});
