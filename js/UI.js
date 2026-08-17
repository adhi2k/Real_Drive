/**
 * RealDrive: Glassmorphic UI, Phone Motion Controller Pairing, AI Track Generator & Campaign Levels
 */
import { PRESET_TRACKS, CAMPAIGN_LEVELS, generateProceduralTrack, generateTrackFromPrompt } from './TrackGenerator.js';
import { encodeCells, decodeCells } from './Track.js';

export class GameUI {

	constructor(callbacks = {}) {

		this.onSelectTrack = callbacks.onSelectTrack || (() => {});
		this.onTogglePerf = callbacks.onTogglePerf || (() => {});
		this.phoneController = callbacks.phoneController || null;
		this.currentTrackKey = 'default';
		this.currentLevelId = null;
		this.turboActive = false;

		this.init();

	}

	init() {

		this.injectStyles();
		this.buildDOM();
		this.bindEvents();

		// Check current URL map parameter to highlight the correct preset
		const urlParams = new URLSearchParams(window.location.search);
		const mapParam = urlParams.get('map');

		if (mapParam) {
			let matchedPreset = 'custom';
			for (const [key, preset] of Object.entries(PRESET_TRACKS)) {
				if (preset.cells && encodeCells(preset.cells) === mapParam) {
					matchedPreset = key;
					break;
				}
			}
			this.setActiveTrack(matchedPreset);
		} else {
			this.setActiveTrack('default');
		}

		// Hook Phone Controller Callbacks
		if (this.phoneController) {
			this.phoneController.onConnect = () => this.onPhoneConnected();
			this.phoneController.onDisconnect = () => this.onPhoneDisconnected();
		}

	}

