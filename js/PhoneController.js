/**
 * RealDrive: WebRTC Gyroscope & Accelerometer Phone Controller Receiver
 */
export class PhoneController {

	constructor() {

		this.roomCode = this.generateRoomCode();
		this.hostPeerId = 'realdrive_' + this.roomCode;
		this.peer = null;
		this.conn = null;
		this.connected = false;

		this.targetSteer = 0;
		this.steer = 0;
		this.targetGas = 0;
		this.gas = 0;
		this.targetBrake = 0;
		this.brake = 0;
		this.nitro = false;

		this.onConnect = null;
		this.onDisconnect = null;

	}

	generateRoomCode() {

		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		let code = '';
		for ( let i = 0; i < 4; i ++ ) {

			code += chars.charAt( Math.floor( Math.random() * chars.length ) );

		}
		return code;

	}

	init() {

		if ( typeof Peer === 'undefined' ) {

			console.warn( 'PeerJS library not loaded.' );
			return;

		}

		try {

			this.peer = new Peer( this.hostPeerId, {
				debug: 1,
				config: {
					iceServers: [
						{ urls: 'stun:stun.l.google.com:19302' },
						{ urls: 'stun:global.stun.twilio.com:3478' }
					]
				}
			} );

			this.peer.on( 'open', ( id ) => {

				console.log( 'Phone Controller Host ready. Room Code:', this.roomCode );

			} );

			this.peer.on( 'connection', ( connection ) => {

				this.conn = connection;

				this.conn.on( 'open', () => {

					this.connected = true;
					console.log( '📱 Mobile Phone Connected!' );
					if ( this.onConnect ) this.onConnect( this.roomCode );

				} );

				this.conn.on( 'data', ( data ) => {

					if ( ! data ) return;

					if ( data.ping ) {

						// Send pong for latency calculation
						this.conn.send( { pong: true, t: data.t } );
						return;

					}

					// Update target telemetry
					if ( typeof data.s === 'number' ) this.targetSteer = data.s;
					if ( typeof data.g === 'number' ) this.targetGas = data.g;
					if ( typeof data.b === 'number' ) this.targetBrake = data.b;
					this.nitro = !! data.n;

				} );

				this.conn.on( 'close', () => {

					this.connected = false;
					this.resetInputs();
					console.log( '📱 Mobile Phone Disconnected' );
					if ( this.onDisconnect ) this.onDisconnect();

				} );

				this.conn.on( 'error', ( err ) => {

					console.warn( 'Connection error:', err );

				} );

			} );

			this.peer.on( 'error', ( err ) => {

				console.warn( 'Peer error:', err );

			} );

		} catch ( e ) {

			console.warn( 'Failed to initialize PeerJS:', e );

		}

	}

	vibratePhone( ms = 30 ) {

		if ( this.conn && this.conn.open ) {

			this.conn.send( { vibrate: ms } );

		}

	}

	resetInputs() {

		this.targetSteer = 0;
		this.steer = 0;
		this.targetGas = 0;
		this.gas = 0;
		this.targetBrake = 0;
		this.brake = 0;
		this.nitro = false;

	}

	update( dt ) {

		if ( ! this.connected ) {

			this.steer = 0;
			this.gas = 0;
			this.brake = 0;
			return;

		}

		// Smooth exponential filtering at 60 FPS
		const steerLerp = Math.min( 1.0, dt * 18.0 );
		const pedalLerp = Math.min( 1.0, dt * 22.0 );

		this.steer += ( this.targetSteer - this.steer ) * steerLerp;
		this.gas += ( this.targetGas - this.gas ) * pedalLerp;
		this.brake += ( this.targetBrake - this.brake ) * pedalLerp;

	}

	getSteering() {

		return this.connected ? this.steer : 0;

	}

	getGas() {

		return this.connected ? ( this.gas * ( this.nitro ? 1.4 : 1.0 ) ) : 0;

	}

	getBrake() {

		return this.connected ? this.brake : 0;

	}

}
