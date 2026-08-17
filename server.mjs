import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8000;

// Find local Wi-Fi / Hotspot IPv4 address
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
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.mjs': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.svg': 'image/svg+xml',
	'.glb': 'model/gltf-binary',
	'.gltf': 'model/gltf+json',
	'.wav': 'audio/wav',
	'.mp3': 'audio/mpeg',
	'.ogg': 'audio/ogg'
};

// WebSocket Clients
const rooms = new Map(); // roomId -> { host, phones: Set }

// HTTP Server
const server = http.createServer((req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', '*');

	let reqPath = req.url.split('?')[0];
	if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

	// Handle special API to query laptop's local IP
	if (reqPath === '/api/local-ip') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ ip: localIP, port: PORT }));
		return;
	}

	const filePath = path.join(__dirname, reqPath);

	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('File not found');
			return;
		}

		const ext = path.extname(filePath).toLowerCase();
		const contentType = MIME_TYPES[ext] || 'application/octet-stream';

		res.writeHead(200, { 'Content-Type': contentType });
		res.end(data);
	});
});

// RFC-6455 WebSocket Handshake & Frame Handling
server.on('upgrade', (req, socket) => {
	const key = req.headers['sec-websocket-key'];
	if (!key) {
		socket.destroy();
		return;
	}

	const acceptKey = crypto
		.createHash('sha1')
		.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
		.digest('base64');

	const headers = [
		'HTTP/1.1 101 Switching Protocols',
		'Upgrade: websocket',
		'Connection: Upgrade',
		`Sec-WebSocket-Accept: ${acceptKey}`
	];

	socket.write(headers.join('\r\n') + '\r\n\r\n');

	const urlObj = new URL(req.url, `http://${req.headers.host}`);
	const role = urlObj.searchParams.get('role') || 'phone';
	const room = (urlObj.searchParams.get('room') || 'default').toUpperCase();

	if (!rooms.has(room)) {
		rooms.set(room, { host: null, phones: new Set() });
	}

	const roomData = rooms.get(room);
	if (role === 'host') {
		roomData.host = socket;
		console.log(`💻 [Host Game Connected] Room Code: ${room}`);
	} else {
		roomData.phones.add(socket);
		console.log(`📱 [Mobile Phone Connected] Room Code: ${room}`);
		if (roomData.host) {
			sendWSFrame(roomData.host, JSON.stringify({ event: 'phone_connected', room }));
		}
	}

	socket.on('data', (buffer) => {
		const message = decodeWSFrame(buffer);
		if (!message) return;

		if (role === 'phone') {
			if (roomData.host) {
				sendWSFrame(roomData.host, message);
			}
		} else if (role === 'host') {
			for (const pSocket of roomData.phones) {
				sendWSFrame(pSocket, message);
			}
		}
	});

	socket.on('close', () => {
		if (role === 'host') {
			roomData.host = null;
			console.log(`💻 [Host Game Disconnected] Room Code: ${room}`);
		} else {
			roomData.phones.delete(socket);
			console.log(`📱 [Mobile Phone Disconnected] Room Code: ${room}`);
			if (roomData.host) {
				sendWSFrame(roomData.host, JSON.stringify({ event: 'phone_disconnected', room }));
			}
		}
	});
});

function decodeWSFrame(buffer) {
	if (buffer.length < 2) return null;
	const secondByte = buffer[1];
	const isMasked = (secondByte & 0x80) === 0x80;
	let length = secondByte & 0x7f;
	let offset = 2;

	if (length === 126) {
		if (buffer.length < 4) return null;
		length = buffer.readUInt16BE(2);
		offset = 4;
	} else if (length === 127) {
		if (buffer.length < 10) return null;
		length = Number(buffer.readBigUInt64BE(2));
		offset = 10;
	}

	if (!isMasked) {
		if (buffer.length < offset + length) return null;
		return buffer.slice(offset, offset + length).toString('utf8');
	}

	if (buffer.length < offset + 4 + length) return null;
	const mask = buffer.slice(offset, offset + 4);
	offset += 4;

	const payload = Buffer.alloc(length);
	for (let i = 0; i < length; i++) {
		payload[i] = buffer[offset + i] ^ mask[i % 4];
	}

	return payload.toString('utf8');
}

function sendWSFrame(socket, message) {
	if (!socket || socket.destroyed) return;
	const payload = Buffer.from(message, 'utf8');
	const length = payload.length;

	let header;
	if (length <= 125) {
		header = Buffer.from([0x81, length]);
	} else if (length <= 65535) {
		header = Buffer.alloc(4);
		header[0] = 0x81;
		header[1] = 126;
		header.writeUInt16BE(length, 2);
	} else {
		header = Buffer.alloc(10);
		header[0] = 0x81;
		header[1] = 127;
		header.writeBigUInt64BE(BigInt(length), 2);
	}

	try {
		socket.write(Buffer.concat([header, payload]));
	} catch (e) {}
}

server.listen(PORT, '0.0.0.0', () => {
	console.log('\n======================================================');
	console.log('  🏎️  REALDRIVE LOCAL WI-FI / HOTSPOT SERVER');
	console.log('======================================================\n');
	console.log(`💻 On your Laptop:   http://localhost:${PORT}`);
	console.log(`📱 On your Phone:    http://${localIP}:${PORT}/phone.html\n`);
	console.log('✨ Connect your laptop and phone to the SAME WI-FI or PHONE HOTSPOT.');
	console.log('⚡ 0ms Latency, 100% Offline, Zero Internet Required!\n');
	console.log('======================================================\n');
});
