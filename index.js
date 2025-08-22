const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// ######################################################################
// ###               THIS IS THE ONLY PART YOU NEED TO EDIT           ###
// ######################################################################

const STREAMS = [
    {
        // This is your first stream that we set up.
        alias: '/kuroba.kaito/channel/espn1/231881',
        source: 'http://cistakosuza.petica.info:80/Markus.Beuhler4/zUbBP5/25466',
        type: 'raw' // Use 'raw' for OTT Navigator or other IPTV apps.
    },
    {
        // This is an EXAMPLE of a standard HLS stream for your website.
        // Just uncomment it and change the URLs to add another stream.
        alias: '/kuroba.kaito/channel/espn2/239781',
        source: 'http://cistakosuza.petica.info:80/Markus.Beuhler4/zUbBP5/25465',
        type: 'raw' // Use 'hls' for JW Player on your website.

    },

    {
        // This is an EXAMPLE of a standard HLS stream for your website.
        // Just uncomment it and change the URLs to add another stream.
        alias: '/kuroba.kaito/channel/starmovies/238181',
        source: 'http://cistakosuza.petica.info:80/Markus.Beuhler4/zUbBP5/23268',
        type: 'raw' // Use 'hls' for JW Player on your website.

    },

    {
        // This is an EXAMPLE of a standard HLS stream for your website.
        // Just uncomment it and change the URLs to add another stream.
        alias: '/kuroba.kaito/channel/starcrime/238981',
        source: 'http://cistakosuza.petica.info:80/Markus.Beuhler4/zUbBP5/1553',
        type: 'raw' // Use 'hls' for JW Player on your website.

    },

    {
        // This is an EXAMPLE of a standard HLS stream for your website.
        // Just uncomment it and change the URLs to add another stream.
        alias: '/kuroba.kaito/channel/starchannel/287981',
        source: 'http://cistakosuza.petica.info:80/Markus.Beuhler4/zUbBP5/178',
        type: 'raw' // Use 'hls' for JW Player on your website.

    },

    {
        // This is an EXAMPLE of a standard HLS stream for your website.
        // Just uncomment it and change the URLs to add another stream.
        alias: '/kuroba.kaito/channel/starlife/287881',
        source: 'http://cistakosuza.petica.info:80/Markus.Beuhler4/zUbBP5/1378',
        type: 'raw' // Use 'hls' for JW Player on your website.

    },
    // You can add more streams here by copying the block above.
];

// ######################################################################
// ###                 NO NEED TO EDIT BELOW THIS LINE                ###
// ######################################################################

const MAX_PLAYLIST_SIZE = 15 * 1024; // 15KB buffer for HLS playlists

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.get('/*', async (req, res) => {
    // Find the stream configuration that matches the requested path
    const streamConfig = STREAMS.find(s => s.alias === req.path);

    if (!streamConfig) {
        return res.status(404).send('Stream alias not found.');
    }

    const originalUrl = streamConfig.source;
    const streamType = streamConfig.type;
    const sourceHost = new URL(originalUrl).host;

    console.log(`Type: ${streamType.toUpperCase()} | Alias: ${streamConfig.alias} -> Source: ${originalUrl}`);

    try {
        const response = await axios({
            method: 'get',
            url: originalUrl,
            responseType: 'stream',
            headers: {
                'Host': sourceHost,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
            }
        });

        // --- Logic for RAW streams (for OTT Navigator) ---
        if (streamType === 'raw') {
            response.data.pipe(res);
            return;
        }

        // --- Logic for HLS streams (for Website / JW Player) ---
        if (streamType === 'hls') {
            const isManifest = originalUrl.includes('.m3u8');
            if (isManifest) {
                let body = Buffer.from([]);
                const stream = response.data;
                const finish = () => {
                    stream.destroy();
                    if (!res.headersSent) {
                        let content = body.toString('utf8');
                        const regex = new RegExp(new URL(originalUrl).origin, 'g');
                        content = content.replace(regex, '');
                        res.send(content);
                    }
                };
                const onData = (chunk) => {
                    body = Buffer.concat([body, chunk]);
                    if (body.length > MAX_PLAYLIST_SIZE) finish();
                };
                stream.on('data', onData);
                stream.on('end', finish);
            } else {
                // For .ts video segments of an HLS stream
                response.data.pipe(res);
            }
            return;
        }

        // Default case if type is not recognized
        res.status(500).send('Unknown stream type in configuration.');

    } catch (error) {
        console.error("Error in proxy request:", error.message);
        res.status(502).send('Error fetching from the original server.');
    }
});

app.listen(PORT, () => {
    console.log(`Multi-stream proxy server listening on port ${PORT}`);
});
