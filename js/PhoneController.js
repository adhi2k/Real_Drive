/**
 * RealDrive: WebRTC Gyroscope & Accelerometer Phone Controller Receiver
 */
export class PhoneController {

	constructor() {

		this.roomCode = this.generateRoomCode();
		this.hostPeerId = ('realdrive_' + this.roomCode).toLowerCase();
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

		// Local BroadcastChannel fallback for same-device split tabs
		if ( typeof BroadcastChannel !== 'undefined' ) {

			this.broadcast = new BroadcastChannel( 'realdrive_channel_' + this.roomCode );
			this.broadcast.onmessage = ( e ) => {

				if ( e.data ) this.handlePacket( e.data );

			};

		}

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
						{ urls: 'stun:stun1.l.google.com:19302' },
						{ urls: 'stun:stun2.l.google.com:19302' },
						{ urls: 'stun:openrelay.metered.ca:80' },
						{
							urls: 'turn:openrelay.metered.ca:80',
							username: 'openrelayproject',
							credential: 'openrelayproject'
						},
						{
							urls: 'turn:openrelay.metered.ca:443',
							username: 'openrelayproject',
							credential: 'openrelayproject'
						},
						{
							urls: 'turn:openrelay.metered.ca:443?transport=tcp',
							username: 'openrelayproject',
							credential: 'openrelayproject'
						}
					]
				}
			} );

			this.peer.on( 'open', ( id ) => {

				console.log( 'Phone Controller Host ready. Room Code:', this.roomCode );

			} );

			this.peer.on( 'connection', ( connection ) => {

				this.conn = connection;

				const onOpen = () => {

					this.connected = true;
					console.log( '📱 Mobile Phone Connected!' );
					if ( this.onConnect ) this.onConnect( this.roomCode );

				};

				if ( this.conn.open ) {

					onOpen();

				} else {

					this.conn.on( 'open', onOpen );

				}

				this.conn.on( 'data', ( data ) => {

					this.handlePacket( data );

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

	handlePacket( data ) {

		if ( ! data ) return;

		if ( data.ping && this.conn && this.conn.open ) {

			this.conn.send( { pong: true, t: data.t } );
			return;

		}

		if ( ! this.connected ) {

			this.connected = true;
			if ( this.onConnect ) this.onConnect( this.roomCode );

		}

		if ( typeof data.s === 'number' ) this.targetSteer = data.s;
		if ( typeof data.g === 'number' ) this.targetGas = data.g;
		if ( typeof data.b === 'number' ) this.targetBrake = data.b;
		this.nitro = !! data.n;

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
