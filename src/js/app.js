const { readUploadedFile, processEventData } = window.MTG || {};

// Store all sessions
let allSessions = [];
const STORAGE_KEY = 'mtg_standings_sessions';

// Load saved sessions on page load
function loadSavedSessions() {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			allSessions = JSON.parse(saved);
			displayCombinedStandings(allSessions);
			console.log('Loaded saved sessions:', allSessions.length);
		}
	} catch (err) {
		console.error('Error loading saved sessions:', err);
	}
}

function addOrUpdateSession(newSession) {
	// Find existing session with same date
	const existingIndex = allSessions.findIndex(
		(session) => session.eventDate === newSession.eventDate,
	);

	if (existingIndex !== -1) {
		// Replace existing session
		allSessions[existingIndex] = newSession;
		console.log(`Updated existing session from ${newSession.eventDate}`);
	} else {
		// Add new session
		allSessions.push(newSession);
		console.log(`Added new session from ${newSession.eventDate}`);
	}

	// Sort sessions by date
	allSessions.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

	saveSessions();
}

// Save sessions to localStorage
function saveSessions() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(allSessions));
		console.log('Saved sessions:', allSessions.length);
	} catch (err) {
		console.error('Error saving sessions:', err);
	}
}

const fileInput = document.getElementById('file-input');
const output = document.getElementById('file-content'); // matches the <pre id="file-content">
let specialScoringCheckbox = document.getElementById('special-scoring');
let scoringModeRadios = document.querySelectorAll(
	'input[name="special-scoring-mode"]',
);
let standardScoringRadio = document.getElementById('special-scoring-standard');
let longScoringRadio = document.getElementById('special-scoring-long');

const DEFAULT_TOTAL_SESSIONS = 6;
const LONG_TOTAL_SESSIONS = 9;
const SCORING_MODE_STANDARD = 'standard';
const SCORING_MODE_LONG = 'long';

function getSelectedScoringMode() {
	const checked = document.querySelector(
		'input[name="special-scoring-mode"]:checked',
	);
	return checked ? checked.value : SCORING_MODE_STANDARD;
}

function isSpecialScoringEnabled() {
	return specialScoringCheckbox && specialScoringCheckbox.checked;
}

function isLongScoringMode() {
	return (
		isSpecialScoringEnabled() &&
		getSelectedScoringMode() === SCORING_MODE_LONG
	);
}

function getTotalSessionsTarget() {
	return isLongScoringMode() ? LONG_TOTAL_SESSIONS : DEFAULT_TOTAL_SESSIONS;
}

function updateScoringModeAvailability() {
	const disabled = !isSpecialScoringEnabled();
	scoringModeRadios.forEach((radio) => {
		radio.disabled = disabled;
	});
}

fileInput.addEventListener('change', async (e) => {
	const file = e.target.files[0];
	if (!file) return;
	try {
		const content = await readUploadedFile(file);
		// show raw text or pretty JSON
		if (output) {
			// Check if element exists
			output.textContent =
				typeof content === 'string'
					? content
					: JSON.stringify(content, null, 2);
		}
		// Process the content and add to sessions
		const sessionData = processEventData(content, file);
		if (sessionData) {
			if (!sessionData.eventDate) {
				console.error('Session data missing event date');
				return;
			}
			addOrUpdateSession(sessionData);
			displayCombinedStandings(allSessions);
			console.log('Added session:', sessionData);
		}
		fileInput.value = '';
	} catch (err) {
		console.error('Error reading file:', err);
		if (output) {
			// Check if element exists
			output.textContent = 'Error reading file: ' + err.message;
		}
	}
});

if (specialScoringCheckbox) {
	specialScoringCheckbox.addEventListener('change', () => {
		updateScoringModeAvailability();
		displayCombinedStandings(allSessions);
	});
}

scoringModeRadios.forEach((radio) => {
	radio.addEventListener('change', () => {
		displayCombinedStandings(allSessions);
	});
});

updateScoringModeAvailability();