	injectStyles() {

		if (document.getElementById('realdrive-ui-styles')) return;

		const style = document.createElement('style');
		style.id = 'realdrive-ui-styles';
		style.textContent = `
			:root {
				--bg-glass: rgba(14, 20, 32, 0.82);
				--border-glass: rgba(255, 255, 255, 0.14);
				--neon-cyan: #00f7ff;
				--neon-pink: #ff007f;
				--neon-lime: #5af168;
				--neon-gold: #fbbf24;
				--text-main: #f0f4f8;
				--text-dim: #94a3b8;
			}

			/* Top Control Bar */
			#realdrive-topbar {
				position: absolute;
				top: 12px;
				left: 50%;
				transform: translateX(-50%);
				display: flex;
				align-items: center;
				gap: 7px;
				padding: 6px 10px;
				background: var(--bg-glass);
				backdrop-filter: blur(16px);
				-webkit-backdrop-filter: blur(16px);
				border: 1px solid var(--border-glass);
				border-radius: 999px;
				box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
				z-index: 50;
				max-width: 96vw;
				overflow-x: auto;
				scrollbar-width: none;
			}
			#realdrive-topbar::-webkit-scrollbar { display: none; }

			.track-pill {
				padding: 7px 13px;
				border: 1px solid transparent;
				border-radius: 999px;
				background: rgba(255, 255, 255, 0.05);
				color: var(--text-dim);
				font: 600 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
				cursor: pointer;
				transition: all 0.2s ease;
				white-space: nowrap;
				display: flex;
				align-items: center;
				gap: 5px;
			}
			.track-pill:hover {
				background: rgba(255, 255, 255, 0.12);
				color: #fff;
			}
			.track-pill.active {
				background: linear-gradient(135deg, rgba(0, 247, 255, 0.25), rgba(0, 150, 255, 0.35));
				border-color: var(--neon-cyan);
				color: #fff;
				box-shadow: 0 0 14px rgba(0, 247, 255, 0.4);
			}

			.ui-separator {
				width: 1px;
				height: 20px;
				background: var(--border-glass);
				flex-shrink: 0;
			}

			.btn-action-pill {
				padding: 7px 13px;
				border-radius: 999px;
				border: 1px solid var(--border-glass);
				background: rgba(255, 255, 255, 0.08);
				color: #fff;
				font: 600 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
				cursor: pointer;
				transition: all 0.2s ease;
				display: flex;
				align-items: center;
				gap: 5px;
				white-space: nowrap;
			}
			.btn-action-pill:hover {
				background: rgba(255, 255, 255, 0.18);
				transform: translateY(-1px);
			}
			.btn-action-pill.btn-neon-ai {
				background: linear-gradient(135deg, #ff007f, #7928ca);
				border-color: rgba(255, 0, 127, 0.6);
				box-shadow: 0 0 12px rgba(255, 0, 127, 0.35);
			}
			.btn-action-pill.btn-neon-levels {
				background: linear-gradient(135deg, #f59e0b, #d97706);
				border-color: rgba(245, 158, 11, 0.6);
				color: #fff;
				box-shadow: 0 0 12px rgba(245, 158, 11, 0.35);
			}
			.btn-action-pill.btn-neon-phone {
				background: rgba(0, 247, 255, 0.1);
				border-color: rgba(0, 247, 255, 0.4);
				color: var(--neon-cyan);
			}
			.btn-action-pill.btn-neon-phone.active {
				background: linear-gradient(135deg, #10b981, #059669);
				color: #fff;
				font-weight: 700;
				border-color: #10b981;
				box-shadow: 0 0 16px rgba(16, 185, 129, 0.6);
			}

			/* Modals */
			.realdrive-modal-overlay {
				position: fixed;
				inset: 0;
				background: rgba(0, 0, 0, 0.78);
				backdrop-filter: blur(14px);
				-webkit-backdrop-filter: blur(14px);
				display: flex;
				align-items: center;
				justify-content: center;
				z-index: 100;
				opacity: 0;
				pointer-events: none;
				transition: opacity 0.25s ease;
			}
			.realdrive-modal-overlay.show {
				opacity: 1;
				pointer-events: auto;
			}

			.modal-card {
				width: 520px;
				max-width: 92vw;
				background: #0f172a;
				border: 1px solid rgba(0, 247, 255, 0.25);
				border-radius: 20px;
				padding: 24px;
				box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 247, 255, 0.15);
				color: #fff;
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			}

			.modal-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 20px;
			}
			.modal-title {
				font-size: 18px;
				font-weight: 700;
				display: flex;
				align-items: center;
				gap: 8px;
				background: linear-gradient(135deg, #00f7ff, #ff007f);
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
			}
			.modal-close {
				background: none;
				border: none;
				color: var(--text-dim);
				font-size: 20px;
				cursor: pointer;
			}
			.modal-close:hover { color: #fff; }

			.modal-body label {
				display: block;
				font-size: 12px;
				font-weight: 600;
				color: var(--text-dim);
				margin-bottom: 6px;
				text-transform: uppercase;
				letter-spacing: 0.05em;
			}
			.modal-input {
				width: 100%;
				padding: 12px 14px;
				background: rgba(255, 255, 255, 0.06);
				border: 1px solid var(--border-glass);
				border-radius: 10px;
				color: #fff;
				font-size: 14px;
				margin-bottom: 16px;
				outline: none;
				box-sizing: border-box;
			}
			.modal-input:focus {
				border-color: var(--neon-cyan);
				box-shadow: 0 0 10px rgba(0, 247, 255, 0.3);
			}

			.param-row {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 12px;
				margin-bottom: 20px;
			}
			.modal-select {
				width: 100%;
				padding: 10px;
				background: #1e293b;
				border: 1px solid var(--border-glass);
				border-radius: 10px;
				color: #fff;
				font-size: 13px;
				outline: none;
			}

			.modal-actions {
				display: flex;
				gap: 10px;
				margin-top: 10px;
			}
			.btn-modal {
				flex: 1;
				padding: 12px;
				border-radius: 12px;
				border: none;
				font-weight: 700;
				font-size: 14px;
				cursor: pointer;
				transition: transform 0.15s, box-shadow 0.15s;
			}
			.btn-modal:hover { transform: translateY(-2px); }
			.btn-modal-primary {
				background: linear-gradient(135deg, #00f7ff, #0070f3);
				color: #000;
				box-shadow: 0 4px 14px rgba(0, 247, 255, 0.4);
			}
			.btn-modal-secondary {
				background: rgba(255, 255, 255, 0.08);
				color: #fff;
				border: 1px solid var(--border-glass);
			}

			/* Phone Pairing QR Section */
			.phone-qr-box {
				display: flex;
				flex-direction: column;
				align-items: center;
				background: rgba(255, 255, 255, 0.03);
				border: 1px solid var(--border-glass);
				border-radius: 16px;
				padding: 20px;
				margin-bottom: 16px;
			}
			#qrcode-container {
				background: #fff;
				padding: 12px;
				border-radius: 12px;
				box-shadow: 0 0 20px rgba(0, 247, 255, 0.3);
				margin-bottom: 14px;
			}
			.room-code-badge {
				font-size: 28px;
				font-weight: 900;
				letter-spacing: 4px;
				color: var(--neon-cyan);
				text-shadow: 0 0 12px rgba(0, 247, 255, 0.6);
				margin-bottom: 4px;
			}
			.connection-status-pill {
				display: inline-flex;
				align-items: center;
				gap: 6px;
				background: rgba(255, 255, 255, 0.08);
				padding: 4px 14px;
				border-radius: 999px;
				font-size: 12px;
				font-weight: 700;
				margin-top: 8px;
			}

			/* Phone HUD Badge */
			#phone-hud-badge {
				position: fixed;
				bottom: 16px;
				right: 16px;
				background: var(--bg-glass);
				backdrop-filter: blur(14px);
				border: 1px solid rgba(0, 247, 255, 0.4);
				border-radius: 14px;
				padding: 10px 16px;
				display: flex;
				align-items: center;
				gap: 12px;
				color: #fff;
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
				box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 16px rgba(0, 247, 255, 0.2);
				z-index: 60;
				transition: all 0.3s ease;
			}
			#phone-hud-badge.hidden {
				opacity: 0;
				transform: translateY(20px);
				pointer-events: none;
			}

			/* Levels Modal List */
			.levels-list {
				display: flex;
				flex-direction: column;
				gap: 10px;
				max-height: 55vh;
				overflow-y: auto;
				padding-right: 4px;
			}
			.level-card {
				background: rgba(255, 255, 255, 0.04);
				border: 1px solid rgba(255, 255, 255, 0.08);
				border-radius: 14px;
				padding: 12px 16px;
				display: flex;
				align-items: center;
				justify-content: space-between;
				transition: all 0.2s;
			}
			.level-card:hover {
				background: rgba(255, 255, 255, 0.08);
				border-color: rgba(245, 158, 11, 0.4);
			}
			.level-card.locked {
				opacity: 0.5;
				filter: grayscale(0.8);
				pointer-events: none;
			}
			.level-card.active-level {
				border-color: var(--neon-gold);
				background: rgba(245, 158, 11, 0.1);
				box-shadow: 0 0 16px rgba(245, 158, 11, 0.2);
			}
			.level-info-title {
				font-size: 14px;
				font-weight: 700;
				color: #fff;
			}
			.level-info-sub {
				font-size: 11px;
				color: var(--text-dim);
				margin-top: 2px;
			}
			.level-stars {
				font-size: 16px;
				letter-spacing: 2px;
				color: var(--neon-gold);
			}
			.btn-play-level {
				padding: 8px 16px;
				border-radius: 999px;
				border: none;
				background: linear-gradient(135deg, #f59e0b, #d97706);
				color: #000;
				font-weight: 700;
				font-size: 12px;
				cursor: pointer;
				transition: transform 0.15s;
			}
			.btn-play-level:hover { transform: scale(1.05); }

			/* Celebratory Finish Popup */
			#lap-celebration-popup {
				position: fixed;
				top: 45%;
				left: 50%;
				transform: translate(-50%, -50%) scale(0.8);
				background: rgba(15, 23, 42, 0.92);
				backdrop-filter: blur(20px);
				border: 2px solid var(--neon-gold);
				box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 158, 11, 0.4);
				border-radius: 24px;
				padding: 26px 36px;
				color: #fff;
				text-align: center;
				z-index: 150;
				opacity: 0;
				pointer-events: none;
				transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			}
			#lap-celebration-popup.show {
				opacity: 1;
				pointer-events: auto;
				transform: translate(-50%, -50%) scale(1);
			}
			.finish-trophy {
				font-size: 44px;
				margin-bottom: 6px;
				animation: trophyBounce 0.8s ease infinite alternate;
			}
			@keyframes trophyBounce {
				0% { transform: translateY(0); }
				100% { transform: translateY(-8px); }
			}
			.finish-title {
				font-size: 22px;
				font-weight: 800;
				background: linear-gradient(135deg, #fbbf24, #f59e0b, #ff007f);
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
				letter-spacing: 0.05em;
			}
			.finish-time {
				font-size: 32px;
				font-weight: 800;
				color: #fff;
				font-variant-numeric: tabular-nums;
				margin: 8px 0;
			}
			.finish-stars {
				font-size: 24px;
				letter-spacing: 4px;
				color: var(--neon-gold);
				margin-bottom: 16px;
			}
			.finish-actions {
				display: flex;
				gap: 10px;
				justify-content: center;
			}

			/* Toast */
			#realdrive-toast {
				position: fixed;
				bottom: 30px;
				left: 50%;
				transform: translateX(-50%) translateY(20px);
				padding: 10px 22px;
				background: rgba(14, 20, 32, 0.95);
				backdrop-filter: blur(16px);
				color: #fff;
				font: 600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
				border: 1px solid var(--border-glass);
				border-radius: 999px;
				box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
				opacity: 0;
				pointer-events: none;
				transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
				z-index: 200;
			}
			#realdrive-toast.show {
				opacity: 1;
				transform: translateX(-50%) translateY(0);
			}
		`;
		document.head.appendChild(style);

	}

