import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { LightProbeGrid } from 'three/addons/lighting/LightProbeGrid.js';
import { createWorldSettings, createWorld, addBroadphaseLayer, addObjectLayer, enableCollision, registerAll, updateWorld, rigidBody, box, MotionType } from 'crashcat';
import { Vehicle, MAX_SPEED } from './Vehicle.js';
import { Camera } from './Camera.js';
import { Controls } from './Controls.js';
import { buildTrack, decodeCells, computeSpawnPosition, computeTrackBounds, TRACK_CELLS } from './Track.js';
import { buildWallColliders, createSphereBody } from './Physics.js';
import { SmokeTrails } from './Particles.js';
import { DriftMarks } from './DriftMarks.js';
import { GameAudio } from './Audio.js';
import { LapTimer } from './LapTimer.js';
import { ColorMapGLTFLoader } from './Loader.js';
import { PhoneController } from './PhoneController.js';
import { GameUI } from './UI.js';
import { PRESET_TRACKS } from './TrackGenerator.js';

const renderer = new THREE.WebGLRenderer( { antialias: true, powerPreference: 'high-performance' } );
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setPixelRatio( Math.min( window.devicePixelRatio, 1.25 ) );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

document.body.appendChild( renderer.domElement );

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0xadb2ba );
scene.fog = new THREE.Fog( 0xadb2ba, 30, 70 );

const dirLight = new THREE.DirectionalLight( 0xffffff, 2.8 );
dirLight.position.set( 11.4, 15, - 5.3 );
dirLight.castShadow = true;
dirLight.shadow.mapSize.setScalar( 512 );
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 60;
scene.add( dirLight );

const ambientLight = new THREE.AmbientLight( 0xffffff, 1.2 );
scene.add( ambientLight );

const hemiLight = new THREE.HemisphereLight( 0xd8e8f8, 0x8a9a6a, 1.4 );
hemiLight.position.copy( dirLight.position );
scene.add( hemiLight );

window.addEventListener( 'resize', () => {

	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( 1.0 );

} );

const loader = new ColorMapGLTFLoader();

const modelNames = [
	'vehicle-truck-yellow', 'vehicle-truck-green', 'vehicle-truck-purple', 'vehicle-truck-red',
	'track-straight', 'track-corner', 'track-bump', 'track-finish',
	'decoration-empty', 'decoration-forest', 'decoration-tents',
];

const models = {};

async function loadModels() {

	const promises = modelNames.map( ( name ) =>
		new Promise( ( resolve, reject ) => {

			loader.load( `models/${ name }.glb`, ( gltf ) => {

				const meshes = [];
				gltf.scene.traverse( ( child ) => {

					if ( child.isMesh ) {

						child.material.side = THREE.FrontSide;
						meshes.push( child );

					}

				} );

				// Vehicle scaling
				if ( name.startsWith( 'vehicle-' ) ) {

					gltf.scene.scale.setScalar( 0.5 );

				}

				if ( meshes.length === 1 ) {

					const mesh = meshes[ 0 ];
					mesh.removeFromParent();
					models[ name ] = mesh;

				} else {

					models[ name ] = gltf.scene;

				}

				resolve();

			}, undefined, reject );

		} )
	);

	await Promise.all( promises );

}

let currentTrackGroup = null;
let currentProbes = null;
let world = null;
let sphereBody = null;
let vehicle = null;
let vehicleGroup = null;
let cam = null;
let controls = null;
let phoneController = null;
let particles = null;
let driftMarks = null;
let audio = null;
let lapTimer = null;
let ui = null;

