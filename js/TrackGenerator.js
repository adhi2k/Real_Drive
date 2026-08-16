import { encodeCells, decodeCells, TYPE_NAMES } from './Track.js';

// Orientation Map:
// Straight: 0 (N-S), 16 (E-W)
// Corner: 16 (S+E / top-left), 0 (S+W / top-right), 10 (N+E / bottom-left), 22 (N+W / bottom-right)

/**
 * Campaign Progression Levels
 */
export const CAMPAIGN_LEVELS = [
	{
		id: 1,
		name: 'Level 1: Novice Speedway',
		subtitle: 'Master the basics of racing',
		trackKey: 'default',
		targetGold: 18.0,
		targetSilver: 22.0,
		targetBronze: 28.0,
		badge: '🏁 Novice'
	},
	{
		id: 2,
		name: 'Level 2: Chennai Highway',
		subtitle: 'Speedway straightaways & bridge jumps',
		trackKey: 'chennai-highway',
		targetGold: 23.0,
		targetSilver: 27.0,
		targetBronze: 34.0,
		badge: '🏎️ Speedway'
	},
	{
		id: 3,
		name: 'Level 3: Coastal Sprint',
		subtitle: 'Wide seaside sweepers & rhythm bumps',
		trackKey: 'coastal-loop',
		targetGold: 21.0,
		targetSilver: 25.0,
		targetBronze: 32.0,
		badge: '🌊 Coastal'
	},
	{
		id: 4,
		name: 'Level 4: Mountain Switchbacks',
		subtitle: 'Tight hairpins & downhill elevation jumps',
		trackKey: 'mountain-pass',
		targetGold: 25.0,
		targetSilver: 30.0,
		targetBronze: 38.0,
		badge: '⛰️ Mountain'
	},
	{
		id: 5,
		name: 'Level 5: Neon City Grand Prix',
		subtitle: '90-degree street corners & precision chicanes',
		trackKey: 'city-circuit',
		targetGold: 28.0,
		targetSilver: 34.0,
		targetBronze: 42.0,
		badge: '🏙️ Grand Prix'
	}
];

/**
 * Curated Preset Circuits
 */