	buildDOM() {

		// Topbar
		const topbar = document.createElement('div');
		topbar.id = 'realdrive-topbar';
		topbar.innerHTML = `
			<button id="btn-open-levels-modal" class="btn-action-pill btn-neon-levels">🏆 Levels</button>
			<div class="ui-separator"></div>
			<button class="track-pill active" data-track="default">🏁 Standard</button>
			<button class="track-pill" data-track="chennai-highway">🏎️ Chennai Hwy</button>
			<button class="track-pill" data-track="mountain-pass">⛰️ Mountain Pass</button>
			<button class="track-pill" data-track="coastal-loop">🌊 Coastal Loop</button>
			<button class="track-pill" data-track="city-circuit">🏙️ Neon City</button>
			<div class="ui-separator"></div>
			<button id="btn-open-ai-modal" class="btn-action-pill btn-neon-ai">✨ AI Track Generator</button>
			<div class="ui-separator"></div>
			<button id="btn-open-phone-modal" class="btn-action-pill btn-neon-phone">📱 Phone Steering: Off</button>
			<button id="btn-toggle-perf" class="btn-action-pill" title="Toggle Turbo Performance Mode">🚀 Turbo: Off</button>
			<button id="btn-share-track" class="btn-action-pill" title="Share this track">🔗 Share</button>
			<span id="hud-fps-pill" class="btn-action-pill" style="pointer-events: none; font-variant-numeric: tabular-nums; color: var(--neon-lime);">60 FPS</span>
		`;
		document.body.appendChild(topbar);

		// Phone Pairing Modal
		const phoneModal = document.createElement('div');
		phoneModal.id = 'phone-modal';
		phoneModal.className = 'realdrive-modal-overlay';
		phoneModal.innerHTML = `
			<div class="modal-card">
				<div class="modal-header">
					<div class="modal-title">📱 Connect Mobile Steering Controller</div>
					<button class="modal-close" id="btn-close-phone">✕</button>
				</div>
				<div class="modal-body">
					<div class="phone-qr-box">
						<div id="qrcode-container"></div>
						<div class="room-code-badge" id="room-code-display">----</div>
						<div style="font-size: 11px; color: var(--text-dim);">Scan QR code with phone camera or visit:</div>
						<div id="phone-url-display" style="font-size: 12px; color: var(--neon-cyan); margin-top: 4px; word-break: break-all;"></div>
						<div id="phone-connection-status" class="connection-status-pill">
							<span style="color: #eab308;">🟡</span> Waiting for phone connection...
						</div>
					</div>

					<label>Custom IP / Hostname (for local WiFi)</label>
					<input id="phone-host-input" class="modal-input" type="text" value="${window.location.hostname || 'localhost'}" />

					<div class="modal-actions">
						<button id="btn-open-phone-tab" class="btn-modal btn-modal-secondary">🧪 Open on this PC (Test Tab)</button>
						<button id="btn-copy-phone-url" class="btn-modal btn-modal-primary">📋 Copy Link</button>
					</div>
				</div>
			</div>
		`;
		document.body.appendChild(phoneModal);

		// Phone HUD Badge
		const phoneBadge = document.createElement('div');
		phoneBadge.id = 'phone-hud-badge';
		phoneBadge.className = 'hidden';
		phoneBadge.innerHTML = `
			<div style="font-size: 20px;">📱</div>
			<div>
				<div style="font-size: 12px; font-weight: 800; color: var(--neon-lime);">PHONE CONNECTED</div>
				<div style="font-size: 10px; color: var(--text-dim);" id="phone-hud-telemetry">Tilt to steer • Gas/Brake pedals active</div>
			</div>
		`;
		document.body.appendChild(phoneBadge);

		// AI Generator Modal
		const modal = document.createElement('div');
		modal.id = 'ai-generator-modal';
		modal.className = 'realdrive-modal-overlay';
		modal.innerHTML = `
			<div class="modal-card">
				<div class="modal-header">
					<div class="modal-title">✨ AI Procedural Track Generator</div>
					<button class="modal-close" id="btn-close-modal">✕</button>
				</div>
				<div class="modal-body">
					<label>Natural Prompt / Style</label>
					<input id="ai-prompt-input" class="modal-input" type="text" placeholder="e.g. Mountain road with fast S-curves and high jumps..." value="" />
					
					<div class="param-row">
						<div>
							<label>Difficulty</label>
							<select id="ai-diff-select" class="modal-select">
								<option value="Easy">Easy (Wide curves)</option>
								<option value="Medium" selected>Medium (Balanced)</option>
								<option value="Hard">Hard (Hairpins & Chicanes)</option>
							</select>
						</div>
						<div>
							<label>Jump Bumps</label>
							<select id="ai-bumps-select" class="modal-select">
								<option value="0.1">Few Jumps (10%)</option>
								<option value="0.35" selected>Balanced Jumps (35%)</option>
								<option value="0.6">Rally Jumps (60%)</option>
							</select>
						</div>
					</div>

					<div class="modal-actions">
						<button id="btn-ai-random" class="btn-modal btn-modal-secondary">🎲 Randomize</button>
						<button id="btn-ai-generate" class="btn-modal btn-modal-primary">🚀 Generate & Drive</button>
					</div>
				</div>
			</div>
		`;
		document.body.appendChild(modal);

		// Campaign Levels Modal
		const levelsModal = document.createElement('div');
		levelsModal.id = 'levels-modal';
		levelsModal.className = 'realdrive-modal-overlay';
		levelsModal.innerHTML = `
			<div class="modal-card">
				<div class="modal-header">
					<div class="modal-title" style="background: linear-gradient(135deg, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
						🏆 Campaign Levels & Challenges
					</div>
					<button class="modal-close" id="btn-close-levels">✕</button>
				</div>
				<div class="modal-body">
					<div class="levels-list" id="levels-container">
						<!-- Injected by renderLevels() -->
					</div>
				</div>
			</div>
		`;
		document.body.appendChild(levelsModal);

		// Celebratory Lap Finish Popup
		const celebrationPopup = document.createElement('div');
		celebrationPopup.id = 'lap-celebration-popup';
		celebrationPopup.innerHTML = `
			<div class="finish-trophy">🏆</div>
			<div id="finish-status-title" class="finish-title">LAP COMPLETED!</div>
			<div id="finish-time-display" class="finish-time">0:00.00</div>
			<div id="finish-stars-display" class="finish-stars">⭐⭐⭐</div>
			<div class="finish-actions">
				<button id="btn-finish-retry" class="btn-modal btn-modal-secondary" style="flex: 0 0 auto; padding: 8px 18px;">🔄 Retry</button>
				<button id="btn-finish-next" class="btn-modal btn-modal-primary" style="display: none; padding: 8px 18px;">Next Level ➡️</button>
			</div>
		`;
		document.body.appendChild(celebrationPopup);

		// Toast
		const toast = document.createElement('div');
		toast.id = 'realdrive-toast';
		document.body.appendChild(toast);

		this.topbar = topbar;
		this.phoneModal = phoneModal;
		this.phoneBadge = phoneBadge;
		this.modal = modal;
		this.levelsModal = levelsModal;
		this.celebrationPopup = celebrationPopup;
		this.toast = toast;
		this.phoneBtn = topbar.querySelector('#btn-open-phone-modal');

	}