function setupWorldAndTrack( customCells, mapParam ) {

	// Clean up previous track group
	if ( currentTrackGroup ) {

		scene.remove( currentTrackGroup );
		currentTrackGroup.traverse( ( obj ) => {

			if ( obj.geometry ) obj.geometry.dispose();

		} );
		currentTrackGroup = null;

	}

	// Clean up previous light probes
	if ( currentProbes ) {

		scene.remove( currentProbes );
		currentProbes.dispose?.();
		currentProbes = null;

	}

	// Clean up previous lap timer
	if ( lapTimer ) {

		lapTimer.destroy();
		lapTimer = null;

	}

	// Compute spawn & bounds
	const spawn = customCells ? computeSpawnPosition( customCells ) : null;
	const bounds = computeTrackBounds( customCells );
	const hw = bounds.halfWidth;
	const hd = bounds.halfDepth;
	const groundSize = Math.max( hw, hd ) * 2 + 20;

	const shadowExtent = Math.max( hw, hd ) + 10;
	dirLight.shadow.camera.left = - shadowExtent;
	dirLight.shadow.camera.right = shadowExtent;
	dirLight.shadow.camera.top = shadowExtent;
	dirLight.shadow.camera.bottom = - shadowExtent;
	dirLight.shadow.camera.updateProjectionMatrix();

	scene.fog.near = groundSize * 0.4;
	scene.fog.far = groundSize * 0.8;

	// Build Track inside a group
	const trackContainer = new THREE.Group();
	buildTrack( trackContainer, models, customCells );
	scene.add( trackContainer );
	currentTrackGroup = trackContainer;

	// Physics World
	const worldSettings = createWorldSettings();
	worldSettings.gravity = [ 0, - 9.81, 0 ];

	const BPL_MOVING = addBroadphaseLayer( worldSettings );
	const BPL_STATIC = addBroadphaseLayer( worldSettings );
	const OL_MOVING = addObjectLayer( worldSettings, BPL_MOVING );
	const OL_STATIC = addObjectLayer( worldSettings, BPL_STATIC );

	enableCollision( worldSettings, OL_MOVING, OL_STATIC );
	enableCollision( worldSettings, OL_MOVING, OL_MOVING );

	world = createWorld( worldSettings );
	world._OL_MOVING = OL_MOVING;
	world._OL_STATIC = OL_STATIC;

	buildWallColliders( world, null, customCells );

	const roadHalf = groundSize / 2;
	rigidBody.create( world, {
		shape: box.create( { halfExtents: [ roadHalf, 0.01, roadHalf ] } ),
		motionType: MotionType.STATIC,
		objectLayer: OL_STATIC,
		position: [ bounds.centerX, - 0.125, bounds.centerZ ],
		friction: 5.0,
		restitution: 0.0,
	} );

	// Sphere Body & Vehicle
	sphereBody = createSphereBody( world, spawn ? spawn.position : null );

	if ( ! vehicle ) {

		vehicle = new Vehicle();
		vehicleGroup = vehicle.init( models[ 'vehicle-truck-yellow' ] );
		scene.add( vehicleGroup );
		dirLight.target = vehicleGroup;

	}

	vehicle.rigidBody = sphereBody;
	vehicle.physicsWorld = world;

	if ( spawn ) {

		const [ sx, sy, sz ] = spawn.position;
		vehicle.spherePos.set( sx, sy, sz );
		vehicle.prevModelPos.set( sx, 0, sz );
		vehicle.container.position.set( sx, 0, sz );
		vehicle.container.rotation.y = spawn.angle;
		vehicle.linearSpeed = 0;
		vehicle.modelVelocity.set( 0, 0, 0 );

	} else {

		vehicle.spherePos.set( 3.5, 0.5, 5 );
		vehicle.prevModelPos.set( 3.5, 0, 5 );
		vehicle.container.position.set( 3.5, 0, 5 );
		vehicle.container.rotation.y = 0;
		vehicle.linearSpeed = 0;
	}

	// Extract Track Bumps / Jump Ramps
	const activeCells = customCells || TRACK_CELLS;
	const bumpList = [];
	for ( const [ gx, gz, key ] of activeCells ) {

		if ( key === 'track-bump' ) {

			bumpList.push( {
				x: ( gx + 0.5 ) * 10 * 0.75,
				z: ( gz + 0.5 ) * 10 * 0.75,
				radius: 1.85,
				height: 0.85
			} );

		}

	}
	vehicle.setBumps( bumpList );

	// Reset Drift Marks
	if ( driftMarks ) {

		scene.remove( driftMarks.mesh );

	}
	driftMarks = new DriftMarks( scene, mapParam );

	// Lap Timer
	lapTimer = new LapTimer( customCells, mapParam, ( lapData ) => {

		if ( audio ) audio.playFinishFanfare( lapData.isBest );
		if ( ui ) ui.showLapCelebration( lapData );

	} );

}

