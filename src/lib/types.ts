export type ScoringMode = 'standard' | 'long';

export interface SessionPlayer {
  rank: number | null;
  name: string | null;
  points: number | null;
  omw: number | null;
  gw: number | null;
  ogw: number | null;
  rawLine?: string;
}

export interface SessionData {
  title: string | null;
  event: string | null;
  eventDate: string | null;
  raw?: string;
  players: SessionPlayer[];
}

export interface ScoringConfig {
  useSpecialScoring: boolean;
  useLongMode: boolean;
  totalSessionsTarget: number;
}

export interface PlayerStanding {
  name: string | null;
  points: number;
  omw: number | null;
  bestPoints: number | null;
  worstPoints: number | null;
  rank: number;
  sessionCount: number;
  totalSessions: number;
  chartBreakdown: {
    ignoredPoints: number;
    normalPoints: number;
    doubledPoints: number;
  };
}