export const PRESET_TRACKS = {
	'default': {
		name: 'Standard Circuit',
		subtitle: 'Classic balanced circuit',
		difficulty: 'Easy',
		description: 'The original Starter-Kit racing loop with balanced turns and a clean layout.',
		cells: null // Uses default TRACK_CELLS in Track.js
	},

	'chennai-highway': {
		name: 'Chennai Highway',
		subtitle: 'High-speed speedway with jump bridges',
		difficulty: 'Medium',
		description: 'Long high-speed straights, double high-speed bends, jump ramps, and wide sweeping turns.',
		cells: [
			// Start/Finish Straight along X axis at Z=3
			[ -2,  3, 'track-finish',   16 ],
			[ -1,  3, 'track-straight', 16 ],
			[  0,  3, 'track-bump',     16 ],
			[  1,  3, 'track-straight', 16 ],
			[  2,  3, 'track-straight', 16 ],
			[  3,  3, 'track-corner',   22 ], // Turn North

			// East Straight going North
			[  3,  2, 'track-straight',  0 ],
			[  3,  1, 'track-bump',      0 ],
			[  3,  0, 'track-straight',  0 ],
			[  3, -1, 'track-straight',  0 ],
			[  3, -2, 'track-straight',  0 ],
			[  3, -3, 'track-corner',    0 ], // Turn West

			// North Sweeping Section
			[  2, -3, 'track-straight', 16 ],
			[  1, -3, 'track-corner',   10 ], // Turn North
			[  1, -4, 'track-corner',    0 ], // Turn West
			[  0, -4, 'track-straight', 16 ],
			[ -1, -4, 'track-bump',     16 ],
			[ -2, -4, 'track-straight', 16 ],
			[ -3, -4, 'track-corner',   16 ], // Turn South

			// West Infield Chicane & Straight
			[ -3, -3, 'track-straight',  0 ],
			[ -3, -2, 'track-corner',   22 ], // Turn West
			[ -4, -2, 'track-corner',   16 ], // Turn South
			[ -4, -1, 'track-straight',  0 ],
			[ -4,  0, 'track-straight',  0 ],
			[ -4,  1, 'track-straight',  0 ],
			[ -4,  2, 'track-straight',  0 ],
			[ -4,  3, 'track-corner',   10 ], // Turn East
			[ -3,  3, 'track-straight', 16 ],
		]
	},

	'mountain-pass': {
		name: 'Mountain Pass',
		subtitle: 'Technical S-curves and hairpins',
		difficulty: 'Hard',
		description: 'A demanding uphill/downhill pass with consecutive switchbacks, tight hairpins, and elevation jumps.',
		cells: [
			[  0,  0, 'track-finish',    0 ],
			[  0,  1, 'track-straight',  0 ],
			[  0,  2, 'track-corner',   22 ], // Turn West
			[ -1,  2, 'track-bump',     16 ],
			[ -2,  2, 'track-corner',   10 ], // Turn North
			[ -2,  1, 'track-straight',  0 ],
			[ -2,  0, 'track-corner',    0 ], // Turn West
			[ -3,  0, 'track-corner',   10 ], // Turn North
			[ -3, -1, 'track-straight',  0 ],
			[ -3, -2, 'track-corner',   16 ], // Turn East
			[ -2, -2, 'track-bump',     16 ],
			[ -1, -2, 'track-corner',   22 ], // Turn North
			[ -1, -3, 'track-corner',   16 ], // Turn East
			[  0, -3, 'track-straight', 16 ],
			[  1, -3, 'track-bump',     16 ],
			[  2, -3, 'track-corner',    0 ], // Turn South
			[  2, -2, 'track-corner',   10 ], // Turn East
			[  3, -2, 'track-corner',    0 ], // Turn South
			[  3, -1, 'track-straight',  0 ],
			[  3,  0, 'track-bump',      0 ],
			[  3,  1, 'track-corner',   22 ], // Turn West
			[  2,  1, 'track-corner',   16 ], // Turn South
			[  2,  2, 'track-corner',   22 ], // Turn West
			[  1,  2, 'track-corner',   10 ], // Turn North
			[  1,  1, 'track-straight',  0 ],
			[  1,  0, 'track-straight',  0 ],
			[  1, -1, 'track-corner',    0 ], // Turn West
			[  0, -1, 'track-corner',   16 ], // Turn South into Finish Line
		]
	},

	'coastal-loop': {
		name: 'Coastal Loop',
		subtitle: 'Smooth flowing seaside sprint',
		difficulty: 'Medium',
		description: 'Wide sweeping ocean-side curves, long acceleration zones, and rhythmic jump crests.',
		cells: [
			// Start/Finish on bottom straight
			[  0,  2, 'track-finish',   16 ],
			[  1,  2, 'track-straight', 16 ],
			[  2,  2, 'track-straight', 16 ],
			[  3,  2, 'track-corner',   22 ], // Turn North
			[  3,  1, 'track-bump',      0 ],
			[  3,  0, 'track-straight',  0 ],
			[  3, -1, 'track-straight',  0 ],
			[  3, -2, 'track-bump',      0 ],
			[  3, -3, 'track-corner',    0 ], // Turn West
			[  2, -3, 'track-straight', 16 ],
			[  1, -3, 'track-straight', 16 ],
			[  0, -3, 'track-bump',     16 ],
			[ -1, -3, 'track-straight', 16 ],
			[ -2, -3, 'track-straight', 16 ],
			[ -3, -3, 'track-corner',   16 ], // Turn South
			[ -3, -2, 'track-straight',  0 ],
			[ -3, -1, 'track-bump',      0 ],
			[ -3,  0, 'track-straight',  0 ],
			[ -3,  1, 'track-straight',  0 ],
			[ -3,  2, 'track-corner',   10 ], // Turn East
			[ -2,  2, 'track-straight', 16 ],
			[ -1,  2, 'track-straight', 16 ],
		]
	},

	'city-circuit': {
		name: 'Neon City Circuit',
		subtitle: 'Chicane & 90-degree street complex',
		difficulty: 'Expert',
		description: 'Tight urban grid racing with sharp 90-degree street corners and rapid direction changes.',
		cells: [
			[  0,  0, 'track-finish',    0 ],
			[  0,  1, 'track-straight',  0 ],
			[  0,  2, 'track-corner',   22 ], // West
			[ -1,  2, 'track-corner',   16 ], // South
			[ -1,  3, 'track-corner',   10 ], // East
			[  0,  3, 'track-straight', 16 ],
			[  1,  3, 'track-bump',     16 ],
			[  2,  3, 'track-corner',   22 ], // North
			[  2,  2, 'track-straight',  0 ],
			[  2,  1, 'track-corner',    0 ], // West
			[  1,  1, 'track-corner',   10 ], // North
			[  1,  0, 'track-straight',  0 ],
			[  1, -1, 'track-straight',  0 ],
			[  1, -2, 'track-corner',    0 ], // West
			[  0, -2, 'track-corner',   10 ], // North
			[  0, -3, 'track-corner',   16 ], // East
			[  1, -3, 'track-straight', 16 ],
			[  2, -3, 'track-bump',     16 ],
			[  3, -3, 'track-corner',    0 ], // South
			[  3, -2, 'track-straight',  0 ],
			[  3, -1, 'track-corner',   22 ], // West
			[  2, -1, 'track-corner',   16 ], // South
			[  2,  0, 'track-corner',   10 ], // East
			[  3,  0, 'track-corner',    0 ], // South
			[  3,  1, 'track-straight',  0 ],
			[  3,  2, 'track-bump',      0 ],
			[  3,  3, 'track-straight',  0 ],
			[  3,  4, 'track-corner',   22 ], // West
			[  2,  4, 'track-straight', 16 ],
			[  1,  4, 'track-straight', 16 ],
			[  0,  4, 'track-bump',     16 ],
			[ -1,  4, 'track-straight', 16 ],
			[ -2,  4, 'track-corner',   10 ], // North
			[ -2,  3, 'track-straight',  0 ],
			[ -2,  2, 'track-straight',  0 ],
			[ -2,  1, 'track-bump',      0 ],
			[ -2,  0, 'track-straight',  0 ],
			[ -2, -1, 'track-corner',   16 ], // East
			[ -1, -1, 'track-straight', 16 ],
			[  0, -1, 'track-corner',    0 ], // South into Finish
		]
	}
};

