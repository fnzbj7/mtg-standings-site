import { STORAGE_KEY } from './constants.js';

// Store all sessions (will be managed in app.js)
let allSessions = [];

// Load saved sessions on page load
export function loadSavedSessions() {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			allSessions = JSON.parse(saved);
			console.log('Loaded saved sessions:', allSessions.length);
		}
	} catch (err) {
		console.error('Error loading saved sessions:', err);
	}
	return allSessions;
}

// Save sessions to localStorage
export function saveSessions(sessions) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
		console.log('Saved sessions:', sessions.length);
	} catch (err) {
		console.error('Error saving sessions:', err);
	}
}

// Add or update a session
export function addOrUpdateSession(newSession, sessions) {
	// Find existing session with same date
	const existingIndex = sessions.findIndex(
		(session) => session.eventDate === newSession.eventDate,
	);

	if (existingIndex !== -1) {
		// Replace existing session
		sessions[existingIndex] = newSession;
		console.log(`Updated existing session from ${newSession.eventDate}`);
	} else {
		// Add new session
		sessions.push(newSession);
		console.log(`Added new session from ${newSession.eventDate}`);
	}

	// Sort sessions by date
	sessions.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

	saveSessions(sessions);
}

// Reset all sessions
export function resetSessions() {
	allSessions = [];
	localStorage.removeItem(STORAGE_KEY);
	console.log('Reset all sessions and cleared storage');
	return allSessions;
}