function calculateCombinedStandings(sessions) {
	const playerMap = new Map();
	const useSpecialScoring = isSpecialScoringEnabled();
	const useLongMode = isLongScoringMode();
	const uploadedSessionCount = sessions.length; // Number of events that have happened
	const totalSessionsTarget = getTotalSessionsTarget();

	sessions.forEach((session, sessionIndex) => {
		// Track who participated in this session
		const participantsInSession = new Set(
			session.players.map((p) => p.name),
		);

		session.players.forEach((player) => {
			const existing = playerMap.get(player.name) || {
				name: player.name,
				sessions: [],
				participatedSessions: 0,
			};
			existing.sessions.push({
				points: player.points || 0,
				omw: player.omw || null,
				sessionIndex,
			});
			existing.participatedSessions++;
			playerMap.set(player.name, existing);
		});

		// Add 0 points for players who missed this session
		playerMap.forEach((playerData, playerName) => {
			if (!participantsInSession.has(playerName)) {
				playerData.sessions.push({
					points: 0, // Missing a session = 0 points
					omw: null,
					sessionIndex,
				});
			}
		});
	});

	const combinedStandings = Array.from(playerMap.values()).map((player) => {
		// Fill remaining sessions with null (future events)
		while (player.sessions.length < totalSessionsTarget) {
			player.sessions.push({
				points: null, // Future event = null points
				omw: null,
				sessionIndex: player.sessions.length,
			});
		}

		const completedSessions = player.sessions.slice(
			0,
			uploadedSessionCount,
		);

		// Always calculate best and worst points first
		if (completedSessions.length > 0) {
			const pointValues = completedSessions
				.map((s) => s.points)
				.filter((points) => points !== null);

			player.bestPoints =
				pointValues.length > 0 ? Math.max(...pointValues) : null;
			player.worstPoints =
				pointValues.length > 0 ? Math.min(...pointValues) : null;
		}

		let totalPoints = 0;
		let validOmwCount = 0;
		let omwSum = 0;

		// Breakdown used for the chart
		let ignoredPoints = 0;
		let doubledPoints = 0;
		let normalPoints = 0;

		const sumPoints = (sessions) =>
			sessions.reduce((sum, session) => sum + (session.points || 0), 0);

		if (useSpecialScoring) {
			// Sort by points (descending), then by OMW (descending)
			const sortedSessions = [...completedSessions].sort((a, b) => {
				if (a.points !== b.points) return b.points - a.points;
				return (b.omw || 0) - (a.omw || 0);
			});

			const rawSum = sumPoints(completedSessions);

			if (useLongMode && completedSessions.length >= 3) {
				const dropCount = Math.min(2, sortedSessions.length);
				const droppedSessions =
					dropCount > 0 ? sortedSessions.slice(-dropCount) : [];
				ignoredPoints = sumPoints(droppedSessions);

				const lastSession = completedSessions.find(
					(session) =>
						session.sessionIndex === LONG_TOTAL_SESSIONS - 1,
				);
				doubledPoints = lastSession?.points || 0;

				const earnedBase = rawSum - ignoredPoints; // includes the last session once
				normalPoints = Math.max(0, earnedBase - doubledPoints);
				totalPoints = earnedBase + doubledPoints;

				// Calculate OMW (exclude dropped sessions)
				sortedSessions.forEach((session) => {
					if (droppedSessions.includes(session)) return;
					if (session.omw) {
						omwSum += session.omw;
						validOmwCount++;
					}
				});
			} else if (completedSessions.length >= 2) {
				const highest = sortedSessions[0];
				const lowest = sortedSessions[sortedSessions.length - 1];

				ignoredPoints = lowest.points || 0;
				doubledPoints = highest.points || 0;

				const earnedBase = rawSum - ignoredPoints; // includes highest once
				normalPoints = Math.max(0, earnedBase - doubledPoints);
				totalPoints = earnedBase + doubledPoints;

				// Calculate OMW (counting each OMW just once)
				sortedSessions.forEach((session) => {
					if (session === lowest) return; // Skip lowest OMW
					if (session.omw) {
						omwSum += session.omw;
						validOmwCount++;
					}
				});
			} else {
				// Regular scoring fallback for single-session data
				totalPoints = rawSum;
				normalPoints = rawSum;
				doubledPoints = 0;
				ignoredPoints = 0;

				completedSessions.forEach((session) => {
					if (session.omw) {
						omwSum += session.omw;
						validOmwCount++;
					}
				});
			}
		} else {
			// Regular scoring
			const rawSum = sumPoints(completedSessions);
			totalPoints = rawSum;
			normalPoints = rawSum;
			doubledPoints = 0;
			ignoredPoints = 0;

			completedSessions.forEach((session) => {
				if (session.omw) {
					omwSum += session.omw;
					validOmwCount++;
				}
			});
		}

		return {
			name: player.name,
			points: totalPoints,
			omw: validOmwCount ? Math.round(omwSum / validOmwCount) : null,
			bestPoints: player.bestPoints,
			worstPoints: player.worstPoints,
			sessionCount: player.participatedSessions,
			totalSessions: uploadedSessionCount,
			chartBreakdown: {
				ignoredPoints,
				normalPoints,
				doubledPoints,
			},
		};
	});

	// Sort and assign ranks
	combinedStandings.sort((a, b) => {
		if (b.points !== a.points) return b.points - a.points;
		return (b.omw || 0) - (a.omw || 0);
	});

	combinedStandings.forEach((player, index) => {
		player.rank = index + 1;
	});

	return combinedStandings;
}