async function init() {

	registerAll();
	await loadModels();

	// Phone Controller (WebRTC Gyroscope & Touch Pedals)
	phoneController = new PhoneController();
	phoneController.init();

	// Game UI Overlay
	ui = new GameUI( {
		phoneController,
		onSelectTrack: ( cells, encoded ) => {

			setupWorldAndTrack( cells, encoded );

		},
		onTogglePerf: ( turboActive ) => {

			renderer.shadowMap.enabled = ! turboActive;

		}
	} );

	// Initialize Controls
	controls = new Controls( phoneController );

	// Camera & Audio & Particles
	cam = new Camera();
	scene.add( cam.debug );

	particles = new SmokeTrails( scene );

	// Load initial track from URL or default
	const mapParam = new URLSearchParams( window.location.search ).get( 'map' );
	let customCells = null;

	if ( mapParam ) {

		try {

			customCells = decodeCells( mapParam );

		} catch ( e ) {

			console.warn( 'Invalid map parameter, using default track' );

		}

	}

	setupWorldAndTrack( customCells, mapParam );

	// Audio
	audio = new GameAudio();
	audio.init( cam.camera, vehicleGroup );

	const _forward = new THREE.Vector3();
	const _camLead = new THREE.Vector3();

	const contactListener = {
		onContactAdded( bodyA, bodyB ) {

			if ( bodyA !== sphereBody && bodyB !== sphereBody ) return;

			_forward.set( 0, 0, 1 ).applyQuaternion( vehicle.container.quaternion );
			_forward.y = 0;
			_forward.normalize();

			const impactVelocity = Math.abs( vehicle.modelVelocity.dot( _forward ) );
			audio.playImpact( impactVelocity );

			// Haptic vibration feedback to phone on crash
			if ( phoneController ) {

				phoneController.vibratePhone( Math.min( 100, Math.max( 25, Math.round( impactVelocity * 18 ) ) ) );

			}

		}
	};

	const timer = new THREE.Timer();

	function animate() {

		requestAnimationFrame( animate );

		timer.update();
		const dt = Math.min( timer.getDelta(), 0.05 );

		const input = controls.update( dt );

		updateWorld( world, contactListener, dt );

		vehicle.update( dt, input );

		dirLight.position.set(
			vehicle.spherePos.x + 11.4,
			15,
			vehicle.spherePos.z - 5.3
		);

		const mv = vehicle.modelVelocity;
		_camLead.set( 0, 0, 1 ).applyQuaternion( vehicle.container.quaternion ).multiplyScalar( Math.sqrt( mv.x * mv.x + mv.z * mv.z ) );
		cam.update( dt, vehicle.spherePos, _camLead );
		particles.update( dt, vehicle );
		driftMarks.update( dt, vehicle );
		audio.update( dt, vehicle.linearSpeed / MAX_SPEED, input.z, vehicle.driftIntensity );

		const hasInput = input.touchActive || input.phoneActive || Math.abs( input.x ) > 0.05 || Math.abs( input.z ) > 0.05;
		lapTimer.update( dt, vehicle.spherePos, hasInput );

		if ( ui ) ui.updateFPS();

		renderer.render( scene, cam.camera );

	}

	animate();

}

init();
