import type { ScoringConfig, PlayerStanding, SessionData } from './types';

function getOrCreatePlayer(playerMap: Map<string, { name: string; sessions: Array<{ points: number | null; omw: number | null; sessionIndex: number }>; participatedSessions: number; }>, playerName: string) {
  if (!playerMap.has(playerName)) {
    playerMap.set(playerName, {
      name: playerName,
      sessions: [],
      participatedSessions: 0,
    });
  }
  return playerMap.get(playerName)!;
}

function addPlayerSession(
  playerData: {
    sessions: Array<{ points: number | null; omw: number | null; sessionIndex: number }>;
    participatedSessions: number;
  },
  player: { points: number | null; omw: number | null },
  sessionIndex: number,
) {
  playerData.sessions.push({
    points: player.points != null ? player.points : 0,
    omw: player.omw != null ? player.omw : null,
    sessionIndex,
  });
  playerData.participatedSessions += 1;
}

function addMissingSessions(
  playerMap: Map<string, { name: string; sessions: Array<{ points: number | null; omw: number | null; sessionIndex: number }>; participatedSessions: number }>,
  participantsInSession: Set<string>,
  sessionIndex: number,
) {
  playerMap.forEach((playerData, playerName) => {
    if (!participantsInSession.has(playerName)) {
      playerData.sessions.push({ points: 0, omw: null, sessionIndex });
    }
  });
}

function fillFutureSessions(
  playerSessions: Array<{ points: number | null; omw: number | null; sessionIndex: number }>,
  totalSessionsTarget: number,
) {
  const sessions = [...playerSessions];
  while (sessions.length < totalSessionsTarget) {
    sessions.push({ points: null, omw: null, sessionIndex: sessions.length });
  }
  return sessions;
}

function sumPoints(sessions: Array<{ points: number | null; omw: number | null }>) {
  return sessions.reduce((sum, session) => sum + (session.points != null ? session.points : 0), 0);
}

function sortSessionsByPointsThenOmw(sessions: Array<{ points: number | null; omw: number | null }>) {
  return [...sessions].sort((a, b) => {
    if (a.points !== b.points) return (b.points ?? 0) - (a.points ?? 0);
    return (b.omw ?? 0) - (a.omw ?? 0);
  });
}

function calculateBestWorst(sessions: Array<{ points: number | null }>) {
  const pointValues = sessions.map((s) => s.points).filter((point): point is number => point != null);
  return {
    bestPoints: pointValues.length > 0 ? Math.max(...pointValues) : null,
    worstPoints: pointValues.length > 0 ? Math.min(...pointValues) : null,
  };
}

function calculateOmw(sessionsToCount: Array<{ omw: number | null }>) {
  const omwValues = sessionsToCount.map((s) => s.omw).filter((value): value is number => value != null);
  if (omwValues.length === 0) return null;
  const total = omwValues.reduce((sum, value) => sum + value, 0);
  return Math.round(total / omwValues.length);
}

function calculateRegularScoring(completedSessions: Array<{ points: number | null; omw: number | null }>) {
  const rawSum = sumPoints(completedSessions);
  return {
    totalPoints: rawSum,
    normalPoints: rawSum,
    doubledPoints: 0,
    ignoredPoints: 0,
    omwSessions: completedSessions,
  };
}

function resolveSkipCount(config: ScoringConfig) {
  if (!config.skipLowest) {
    return 0;
  }

  const parsed = Math.floor(config.skipLowestCount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return parsed;
}

function calculateSpecialNormalScoring(
  completedSessions: Array<{ points: number | null; omw: number | null }>,
  configuredSkipCount: number,
) {
  const sortedSessions = sortSessionsByPointsThenOmw(completedSessions);
  const rawSum = sumPoints(completedSessions);
  const highest = sortedSessions[0];
  const dropCount = Math.min(configuredSkipCount, sortedSessions.length);
  const droppedSessions = dropCount > 0 ? sortedSessions.slice(-dropCount) : [];

  const ignoredPoints = sumPoints(droppedSessions);
  const doubledPoints = highest?.points != null ? highest.points : 0;
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

function calculateSpecialLongScoring(
  completedSessions: Array<{ points: number | null; omw: number | null; sessionIndex: number }>,
  configuredNumberOfRounds: number,
  configuredSkipCount: number,
) {
  const sortedSessions = sortSessionsByPointsThenOmw(completedSessions);
  const rawSum = sumPoints(completedSessions);
  const dropCount = Math.min(configuredSkipCount, sortedSessions.length);
  const droppedSessions = dropCount > 0 ? sortedSessions.slice(-dropCount) : [];
  const ignoredPoints = sumPoints(droppedSessions);

  const configuredLastRoundIndex = Math.max(0, configuredNumberOfRounds - 1);
  const lastSession = completedSessions.find((session) => session.sessionIndex === configuredLastRoundIndex);
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

function calculateScoring(
  completedSessions: Array<{ points: number | null; omw: number | null; sessionIndex: number }>,
  config: ScoringConfig,
) {
  if (!config.useSpecialScoring) {
    return calculateRegularScoring(completedSessions);
  }

  const configuredSkipCount = resolveSkipCount(config);

  if (config.useLongMode && completedSessions.length >= 3) {
    return calculateSpecialLongScoring(completedSessions, config.numberOfRounds, configuredSkipCount);
  }

  if (completedSessions.length >= 2) {
    return calculateSpecialNormalScoring(completedSessions, configuredSkipCount);
  }

  return calculateRegularScoring(completedSessions);
}

function rankStandings(standings: PlayerStanding[]) {
  const sorted = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return (b.omw ?? 0) - (a.omw ?? 0);
  });

  return sorted.map((player, index) => ({ ...player, rank: index + 1 }));
}

function buildPlayerMap(sessions: SessionData[]) {
  const playerMap = new Map<string, { name: string; sessions: Array<{ points: number | null; omw: number | null; sessionIndex: number }>; participatedSessions: number; }>();

  sessions.forEach((session, sessionIndex) => {
    const participants = new Set<string>();

    session.players.forEach((player) => {
      if (!player.name) return;
      participants.add(player.name);
      const playerData = getOrCreatePlayer(playerMap, player.name);
      addPlayerSession(playerData, player, sessionIndex);
    });

    addMissingSessions(playerMap, participants, sessionIndex);
  });

  return playerMap;
}

function processPlayer(
  player: { name: string; sessions: Array<{ points: number | null; omw: number | null; sessionIndex: number }>; participatedSessions: number },
  uploadedSessionCount: number,
  scoringConfig: ScoringConfig,
) {
  const sessionsWithFuture = fillFutureSessions(player.sessions, scoringConfig.totalSessionsTarget);
  const completedSessions = sessionsWithFuture.slice(0, uploadedSessionCount);
  const { bestPoints, worstPoints } = calculateBestWorst(completedSessions);
  const { totalPoints, normalPoints, doubledPoints, ignoredPoints, omwSessions } = calculateScoring(completedSessions, scoringConfig);

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
    rank: 0,
  };
}

export function calculateCombinedStandingsWithConfig(sessions: SessionData[], scoringConfig: ScoringConfig): PlayerStanding[] {
  const uploadedSessionCount = sessions.length;
  const playerMap = buildPlayerMap(sessions);
  const combinedStandings = Array.from(playerMap.values()).map((player) =>
    processPlayer(player, uploadedSessionCount, scoringConfig),
  );
  return rankStandings(combinedStandings);
}
