import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8000;
const rootDir = process.cwd();

// Find Local Wi-Fi IPv4 Address
function getLocalIP() {
	const interfaces = os.networkInterfaces();
	for (const name of Object.keys(interfaces)) {
		for (const iface of interfaces[name]) {
			if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254')) {
				return iface.address;
			}
		}
	}
	return 'localhost';
}

const localIP = getLocalIP();

// MIME Types
const MIME_TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.glb': 'model/gltf-binary',
	'.gltf': 'model/gltf+json',
	'.mp3': 'audio/mpeg',
	'.wav': 'audio/wav',
	'.svg': 'image/svg+xml'
};

// HTTP Static Server
const server = http.createServer((req, res) => {
	let reqUrl = req.url.split('?')[0];
	if (reqUrl === '/' || reqUrl === '') reqUrl = '/index.html';

	const filePath = path.join(rootDir, reqUrl);
	const ext = path.extname(filePath).toLowerCase();
	const contentType = MIME_TYPES[ext] || 'application/octet-stream';

	fs.readFile(filePath, (err, content) => {
		if (err) {
			if (err.code === 'ENOENT') {
				res.writeHead(404, { 'Content-Type': 'text/plain' });
				res.end('404 Not Found');
			} else {
				res.writeHead(500, { 'Content-Type': 'text/plain' });
				res.end('500 Server Error: ' + err.code);
			}
		} else {
			res.writeHead(200, {
				'Content-Type': contentType,
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'no-cache, no-store, must-revalidate'
			});
			res.end(content);
		}
	});
});

// Built-in Local WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });
const rooms = new Map(); // roomCode -> { pc: ws, phone: ws }

wss.on('connection', (ws) => {
	let currentRoom = null;
	let role = null;

	ws.on('message', (message) => {
		try {
			const msg = JSON.parse(message.toString());

			// Join Room
			if (msg.type === 'join') {
				currentRoom = msg.room.toUpperCase().trim();
				role = msg.role; // 'pc' or 'phone'

				if (!rooms.has(currentRoom)) {
					rooms.set(currentRoom, { pc: null, phone: null });
				}

				const roomObj = rooms.get(currentRoom);
				roomObj[role] = ws;

				// Notify mutual connection
				if (roomObj.pc && roomObj.phone) {
					roomObj.pc.send(JSON.stringify({ type: 'status', connected: true }));
					roomObj.phone.send(JSON.stringify({ type: 'status', connected: true }));
					console.log(`[Same Wi-Fi] 📱 Phone paired with 🖥️ PC in Room: ${currentRoom} (0ms LAN Ping)`);
				}
				return;
			}

			// Forward Telemetry / Feedback
			if (currentRoom && rooms.has(currentRoom)) {
				const roomObj = rooms.get(currentRoom);
				if (role === 'phone' && roomObj.pc && roomObj.pc.readyState === 1) {
					roomObj.pc.send(JSON.stringify(msg));
				} else if (role === 'pc' && roomObj.phone && roomObj.phone.readyState === 1) {
					roomObj.phone.send(JSON.stringify(msg));
				}
			}
		} catch (e) {}
	});

	ws.on('close', () => {
		if (currentRoom && rooms.has(currentRoom)) {
			const roomObj = rooms.get(currentRoom);
			if (role && roomObj[role] === ws) {
				roomObj[role] = null;
				const otherRole = role === 'pc' ? 'phone' : 'pc';
				if (roomObj[otherRole] && roomObj[otherRole].readyState === 1) {
					roomObj[otherRole].send(JSON.stringify({ type: 'status', connected: false }));
				}
			}
		}
	});
});

server.listen(PORT, '0.0.0.0', () => {
	console.log('\n============================================================');
	console.log('🚗 RealDrive: Direct Local Wi-Fi Server Active!');
	console.log('============================================================');
	console.log(`🖥️ PC Game URL:        http://localhost:${PORT}/`);
	console.log(`📱 Same Wi-Fi Mobile:  http://${localIP}:${PORT}/phone.html`);
	console.log('============================================================\n');
});
