import {
	DEFAULT_TOTAL_SESSIONS,
	LONG_TOTAL_SESSIONS,
	SCORING_MODE_STANDARD,
	SCORING_MODE_LONG,
} from './constants.js';

// UI configuration helpers
function getSelectedScoringMode() {
	const checked = document.querySelector(
		'input[name="special-scoring-mode"]:checked',
	);
	return checked ? checked.value : SCORING_MODE_STANDARD;
}

function isSpecialScoringEnabled() {
	const checkbox = document.getElementById('special-scoring');
	return checkbox && checkbox.checked;
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

function getScoringConfig() {
	const useSpecialScoring = isSpecialScoringEnabled();
	const useLongMode = isLongScoringMode();
	return {
		useSpecialScoring,
		useLongMode,
		totalSessionsTarget: getTotalSessionsTarget(),
	};
}

// Game data transformations
function getOrCreatePlayer(playerMap, playerName) {
	if (!playerMap.has(playerName)) {
		playerMap.set(playerName, {
			name: playerName,
			sessions: [],
			participatedSessions: 0,
		});
	}
	return playerMap.get(playerName);
}

function addPlayerSession(playerData, player, sessionIndex) {
	playerData.sessions.push({
		points: player.points != null ? player.points : 0,
		omw: player.omw != null ? player.omw : null,
		sessionIndex,
	});
	playerData.participatedSessions += 1;
}

function addMissingSessions(playerMap, participantsInSession, sessionIndex) {
	playerMap.forEach((playerData, playerName) => {
		if (!participantsInSession.has(playerName)) {
			playerData.sessions.push({
				points: 0,
				omw: null,
				sessionIndex,
			});
		}
	});
}

function buildPlayerMap(sessions) {
	const playerMap = new Map();

	sessions.forEach((session, sessionIndex) => {
		const participantsInSession = new Set();

		session.players.forEach((player) => {
			participantsInSession.add(player.name);
			const playerData = getOrCreatePlayer(playerMap, player.name);
			addPlayerSession(playerData, player, sessionIndex);
		});

		addMissingSessions(playerMap, participantsInSession, sessionIndex);
	});

	return playerMap;
}

function fillFutureSessions(playerSessions, totalSessionsTarget) {
	const sessions = [...playerSessions];
	while (sessions.length < totalSessionsTarget) {
		sessions.push({
			points: null,
			omw: null,
			sessionIndex: sessions.length,
		});
	}
	return sessions;
}

function getCompletedSessions(sessions, uploadedSessionCount) {
	return sessions.slice(0, uploadedSessionCount);
}

function sumPoints(sessions) {
	return sessions.reduce(
		(sum, session) => sum + (session.points != null ? session.points : 0),
		0,
	);
}

function sortSessionsByPointsThenOmw(sessions) {
	return [...sessions].sort((a, b) => {
		if (a.points !== b.points) return b.points - a.points;
		return (b.omw || 0) - (a.omw || 0);
	});
}

function calculateBestWorst(completedSessions) {
	const pointValues = completedSessions
		.map((s) => s.points)
		.filter((point) => point != null);

	return {
		bestPoints: pointValues.length > 0 ? Math.max(...pointValues) : null,
		worstPoints: pointValues.length > 0 ? Math.min(...pointValues) : null,
	};
}

function calculateOmw(sessionsToCount) {
	const omwValues = sessionsToCount
		.filter((s) => s.omw != null)
		.map((s) => s.omw);

	if (!omwValues.length) return null;
	const total = omwValues.reduce((sum, value) => sum + value, 0);
	return Math.round(total / omwValues.length);
}

function calculateRegularScoring(completedSessions) {
	const rawSum = sumPoints(completedSessions);
	return {
		totalPoints: rawSum,
		normalPoints: rawSum,
		doubledPoints: 0,
		ignoredPoints: 0,
		omwSessions: completedSessions,
	};
}

function calculateSpecialNormalScoring(completedSessions) {
	const sortedSessions = sortSessionsByPointsThenOmw(completedSessions);
	const rawSum = sumPoints(completedSessions);
	const highest = sortedSessions[0];
	const lowest = sortedSessions[sortedSessions.length - 1];

	const ignoredPoints = lowest.points != null ? lowest.points : 0;
	const doubledPoints = highest.points != null ? highest.points : 0;
	const earnedBase = rawSum - ignoredPoints;
	const normalPoints = Math.max(0, earnedBase - doubledPoints);
	const totalPoints = earnedBase + doubledPoints;
	const omwSessions = sortedSessions.filter((session) => session !== lowest);

	return {
		totalPoints,
		normalPoints,
		doubledPoints,
		ignoredPoints,
		omwSessions,
	};
}

function calculateSpecialLongScoring(completedSessions) {
	const sortedSessions = sortSessionsByPointsThenOmw(completedSessions);
	const rawSum = sumPoints(completedSessions);
	const dropCount = Math.min(2, sortedSessions.length);
	const droppedSessions = sortedSessions.slice(-dropCount);
	const ignoredPoints = sumPoints(droppedSessions);

	const lastSession = completedSessions.find(
		(session) => session.sessionIndex === LONG_TOTAL_SESSIONS - 1,
	);
	const doubledPoints = lastSession?.points != null ? lastSession.points : 0;
	const earnedBase = rawSum - ignoredPoints;
	const normalPoints = Math.max(0, earnedBase - doubledPoints);
	const totalPoints = earnedBase + doubledPoints;
	const omwSessions = sortedSessions.filter((session) => !droppedSessions.includes(session));

	return {
		totalPoints,
		normalPoints,
		doubledPoints,
		ignoredPoints,
		omwSessions,
	};
}

function calculateScoring(completedSessions, {useSpecialScoring, useLongMode}) {
	if (!useSpecialScoring) {
		return calculateRegularScoring(completedSessions);
	}
	if (useLongMode && completedSessions.length >= 3) {
		return calculateSpecialLongScoring(completedSessions);
	}
	if (completedSessions.length >= 2) {
		return calculateSpecialNormalScoring(completedSessions);
	}
	return calculateRegularScoring(completedSessions);
}

function rankStandings(standings) {
	const sorted = [...standings].sort((a, b) => {
		if (b.points !== a.points) return b.points - a.points;
		return (b.omw || 0) - (a.omw || 0);
	});

	sorted.forEach((player, index) => {
		player.rank = index + 1;
	});

	return sorted;
}

function processPlayer(player, uploadedSessionCount, scoringConfig) {
	const sessionsWithFuture = fillFutureSessions(
		player.sessions,
		scoringConfig.totalSessionsTarget,
	);

	const completedSessions = getCompletedSessions(
		sessionsWithFuture,
		uploadedSessionCount,
	);

	const {bestPoints, worstPoints} = calculateBestWorst(completedSessions);
	const {totalPoints, normalPoints, doubledPoints, ignoredPoints, omwSessions} =
		calculateScoring(completedSessions, scoringConfig);

	return {
		name: player.name,
		points: totalPoints,
		omw: calculateOmw(omwSessions),
		bestPoints,
		worstPoints,
		sessionCount: player.participatedSessions,
		totalSessions: uploadedSessionCount,
		chartBreakdown: {
			ignoredPoints,
			normalPoints,
			doubledPoints,
		},
	};
}

export function calculateCombinedStandingsWithConfig(sessions, scoringConfig) {
	const uploadedSessionCount = sessions.length;
	const playerMap = buildPlayerMap(sessions);

	const combinedStandings = Array.from(playerMap.values()).map((player) =>
		processPlayer(player, uploadedSessionCount, scoringConfig)
	);

	return rankStandings(combinedStandings);
}

export function calculateCombinedStandings(sessions) {
	return calculateCombinedStandingsWithConfig(sessions, getScoringConfig());
}