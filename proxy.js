const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8787;
const RAILRADAR_BASE = 'api.railradar.in';
const API_KEY = process.env.RAILRADAR_API_KEY;

if (!API_KEY) {
    console.error('RAILRADAR_API_KEY is missing.');
    process.exit(1);
}

const publicFolder = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
    );
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, OPTIONS'
    );

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // =========================
    // RAILRADAR API
    // =========================

    if (req.url.startsWith('/api/')) {

        const upstreamPath = req.url.replace(/^\/api/, '');

        const upstreamReq = https.request(
            {
                hostname: RAILRADAR_BASE,
                path: upstreamPath,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Accept': 'application/json'
                }
            },
            (upstreamRes) => {

                res.writeHead(upstreamRes.statusCode, {
                    'Content-Type': 'application/json'
                });

                upstreamRes.pipe(res);
            }
        );

        upstreamReq.on('error', (err) => {

            res.writeHead(502, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                error: 'Upstream request failed',
                detail: err.message
            }));
        });

        upstreamReq.end();
        return;
    }

    // =========================
    // FRONTEND
    // =========================

    let requestedFile;

    if (req.url === '/') {
        requestedFile = '/index.html';
    } else {
        requestedFile = req.url;
    }

    requestedFile = requestedFile.split('?')[0];

    const filePath = path.join(
        publicFolder,
        requestedFile
    );

    // Security check
    if (!filePath.startsWith(publicFolder)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {

        if (err) {

            if (err.code === 'ENOENT') {
                res.writeHead(404, {
                    'Content-Type': 'text/plain'
                });

                res.end('Page not found');
                return;
            }

            res.writeHead(500, {
                'Content-Type': 'text/plain'
            });

            res.end('Server error');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();

        const contentTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };

        const contentType =
            contentTypes[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType
        });

        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('================================');
    console.log(' RailRadar Server Started');
    console.log('================================');
    console.log('');
    console.log(`Port: ${PORT}`);
});