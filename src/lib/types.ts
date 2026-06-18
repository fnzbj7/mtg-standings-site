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
  uploadId?: string;
  raw?: string;
  players: SessionPlayer[];
}

export interface AppConfig {
  specialScoring: boolean;
  scoringMode: ScoringMode;
  numberOfRounds: number;
  skipLowest: boolean;
  skipLowestCount: number;
  doubleHighest: boolean;
  doubleLast: boolean;
}

export interface ScoringConfig {
  useSpecialScoring: boolean;
  useLongMode: boolean;
  skipLowest: boolean;
  skipLowestCount: number;
  doubleHighest: boolean;
  doubleLast: boolean;
  numberOfRounds: number;
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