	bindEvents() {

		// Preset Track Pills
		this.topbar.querySelectorAll('.track-pill').forEach(btn => {
			btn.addEventListener('click', () => {
				const trackKey = btn.dataset.track;
				this.currentLevelId = null;
				this.selectPresetTrack(trackKey);
			});
		});

		// Phone Modal
		this.phoneBtn.addEventListener('click', () => {
			this.updateQRCode();
			this.phoneModal.classList.add('show');
		});

		this.phoneModal.querySelector('#btn-close-phone').addEventListener('click', () => {
			this.phoneModal.classList.remove('show');
		});

		this.phoneModal.addEventListener('click', (e) => {
			if (e.target === this.phoneModal) this.phoneModal.classList.remove('show');
		});

		// Update Host IP Input
		document.getElementById('phone-host-input').addEventListener('input', () => {
			this.updateQRCode();
		});

		// Copy Phone URL
		document.getElementById('btn-copy-phone-url').addEventListener('click', () => {
			const url = this.getPhoneControllerURL();
			navigator.clipboard.writeText(url).then(() => {
				this.showToast('📋 Controller URL copied to clipboard!');
			}).catch(() => {
				prompt('Copy controller URL:', url);
			});
		});

		// Open in Test Tab
		document.getElementById('btn-open-phone-tab').addEventListener('click', () => {
			const url = this.getPhoneControllerURL();
			window.open(url, '_blank');
		});

		// Setup Phone Controller Event Listeners
		if (this.phoneController) {
			this.phoneController.onConnect = () => {
				this.onPhoneConnected();
			};
			this.phoneController.onDisconnect = () => {
				this.onPhoneDisconnected();
			};
		}

		// Open AI Modal
		this.topbar.querySelector('#btn-open-ai-modal').addEventListener('click', () => {
			this.modal.classList.add('show');
			document.getElementById('ai-prompt-input').focus();
		});

		// Close AI Modal
		this.modal.querySelector('#btn-close-modal').addEventListener('click', () => {
			this.modal.classList.remove('show');
		});

		this.modal.addEventListener('click', (e) => {
			if (e.target === this.modal) this.modal.classList.remove('show');
		});

		// Open Levels Modal
		this.topbar.querySelector('#btn-open-levels-modal').addEventListener('click', () => {
			this.renderLevels();
			this.levelsModal.classList.add('show');
		});

		// Close Levels Modal
		this.levelsModal.querySelector('#btn-close-levels').addEventListener('click', () => {
			this.levelsModal.classList.remove('show');
		});

		this.levelsModal.addEventListener('click', (e) => {
			if (e.target === this.levelsModal) this.levelsModal.classList.remove('show');
		});

		// AI Generate & Drive
		document.getElementById('btn-ai-generate').addEventListener('click', () => {
			const prompt = document.getElementById('ai-prompt-input').value.trim();
			const diff = document.getElementById('ai-diff-select').value;
			const bumps = parseFloat(document.getElementById('ai-bumps-select').value);

			let generated;
			if (prompt.length > 0) {
				generated = generateTrackFromPrompt(prompt);
			} else {
				generated = generateProceduralTrack({
					width: diff === 'Hard' ? 10 : diff === 'Easy' ? 6 : 8,
					height: diff === 'Hard' ? 8 : diff === 'Easy' ? 6 : 7,
					difficulty: diff,
					bumpDensity: bumps
				});
			}

			this.modal.classList.remove('show');
			this.currentLevelId = null;
			this.showToast(`✨ Generated ${generated.name || 'Custom Circuit'}!`);
			this.loadCustomTrack(generated.cells, generated.encoded);
		});

		// AI Randomize
		document.getElementById('btn-ai-random').addEventListener('click', () => {
			const diffs = ['Easy', 'Medium', 'Hard'];
			const randomDiff = diffs[Math.floor(Math.random() * diffs.length)];
			document.getElementById('ai-diff-select').value = randomDiff;
			document.getElementById('ai-prompt-input').value = `Random ${randomDiff} circuit with jump crests`;
			document.getElementById('btn-ai-generate').click();
		});

		// Turbo Performance Toggle
		this.perfBtn = this.topbar.querySelector('#btn-toggle-perf');
		this.perfBtn.addEventListener('click', () => {
			this.turboActive = !this.turboActive;
			this.perfBtn.textContent = this.turboActive ? '🚀 Turbo: ON' : '🚀 Turbo: Off';
			this.perfBtn.classList.toggle('active', this.turboActive);
			this.showToast(this.turboActive ? '🚀 Turbo Mode Enabled (Ultra Smooth)' : '✨ Standard Graphics Restored');
			this.onTogglePerf(this.turboActive);
		});

		// Share Track Link
		this.topbar.querySelector('#btn-share-track').addEventListener('click', () => {
			const url = window.location.href;
			navigator.clipboard.writeText(url).then(() => {
				this.showToast('📋 Track link copied to clipboard!');
			}).catch(() => {
				prompt('Copy this track link:', url);
			});
		});

		// Celebration Popup Buttons
		document.getElementById('btn-finish-retry').addEventListener('click', () => {
			this.celebrationPopup.classList.remove('show');
		});

		document.getElementById('btn-finish-next').addEventListener('click', () => {
			this.celebrationPopup.classList.remove('show');
			if (this.currentLevelId) {
				const nextLevel = CAMPAIGN_LEVELS.find(l => l.id === this.currentLevelId + 1);
				if (nextLevel) {
					this.startCampaignLevel(nextLevel.id);
				}
			}
		});

		this.celebrationPopup.addEventListener('click', (e) => {
			if (e.target === this.celebrationPopup) {
				this.celebrationPopup.classList.remove('show');
			}
		});

	}