function getAttendanceDisplay(attended, total) {
	if (attended === total) {
		return `<span class="perfect">✓</span>`;
	}
	const missed = total - attended;
	return `<span class="missed">${'❌'.repeat(missed)}</span>`;
}

function displayCombinedStandings(sessions) {
	const standingsTable = document.getElementById('standings');
	const tbody = standingsTable.querySelector('tbody');
	tbody.innerHTML = '';

	// Update event date to show range
	const dates = sessions
		.map((s) => s.eventDate)
		.filter(Boolean)
		.sort();
	const totalSessionsTarget = getTotalSessionsTarget();
	const dateRange =
		dates.length > 0
			? `Sessions ${sessions.length}/${totalSessionsTarget} (${dates[0]} - ${dates[dates.length - 1]})`
			: `Sessions ${sessions.length}/${totalSessionsTarget}`;
	document.getElementById('event-date').textContent = dateRange;

	const combinedStandings = calculateCombinedStandings(sessions);

	combinedStandings.forEach((player) => {
		const row = document.createElement('tr');
		row.innerHTML = `
            <td>${player.rank || ''}</td>
            <td>${player.name || ''}</td>
            <td>${player.points || '0'}</td>
            <td>${player.bestPoints ?? ''}</td>
            <td>${player.worstPoints ?? ''}</td>
            <td>${player.omw || ''}</td>
        `;
		tbody.appendChild(row);
	});

	renderScoreChart(combinedStandings);
}

