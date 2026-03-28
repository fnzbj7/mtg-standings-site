import { STORAGE_KEY } from './constants';
import type { SessionData } from './types';

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
