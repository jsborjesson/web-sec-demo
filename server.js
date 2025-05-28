const http = require('http');
const url = require('url');
const fs = require('fs');
const crypto = require('crypto');

const users = {
    'admin': 'admin123',
    'jimmy': 'pass123',
    'jeff': 'pass456'
};

const sessions = {};

const MESSAGES_FILE = 'messages.txt';

if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, '');
}

function readMessages() {
    const content = fs.readFileSync(MESSAGES_FILE, 'utf8');
    return content ? content.split('\n')
        .filter(line => line.trim())
        .map(line => {
            const [username, message] = line.split('|');
            return { username, message };
        }) : [];
}

function writeMessage(username, message) {
    fs.appendFileSync(MESSAGES_FILE, `${username}|${message}\n`);
}

function createSession(username) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    sessions[sessionId] = {
        username: username,
        createdAt: Date.now()
    };
    return sessionId;
}

function getSession(cookie) {
    if (!cookie) return null;
    const sessionId = cookie.split(';')
        .find(c => c.trim().startsWith('sessionId='))
        ?.split('=')[1];
    return sessionId ? sessions[sessionId] : null;
}

function clearMessages() {
    fs.writeFileSync(MESSAGES_FILE, '');
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const session = getSession(req.headers.cookie);

    res.setHeader('Content-Type', 'text/html');

    // Login page
    if (path === '/') {
        res.writeHead(200);
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Login</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    .form-group { margin-bottom: 15px; }
                    input { padding: 5px; width: 200px; }
                    button { padding: 5px 15px; }
                </style>
            </head>
            <body>
                <h1>Login</h1>
                <form action="/login" method="POST">
                    <div class="form-group">
                        <label>Username: <input type="text" name="username" required></label>
                    </div>
                    <div class="form-group">
                        <label>Password: <input type="password" name="password" required></label>
                    </div>
                    <button type="submit">Login</button>
                </form>
            </body>
            </html>
        `);
    // Login request
    } else if (path === '/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const username = params.get('username');
            const password = params.get('password');

            if (users[username] === password) {
                const sessionId = createSession(username);
                res.writeHead(302, {
                    'Location': '/wall',
                    // 'Set-Cookie': `sessionId=${sessionId}; HttpOnly; Path=/`
                    'Set-Cookie': `sessionId=${sessionId}; Path=/`
                });
                res.end();
            } else {
                res.writeHead(302, { 'Location': '/' });
                res.end();
            }
        });
    // Baselook page
    } else if (path === '/wall') {
        if (!session) {
            res.writeHead(302, { 'Location': '/' });
            res.end();
            return;
        }

        const messages = readMessages();
        const isAdmin = session.username === 'admin';
        res.writeHead(200);
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Baselook</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    .message { border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; }
                    .message-header { color: #666; font-size: 0.9em; margin-bottom: 5px; }
                    .form-group { margin-bottom: 15px; }
                    textarea { width: 100%; height: 100px; }
                    button { padding: 5px 15px; }
                    .header { display: flex; justify-content: space-between; align-items: center; }
                    .actions { display: flex; gap: 10px; }
                    .user-info { color: #666; font-size: 0.9em; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Baselook</h1>
                    <div class="actions">
                        ${isAdmin ? `
                            <form action="/reset" method="POST" style="margin: 0;">
                                <button type="submit" onclick="return confirm('Are you sure you want to delete all messages?')">Reset messages</button>
                            </form>
                        ` : ''}
                        <form action="/logout" method="POST" style="margin: 0;">
                            <button type="submit">Logout</button>
                        </form>
                    </div>
                </div>
                <div class="user-info">
                    Logged in as: <strong>${session.username}</strong>
                </div>
                <form action="/post" method="POST">
                    <div class="form-group">
                        <textarea name="message" required placeholder="Write your message here..."></textarea>
                    </div>
                    <button type="submit">Post Message</button>
                </form>
                <h2>Messages:</h2>
                ${messages.map(msg => `
                    <div class="message">
                        <div class="message-header">Posted by ${msg.username}</div>
                        <div class="message-content">${msg.message}</div>
                    </div>
                `).join('')}
            </body>
            </html>
        `);
    // Post message
    } else if (path === '/post' && req.method === 'POST') {
        if (!session) {
            res.writeHead(302, { 'Location': '/' });
            res.end();
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const message = params.get('message');
            writeMessage(session.username, message);
            res.writeHead(302, { 'Location': '/wall' });
            res.end();
        });
    // Log out
    } else if (path === '/logout' && req.method === 'POST') {
        res.writeHead(302, {
            'Location': '/',
            'Set-Cookie': 'sessionId=; HttpOnly; Path=/; Max-Age=0'
        });
        res.end();
    // Clear messages
    } else if (path === '/reset' && req.method === 'POST') {
        if (!session || session.username !== 'admin') {
            res.writeHead(302, { 'Location': '/wall' });
            res.end();
            return;
        }

        clearMessages();
        res.writeHead(302, { 'Location': '/wall' });
        res.end();
    // 404
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