	getPhoneControllerURL() {

		const hostInput = document.getElementById('phone-host-input');
		const host = (hostInput && hostInput.value.trim()) || window.location.hostname || 'localhost';
		const port = (window.location.port && host === window.location.hostname) ? `:${window.location.port}` : '';
		const proto = window.location.protocol;
		const roomCode = this.phoneController ? this.phoneController.roomCode : 'DEMO';

		// Resolve current directory path (supports subdirectories like /Real_Drive/ on GitHub Pages)
		let basePath = window.location.pathname;
		basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
		if (!basePath.startsWith('/')) basePath = '/' + basePath;

		return `${proto}//${host}${port}${basePath}phone.html?v=${Date.now()}#${roomCode}`;

	}

	updateQRCode() {

		const url = this.getPhoneControllerURL();
		const roomCode = this.phoneController ? this.phoneController.roomCode : '----';
		
		document.getElementById('room-code-display').textContent = roomCode;
		document.getElementById('phone-url-display').textContent = url;

		const qrContainer = document.getElementById('qrcode-container');
		qrContainer.innerHTML = '';

		if (typeof QRCode !== 'undefined') {
			new QRCode(qrContainer, {
				text: url,
				width: 160,
				height: 160,
				colorDark: '#090d16',
				colorLight: '#ffffff',
				correctLevel: QRCode.CorrectLevel.M
			});
		} else {
			qrContainer.innerHTML = `<a href="${url}" target="_blank" style="color:#00f7ff;font-size:12px;">Open Phone Controller</a>`;
		}

	}

