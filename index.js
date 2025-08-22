const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION ---
// 1. Set the URL path you WANT to use.
const YOUR_CUSTOM_PATH = "/kuroba.kaito/xcu182713";

// 2. Set the REAL path from the source stream.
const ACTUAL_SOURCE_PATH = "/Markus.Beuhler4/zUbBP5/25466";

// 3. The details of the original stream server.
const ORIGINAL_HOST = "cistakosuza.petica.info:80";
const ORIGINAL_SCHEME = "http";
// --- END CONFIGURATION ---


// This route will ONLY listen for your custom path.
app.get(YOUR_CUSTOM_PATH, async (req, res) => {
    
    // When your custom path is requested, we will always fetch the real source path.
    const originalUrl = `${ORIGINAL_SCHEME}://${ORIGINAL_HOST}${ACTUAL_SOURCE_PATH}`;
    
    console.log(`Masking request: ${YOUR_CUSTOM_PATH} -> ${originalUrl}`);

    try {
        const response = await axios({
            method: 'get',
            url: originalUrl,
            responseType: 'stream',
            headers: {
                'Host': ORIGINAL_HOST,
                'User-Agent': 'OTT-Navigator'
            }
        });
        
        // Pass the raw data directly through.
        response.data.pipe(res);

    } catch (error) {
        console.error("Error in proxy request:", error.message);
        res.status(502).send('Error fetching from the original server.');
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server listening on port ${PORT}`);
});
