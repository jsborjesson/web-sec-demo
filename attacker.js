const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query;

    // Log the request
    console.log(req.url);

    // Check if there's a password parameter
    if (query.password) {
        res.writeHead(302, {
            'Location': 'http://localhost:3000/wall?pwn'
        });
        res.end();
        return;
    }

    // Default response
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end();
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Logger server running at http://localhost:${PORT}/`);
});