	onPhoneConnected() {

		this.phoneBtn.classList.add('active');
		this.phoneBtn.textContent = '📱 Phone Steering: ON';
		this.phoneBadge.classList.remove('hidden');

		const statusEl = document.getElementById('phone-connection-status');
		if (statusEl) {
			statusEl.innerHTML = `<span style="color: #10b981;">🟢</span> Connected! Phone is controlling vehicle.`;
		}

		this.showToast('📱 Mobile Phone Steering Connected!');

	}

	onPhoneDisconnected() {

		this.phoneBtn.classList.remove('active');
		this.phoneBtn.textContent = '📱 Phone Steering: Off';
		this.phoneBadge.classList.add('hidden');

		const statusEl = document.getElementById('phone-connection-status');
		if (statusEl) {
			statusEl.innerHTML = `<span style="color: #eab308;">🟡</span> Waiting for phone connection...`;
		}

		this.showToast('📱 Phone Controller Disconnected');

	}

	renderLevels() {

		const container = document.getElementById('levels-container');
		if (!container) return;

		const unlockedLevel = parseInt(localStorage.getItem('realdrive.unlockedLevel') || '1', 10);
		container.innerHTML = '';

		CAMPAIGN_LEVELS.forEach(lvl => {

			const isUnlocked = lvl.id <= unlockedLevel;
			const bestTime = parseFloat(localStorage.getItem(`racing.bestLap.${lvl.trackKey}`) || '999');
			const hasTime = bestTime < 900;

			let stars = '☆☆☆';
			if (hasTime) {
				if (bestTime <= lvl.targetGold) stars = '⭐⭐⭐';
				else if (bestTime <= lvl.targetSilver) stars = '⭐⭐☆';
				else stars = '⭐☆☆';
			}

			const card = document.createElement('div');
			card.className = `level-card ${isUnlocked ? '' : 'locked'} ${this.currentLevelId === lvl.id ? 'active-level' : ''}`;
			card.innerHTML = `
				<div>
					<div class="level-info-title">${lvl.name}</div>
					<div class="level-info-sub">${lvl.subtitle} • Target: ${lvl.targetGold}s</div>
				</div>
				<div style="display: flex; align-items: center; gap: 14px;">
					<div class="level-stars">${stars}</div>
					<button class="btn-play-level" data-level-id="${lvl.id}">
						${isUnlocked ? (this.currentLevelId === lvl.id ? 'Playing' : 'Race') : '🔒 Locked'}
					</button>
				</div>
			`;

			if (isUnlocked) {
				card.querySelector('.btn-play-level').addEventListener('click', () => {
					this.levelsModal.classList.remove('show');
					this.startCampaignLevel(lvl.id);
				});
			}

			container.appendChild(card);

		});

	}

