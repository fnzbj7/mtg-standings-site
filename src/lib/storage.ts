import { CONFIG_STORAGE_KEY, DEFAULT_NUMBER_OF_ROUNDS, DEFAULT_SKIP_LOWEST_COUNT, STORAGE_KEY } from './constants';
import type { AppConfig, SessionData } from './types';

const DEFAULT_CONFIG: AppConfig = {
  specialScoring: false,
  scoringMode: 'standard',
  numberOfRounds: DEFAULT_NUMBER_OF_ROUNDS,
  skipLowest: false,
  skipLowestCount: DEFAULT_SKIP_LOWEST_COUNT,
  doubleHighest: false,
  doubleLast: false,
};

export function loadConfig(): AppConfig {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...(JSON.parse(saved) as Partial<AppConfig>) };
    }
  } catch (error) {
    console.error('Unable to load config:', error);
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Unable to save config:', error);
  }
}

export function clearConfig(): void {
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  } catch (error) {
    console.error('Unable to clear config:', error);
  }
}

export function loadSavedSessions(): SessionData[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as SessionData[];
    }
  } catch (error) {
    console.error('Unable to load saved sessions:', error);
  }
  return [];
}

export function saveSessions(sessions: SessionData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Unable to save sessions:', error);
  }
}

export function addOrUpdateSession(newSession: SessionData, sessions: SessionData[]): SessionData[] {
  const existingIndex = sessions.findIndex(
    (session) => session.eventDate === newSession.eventDate,
  );

  const nextSessions = [...sessions];

  if (existingIndex !== -1) {
    nextSessions[existingIndex] = newSession;
  } else {
    nextSessions.push(newSession);
  }

  nextSessions.sort((a, b) => {
    const aTime = a.eventDate ? new Date(a.eventDate).getTime() : 0;
    const bTime = b.eventDate ? new Date(b.eventDate).getTime() : 0;
    return aTime - bTime;
  });

  saveSessions(nextSessions);
  return nextSessions;
}

export function resetSessions(): SessionData[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Unable to clear saved sessions:', error);
  }
  return [];
}
