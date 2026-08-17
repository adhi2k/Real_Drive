/**
 * RealDrive: High-Speed WebSocket & WebRTC Phone Controller Receiver
 */
export class PhoneController {

	constructor() {

		this.roomCode = this.generateRoomCode();
		this.mqttTopic = `realdrive/game/${this.roomCode}`;
		this.client = null;
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

		// Same-device BroadcastChannel support
		if ( typeof BroadcastChannel !== 'undefined' ) {

			this.broadcast = new BroadcastChannel( 'realdrive_channel_' + this.roomCode );
			this.broadcast.onmessage = ( e ) => {

				if ( e.data ) this.handlePacket( e.data );

			};

		}

	}

	generateRoomCode() {

		const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
		let code = '';
		for ( let i = 0; i < 4; i ++ ) {

			code += chars.charAt( Math.floor( Math.random() * chars.length ) );

		}
		return code;

	}

	init() {

		if ( typeof mqtt !== 'undefined' ) {

			try {

				this.client = mqtt.connect( 'wss://broker.hivemq.com:8884/mqtt', {
					clientId: 'pc_' + Math.random().toString( 16 ).substring( 2, 8 ),
					clean: true,
					keepalive: 30,
					reconnectPeriod: 1000
				} );

				this.client.on( 'connect', () => {

					console.log( '✅ PC WebSocket connected. Room Code:', this.roomCode );
					this.client.subscribe( this.mqttTopic, { qos: 0 } );

				} );

				this.client.on( 'message', ( topic, message ) => {

					if ( topic === this.mqttTopic ) {

						try {

							const data = JSON.parse( message.toString() );
							this.handlePacket( data );

						} catch ( e ) {}

					}

				} );

			} catch ( e ) {

				console.warn( 'MQTT error:', e );

			}

		}

	}

	handlePacket( data ) {

		if ( ! data ) return;

		if ( ! this.connected ) {

			this.connected = true;
			console.log( '📱 Mobile Phone Connected!' );
			if ( this.onConnect ) this.onConnect( this.roomCode );

		}

		if ( typeof data.s === 'number' ) this.targetSteer = data.s;
		if ( typeof data.g === 'number' ) this.targetGas = data.g;
		if ( typeof data.b === 'number' ) this.targetBrake = data.b;
		this.nitro = ! ! data.n;

	}

	vibratePhone( ms = 30 ) {

		if ( this.client && this.client.connected ) {

			this.client.publish( `${this.mqttTopic}/feedback`, JSON.stringify( { vibrate: ms } ), { qos: 0 } );

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