	startCampaignLevel(levelId) {

		const lvl = CAMPAIGN_LEVELS.find(l => l.id === levelId);
		if (!lvl) return;

		this.currentLevelId = levelId;
		this.selectPresetTrack(lvl.trackKey);
		this.showToast(`🏁 Starting ${lvl.name} (Gold Target: ${lvl.targetGold}s)`);

	}

	showLapCelebration(data) {

		const { lapTime, isBest } = data;
		const popup = this.celebrationPopup;
		const titleEl = document.getElementById('finish-status-title');
		const timeEl = document.getElementById('finish-time-display');
		const starsEl = document.getElementById('finish-stars-display');
		const nextBtn = document.getElementById('btn-finish-next');

		const m = Math.floor(lapTime / 60);
		const s = lapTime - m * 60;
		const timeStr = `${m}:${s.toFixed(2).padStart(5, '0')}`;

		timeEl.textContent = timeStr;

		let starsCount = 1;
		if (this.currentLevelId) {
			const lvl = CAMPAIGN_LEVELS.find(l => l.id === this.currentLevelId);
			if (lvl) {
				if (lapTime <= lvl.targetGold) starsCount = 3;
				else if (lapTime <= lvl.targetSilver) starsCount = 2;

				// Unlock next level
				const currentUnlocked = parseInt(localStorage.getItem('realdrive.unlockedLevel') || '1', 10);
				if (this.currentLevelId >= currentUnlocked && this.currentLevelId < CAMPAIGN_LEVELS.length) {
					localStorage.setItem('realdrive.unlockedLevel', String(this.currentLevelId + 1));
				}

				const hasNext = this.currentLevelId < CAMPAIGN_LEVELS.length;
				nextBtn.style.display = hasNext ? 'inline-block' : 'none';
			}
		} else {
			nextBtn.style.display = 'none';
		}

		starsEl.textContent = '⭐'.repeat(starsCount) + '☆'.repeat(3 - starsCount);
		titleEl.textContent = isBest ? '⚡ NEW BEST LAP!' : (this.currentLevelId ? '🏆 LEVEL COMPLETED!' : '🏁 LAP COMPLETE!');

		popup.classList.add('show');

		clearTimeout(this._celebrateTimer);
		this._celebrateTimer = setTimeout(() => {
			popup.classList.remove('show');
		}, 4500);

	}

