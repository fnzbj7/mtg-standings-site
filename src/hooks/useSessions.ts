import { useState } from 'react';
import {
    addOrUpdateSession,
    loadSavedSessions,
    resetSessions,
} from '../lib/storage';
import type { SessionData } from '../lib/types';

export function useSessions() {
    const [sessions, setSessions] = useState<SessionData[]>(() => loadSavedSessions());

    const updateSessions = (newSession: SessionData) => {
        const nextSessions = addOrUpdateSession(newSession, sessions);
        setSessions(nextSessions);
        return nextSessions;
    };

    const clearSessions = () => {
        resetSessions();
        setSessions([]);
    };

    return {
        sessions,
        addOrUpdateSession: updateSessions,
        resetSessions: clearSessions,
    };
}