/**
 * Direction bitmasks:
 * N = 8 (gz - 1), S = 4 (gz + 1), E = 2 (gx + 1), W = 1 (gx - 1)
 */
const DIR = {
	N: { dx: 0, dz: -1, bit: 8, oppBit: 4 },
	S: { dx: 0, dz: 1,  bit: 4, oppBit: 8 },
	E: { dx: 1, dz: 0,  bit: 2, oppBit: 1 },
	W: { dx: -1, dz: 0, bit: 1, oppBit: 2 },
};

/**
 * Resolve piece type and Godot orientation from 2-way exit mask
 */
function maskToPiece(mask) {
	switch (mask) {
		case 12: // N + S
			return { type: 'track-straight', orient: 0 };
		case 3:  // E + W
			return { type: 'track-straight', orient: 16 };
		case 5:  // S + W (top-right corner)
			return { type: 'track-corner', orient: 0 };
		case 6:  // S + E (top-left corner)
			return { type: 'track-corner', orient: 16 };
		case 10: // N + E (bottom-left corner)
			return { type: 'track-corner', orient: 10 };
		case 9:  // N + W (bottom-right corner)
			return { type: 'track-corner', orient: 22 };
		default:
			return { type: 'track-straight', orient: 0 };
	}
}

/**
 * Generate a procedural circuit loop guaranteed to be closed and fully connected
 * @param {Object} options
 * @param {number} options.width Grid width (e.g. 6 to 12)
 * @param {number} options.height Grid height (e.g. 6 to 12)
 * @param {string} options.difficulty 'Easy' | 'Medium' | 'Hard'
 * @param {number} options.bumpDensity 0 to 1 (probability of jumps on straights)
 * @param {number} options.seed Random seed
 */