	setActiveTrack(key) {

		this.currentTrackKey = key;
		this.topbar.querySelectorAll('.track-pill').forEach(btn => {
			btn.classList.toggle('active', btn.dataset.track === key);
		});

	}

	selectPresetTrack(key) {

		this.setActiveTrack(key);
		const preset = PRESET_TRACKS[key];
		if (!preset) return;

		this.showToast(`🏎️ Loaded ${preset.name}`);

		if (preset.cells) {
			const encoded = encodeCells(preset.cells);
			this.loadCustomTrack(preset.cells, encoded);
		} else {
			const newUrl = window.location.pathname;
			window.history.pushState({}, '', newUrl);
			this.onSelectTrack(null, null);
		}

	}

	loadCustomTrack(cells, encoded) {

		const newUrl = `${window.location.pathname}?map=${encoded}`;
		window.history.pushState({ map: encoded }, '', newUrl);

		const editorLink = document.getElementById('editor-link');
		if (editorLink) {
			editorLink.href = `editor.html?map=${encoded}`;
			editorLink.textContent = '✏️ Edit in Editor';
		}

		this.onSelectTrack(cells, encoded);

	}

	showToast(msg) {

		this.toast.textContent = msg;
		this.toast.classList.add('show');
		clearTimeout(this._toastTimer);
		this._toastTimer = setTimeout(() => {
			this.toast.classList.remove('show');
		}, 2600);

	}

	updateFPS(dt) {

		this._fpsTime = (this._fpsTime || 0) + dt;
		this._fpsFrames = (this._fpsFrames || 0) + 1;

		if (this._fpsTime >= 0.5) {

			const fps = Math.round(this._fpsFrames / this._fpsTime);
			const pill = document.getElementById('hud-fps-pill');
			if (pill) {
				pill.textContent = `${fps} FPS`;
				pill.style.color = fps >= 50 ? '#5af168' : fps >= 30 ? '#ffea00' : '#ff4d4d';
			}

			this._fpsTime = 0;
			this._fpsFrames = 0;

		}

	}

}