function renderScoreChart(players) {
	const chart = document.getElementById('score-chart-content');
	if (!chart) return;

	// Clear any previous rows (keep the heading)
	chart.replaceChildren();

	// If there are no players, show a small placeholder
	if (!players || players.length === 0) {
		const empty = document.createElement('div');
		empty.className = 'score-chart-empty';
		empty.textContent = 'Upload a file to see score breakdowns.';
		chart.appendChild(empty);
		return;
	}

	const maxTotalPos = Math.max(
		1,
		...players.map((p) => {
			const b = p.chartBreakdown || {
				normalPoints: 0,
				doubledPoints: 0,
			};
			return b.normalPoints + b.doubledPoints;
		}),
	);

	const maxTotalNeg = Math.max(
		1,
		...players.map((p) => {
			const b = p.chartBreakdown || {
				ignoredPoints: 0,
			};
			return b.ignoredPoints;
		}),
	);

	const totalRange = maxTotalPos + maxTotalNeg;
	const posBasisPct = (maxTotalPos / totalRange) * 100;
	const negBasisPct = (maxTotalNeg / totalRange) * 100;

	chart.style.setProperty('--score-chart-pos-basis', `${posBasisPct}%`);
	chart.style.setProperty('--score-chart-neg-basis', `${negBasisPct}%`);

	const createSegment = (widthPercent, cls, title) => {
		if (!widthPercent || widthPercent <= 0) return null;
		const seg = document.createElement('div');
		seg.className = `score-segment ${cls}`;
		seg.style.width = `${widthPercent}%`;
		if (title) seg.title = title;
		return seg;
	};

	const table = document.createElement('table');
	table.className = 'score-chart-table';

	const thead = document.createElement('thead');
	const headerRow = document.createElement('tr');
	headerRow.innerHTML = `
		<th>Rank</th>
		<th>Name</th>
		<th>Pts</th>
		<th>Score Breakdown</th>
	`;
	thead.appendChild(headerRow);
	table.appendChild(thead);

	const tbody = document.createElement('tbody');

	players.forEach((player) => {
		const breakdown = player.chartBreakdown || {
			ignoredPoints: 0,
			normalPoints: 0,
			doubledPoints: 0,
		};

		const normalPct =
			maxTotalPos > 0
				? (breakdown.normalPoints / maxTotalPos) * 100
				: 0;
		const doubledPct =
			maxTotalPos > 0
				? (breakdown.doubledPoints / maxTotalPos) * 100
				: 0;
		const ignoredPct =
			maxTotalNeg > 0
				? (breakdown.ignoredPoints / maxTotalNeg) * 100
				: 0;

		const row = document.createElement('tr');
		row.className = 'score-row';

		const rankCell = document.createElement('td');
		rankCell.className = 'score-rank';
		rankCell.textContent = player.rank || '';

		const nameCell = document.createElement('td');
		nameCell.className = 'score-name';
		nameCell.textContent = player.name;

		const pointsCell = document.createElement('td');
		pointsCell.className = 'score-points';
		pointsCell.textContent = player.points != null ? player.points : '';

		const barCell = document.createElement('td');
		barCell.className = 'score-bar-cell';

		const bar = document.createElement('div');
		bar.className = 'score-bar';

		const positiveSide = document.createElement('div');
		positiveSide.className = 'score-bar-side score-bar-positive';
		const negativeSide = document.createElement('div');
		negativeSide.className = 'score-bar-side score-bar-negative';

		const normalSeg = createSegment(
			normalPct,
			'score-normal',
			`Normal: ${breakdown.normalPoints}`,
		);
		const doubledSeg = createSegment(
			doubledPct,
			'score-doubled',
			`Doubled: ${breakdown.doubledPoints}`,
		);
		const ignoredSeg = createSegment(
			ignoredPct,
			'score-ignored',
			`Ignored: ${breakdown.ignoredPoints}`,
		);

		if (normalSeg) positiveSide.appendChild(normalSeg);
		if (doubledSeg) positiveSide.appendChild(doubledSeg);
		if (ignoredSeg) negativeSide.appendChild(ignoredSeg);

		bar.appendChild(positiveSide);
		bar.appendChild(negativeSide);
		barCell.appendChild(bar);

		row.appendChild(rankCell);
		row.appendChild(nameCell);
		row.appendChild(pointsCell);
		row.appendChild(barCell);
		tbody.appendChild(row);
	});

	table.appendChild(tbody);
	chart.appendChild(table);
}

// Add a reset button
const resetButton = document.createElement('button');
resetButton.textContent = 'Reset All Sessions';
resetButton.onclick = () => {
	allSessions = [];
	localStorage.removeItem(STORAGE_KEY); // Clear from storage
	displayCombinedStandings(allSessions);
	output.textContent = '';
	console.log('Reset all sessions and cleared storage');
};
document.querySelector('#upload-form').appendChild(resetButton);

// Load saved sessions when page loads
document.addEventListener('DOMContentLoaded', loadSavedSessions);
