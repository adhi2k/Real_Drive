/**
 * RealDrive: Hybrid Local Wi-Fi & Cloud WebSocket Phone Controller Receiver
 */
export class PhoneController {

	constructor() {

		this.roomCode = this.generateRoomCode();
		this.mqttTopic = `realdrive/game/${this.roomCode}`;
		this.ws = null;
		this.mqttClient = null;
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

		const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith( '192.168.' ) || window.location.hostname.startsWith( '10.' );

		if ( isLocal ) {

			this.initLocalWS();

		} else {

			this.initCloudMQTT();

		}

	}

	initLocalWS() {

		const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const port = window.location.port ? `:${window.location.port}` : ':8000';
		const host = window.location.hostname || 'localhost';
		const wsUrl = `${proto}//${host}${port}/ws?role=host&room=${this.roomCode}`;

		try {

			this.ws = new WebSocket( wsUrl );

			this.ws.onopen = () => {

				console.log( `✅ [Local Wi-Fi Server Connected] Room Code: ${this.roomCode}` );

			};

			this.ws.onmessage = ( event ) => {

				try {

					const data = JSON.parse( event.data );
					if ( data.event === 'phone_connected' ) {

						this.connected = true;
						if ( this.onConnect ) this.onConnect( this.roomCode );

					} else if ( data.event === 'phone_disconnected' ) {

						this.connected = false;
						this.resetInputs();
						if ( this.onDisconnect ) this.onDisconnect();

					} else {

						this.handlePacket( data );

					}

				} catch ( e ) {}

			};

			this.ws.onerror = () => {

				// Fallback to cloud MQTT if local WS fails
				this.initCloudMQTT();

			};

			this.ws.onclose = () => {

				setTimeout( () => {

					if ( ! this.connected ) this.initLocalWS();

				}, 3000 );

			};

		} catch ( e ) {

			this.initCloudMQTT();

		}

	}

	initCloudMQTT() {

		if ( typeof mqtt === 'undefined' || this.mqttClient ) return;

		try {

			this.mqttClient = mqtt.connect( 'wss://broker.hivemq.com:8884/mqtt', {
				clientId: 'pc_' + Math.random().toString( 16 ).substring( 2, 8 ),
				clean: true,
				keepalive: 30,
				reconnectPeriod: 1500
			} );

			this.mqttClient.on( 'connect', () => {

				console.log( `✅ [Cloud WebSocket Connected] Room Code: ${this.roomCode}` );
				this.mqttClient.subscribe( this.mqttTopic, { qos: 0 } );
				this.mqttClient.subscribe( `${this.mqttTopic}/ping`, { qos: 0 } );

			} );

			this.mqttClient.on( 'message', ( topic, message ) => {

				try {

					const data = JSON.parse( message.toString() );

					if ( topic === `${this.mqttTopic}/ping` ) {

						this.mqttClient.publish( `${this.mqttTopic}/pong`, JSON.stringify( { t: data.t } ), { qos: 0 } );
						return;

					}

					if ( topic === this.mqttTopic ) {

						this.handlePacket( data );

					}

				} catch ( e ) {}

			} );

		} catch ( e ) {

			console.warn( 'Cloud MQTT error:', e );

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

		const payload = JSON.stringify( { vibrate: ms } );

		if ( this.ws && this.ws.readyState === WebSocket.OPEN ) {

			this.ws.send( payload );

		} else if ( this.mqttClient && this.mqttClient.connected ) {

			this.mqttClient.publish( `${this.mqttTopic}/feedback`, payload, { qos: 0 } );

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
		const steerLerp = Math.min( 1.0, dt * 20.0 );
		const pedalLerp = Math.min( 1.0, dt * 24.0 );

		this.steer += ( this.targetSteer - this.steer ) * steerLerp;
		this.gas += ( this.targetGas - this.gas ) * pedalLerp;
		this.brake += ( this.targetBrake - this.brake ) * pedalLerp;

	}

	getSteering() { return this.connected ? this.steer : 0; }
	getGas() { return this.connected ? ( this.gas * ( this.nitro ? 1.4 : 1.0 ) ) : 0; }
	getBrake() { return this.connected ? this.brake : 0; }

}