export function generateProceduralTrack(options = {}) {
	const {
		width = 8,
		height = 7,
		difficulty = 'Medium',
		bumpDensity = 0.35,
		seed = Math.floor(Math.random() * 1000000)
	} = options;

	// Simple deterministic PRNG
	let s = seed;
	function rnd() {
		s = (s * 9301 + 49297) % 233280;
		return s / 233280;
	}

	const halfW = Math.floor(width / 2);
	const halfH = Math.floor(height / 2);

	let loopPoints = [];

	const minX = -halfW;
	const maxX = halfW;
	const minZ = -halfH;
	const maxZ = halfH;

	const topIndent = (difficulty !== 'Easy' && rnd() > 0.3) ? Math.floor(rnd() * 2) + 1 : 0;
	const bottomIndent = (difficulty !== 'Easy' && rnd() > 0.3) ? Math.floor(rnd() * 2) + 1 : 0;
	const rightIndent = (difficulty === 'Hard' && rnd() > 0.4) ? Math.floor(rnd() * 2) + 1 : 0;
	const leftIndent = (difficulty === 'Hard' && rnd() > 0.4) ? Math.floor(rnd() * 2) + 1 : 0;

	// Build a valid rectilinear cycle:
	// Top row
	for (let x = minX; x <= maxX - rightIndent; x++) {
		loopPoints.push([x, minZ]);
	}
	if (rightIndent > 0) {
		for (let z = minZ + 1; z <= minZ + 2; z++) loopPoints.push([maxX - rightIndent, z]);
		for (let x = maxX - rightIndent + 1; x <= maxX; x++) loopPoints.push([x, minZ + 2]);
		for (let z = minZ + 3; z <= maxZ; z++) loopPoints.push([maxX, z]);
	} else {
		for (let z = minZ + 1; z <= maxZ; z++) loopPoints.push([maxX, z]);
	}

	// Bottom row
	if (bottomIndent > 0 && maxX - minX > 4) {
		const midX = Math.floor((minX + maxX) / 2);
		for (let x = maxX - 1; x >= midX + 1; x--) loopPoints.push([x, maxZ]);
		for (let z = maxZ - 1; z >= maxZ - bottomIndent; z--) loopPoints.push([midX + 1, z]);
		for (let x = midX; x >= midX - 1; x--) loopPoints.push([x, maxZ - bottomIndent]);
		for (let z = maxZ - bottomIndent + 1; z <= maxZ; z++) loopPoints.push([midX - 1, z]);
		for (let x = midX - 2; x >= minX; x--) loopPoints.push([x, maxZ]);
	} else {
		for (let x = maxX - 1; x >= minX; x--) loopPoints.push([x, maxZ]);
	}

	// Left column
	if (leftIndent > 0 && maxZ - minZ > 4) {
		const midZ = Math.floor((minZ + maxZ) / 2);
		for (let z = maxZ - 1; z >= midZ + 1; z--) loopPoints.push([minX, z]);
		for (let x = minX + 1; x <= minX + leftIndent; x++) loopPoints.push([x, midZ + 1]);
		for (let z = midZ; z >= midZ - 1; z--) loopPoints.push([minX + leftIndent, z]);
		for (let x = minX + leftIndent - 1; x >= minX; x--) loopPoints.push([x, midZ - 1]);
		for (let z = midZ - 2; z >= minZ + 1; z--) loopPoints.push([minX, z]);
	} else {
		for (let z = maxZ - 1; z >= minZ + 1; z--) loopPoints.push([minX, z]);
	}

	// Ensure no duplicate adjacent points
	const cleanLoop = [];
	for (let i = 0; i < loopPoints.length; i++) {
		const p = loopPoints[i];
		const next = loopPoints[(i + 1) % loopPoints.length];
		if (p[0] === next[0] && p[1] === next[1]) continue;
		cleanLoop.push(p);
	}

	const n = cleanLoop.length;
	const cells = [];
	const straights = [];

	// Map each point to a piece with correct orientation
	for (let i = 0; i < n; i++) {
		const curr = cleanLoop[i];
		const prev = cleanLoop[(i - 1 + n) % n];
		const next = cleanLoop[(i + 1) % n];

		const gx = curr[0];
		const gz = curr[1];

		let mask = 0;

		// Entry direction from prev
		const pdx = prev[0] - gx;
		const pdz = prev[1] - gz;
		if (pdz === -1) mask |= DIR.N.bit;
		else if (pdz === 1) mask |= DIR.S.bit;
		else if (pdx === 1) mask |= DIR.E.bit;
		else if (pdx === -1) mask |= DIR.W.bit;

		// Exit direction to next
		const ndx = next[0] - gx;
		const ndz = next[1] - gz;
		if (ndz === -1) mask |= DIR.N.bit;
		else if (ndz === 1) mask |= DIR.S.bit;
		else if (ndx === 1) mask |= DIR.E.bit;
		else if (ndx === -1) mask |= DIR.W.bit;

		const { type, orient } = maskToPiece(mask);

		if (type === 'track-straight') {
			straights.push(i);
		}

		cells.push([ gx, gz, type, orient ]);
	}

	// Select best straight for the Start / Finish line
	if (straights.length > 0) {
		const finishIndex = straights[0];
		cells[finishIndex][2] = 'track-finish';

		// Add jump bumps on some of the remaining straights
		for (let i = 1; i < straights.length; i++) {
			const idx = straights[i];
			const prevIdx = (idx - 1 + n) % n;
			const nextIdx = (idx + 1) % n;
			const neighborHasSpecial = cells[prevIdx][2] !== 'track-straight' || cells[nextIdx][2] !== 'track-straight';

			if (!neighborHasSpecial && rnd() < bumpDensity) {
				cells[idx][2] = 'track-bump';
			}
		}
	} else {
		cells[0][2] = 'track-finish';
	}

	return {
		seed,
		difficulty,
		cells,
		encoded: encodeCells(cells)
	};
}

