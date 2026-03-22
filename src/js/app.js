import {
	loadSavedSessions,
	addOrUpdateSession,
	resetSessions,
} from './storage.js';
import { displayCombinedStandings, setupEventListeners } from './ui.js';

const { readUploadedFile, processEventData } = window.MTG || {};

// Store all sessions
let allSessions = [];

// Load saved sessions on page load
function initializeApp() {
	allSessions = loadSavedSessions();
	displayCombinedStandings(allSessions);
	setupEventListeners(allSessions, (sessions) =>
		displayCombinedStandings(sessions),
	);
}

const fileInput = document.getElementById('file-input');
const output = document.getElementById('file-content'); // matches the <pre id="file-content">

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
			addOrUpdateSession(sessionData, allSessions);
			displayCombinedStandings(allSessions);
			console.log('Added session:', sessionData);
		}
	} catch (err) {
		console.error('Error reading file:', err);
		if (output) {
			// Check if element exists
			output.textContent = 'Error reading file: ' + err.message;
		}
	}
});

// Add a reset button
const resetButton = document.createElement('button');
resetButton.textContent = 'Reset All Sessions';
resetButton.onclick = () => {
	allSessions = resetSessions();
	displayCombinedStandings(allSessions);
	output.textContent = '';
};
document.querySelector('#upload-form').appendChild(resetButton);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