/**
 * Generate a track based on natural prompt keywords
 */
export function generateTrackFromPrompt(prompt = '') {
	const text = prompt.toLowerCase();
	let difficulty = 'Medium';
	let bumpDensity = 0.3;
	let width = 8;
	let height = 7;

	if (text.includes('chennai') || text.includes('highway') || text.includes('speedway') || text.includes('fast')) {
		return {
			name: 'Chennai Highway',
			cells: PRESET_TRACKS['chennai-highway'].cells,
			encoded: encodeCells(PRESET_TRACKS['chennai-highway'].cells)
		};
	}

	if (text.includes('mountain') || text.includes('hill') || text.includes('pass') || text.includes('switchback') || text.includes('hairpin')) {
		return {
			name: 'Mountain Pass',
			cells: PRESET_TRACKS['mountain-pass'].cells,
			encoded: encodeCells(PRESET_TRACKS['mountain-pass'].cells)
		};
	}

	if (text.includes('coast') || text.includes('beach') || text.includes('sea') || text.includes('ocean')) {
		return {
			name: 'Coastal Loop',
			cells: PRESET_TRACKS['coastal-loop'].cells,
			encoded: encodeCells(PRESET_TRACKS['coastal-loop'].cells)
		};
	}

	if (text.includes('city') || text.includes('urban') || text.includes('street') || text.includes('tokyo') || text.includes('night')) {
		return {
			name: 'Neon City Circuit',
			cells: PRESET_TRACKS['city-circuit'].cells,
			encoded: encodeCells(PRESET_TRACKS['city-circuit'].cells)
		};
	}

	if (text.includes('hard') || text.includes('complex') || text.includes('extreme') || text.includes('expert')) {
		difficulty = 'Hard';
		width = 10;
		height = 8;
		bumpDensity = 0.45;
	} else if (text.includes('easy') || text.includes('simple') || text.includes('beginner') || text.includes('short')) {
		difficulty = 'Easy';
		width = 6;
		height = 6;
		bumpDensity = 0.15;
	}

	if (text.includes('bump') || text.includes('jump') || text.includes('rally') || text.includes('stunt')) {
		bumpDensity = 0.6;
	}

	const result = generateProceduralTrack({ width, height, difficulty, bumpDensity });
	return {
		name: `AI Custom Circuit (${difficulty})`,
		...result
	};
}
