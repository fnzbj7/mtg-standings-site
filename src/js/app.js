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
    const existingIndex = allSessions.findIndex(session => 
        session.eventDate === newSession.eventDate
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
    allSessions.sort((a, b) => 
        new Date(a.eventDate) - new Date(b.eventDate)
    );

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
const specialScoringCheckbox = document.getElementById('special-scoring');

// Add the checkbox if it doesn't exist in HTML
if (!specialScoringCheckbox) {
    const label = document.createElement('label');
    label.innerHTML = `
        <input type="checkbox" id="special-scoring" />
        Use Special Scoring (Double Best, Ignore Worst)
    `;
    document.querySelector('#upload-form').appendChild(label);
}

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const content = await readUploadedFile(file);
        // show raw text or pretty JSON
        if (output) {  // Check if element exists
            output.textContent = (typeof content === 'string') ? content : JSON.stringify(content, null, 2);
        }
        // Process the content and add to sessions
        const sessionData = processEventData(content);
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
        if (output) {  // Check if element exists
            output.textContent = 'Error reading file: ' + err.message;
        }
    }
});

specialScoringCheckbox.addEventListener('change', () => {
    displayCombinedStandings(allSessions);
});

function calculateCombinedStandings(sessions) {
    const playerMap = new Map();
    const useSpecialScoring = specialScoringCheckbox.checked;
    const uploadedSessionCount = sessions.length; // Number of events that have happened

    sessions.forEach((session) => {
        // Track who participated in this session
        const participantsInSession = new Set(session.players.map(p => p.name));
        
        session.players.forEach(player => {
            const existing = playerMap.get(player.name) || {
                name: player.name,
                sessions: [],
                participatedSessions: 0
            };
            existing.sessions.push({
                points: player.points || 0,
                omw: player.omw || null
            });
            existing.participatedSessions++;
            playerMap.set(player.name, existing);
        });

        // Add 0 points for players who missed this session
        playerMap.forEach((playerData, playerName) => {
            if (!participantsInSession.has(playerName)) {
                playerData.sessions.push({
                    points: 0,  // Missing a session = 0 points
                    omw: null
                });
            }
        });
    });

    const combinedStandings = Array.from(playerMap.values()).map(player => {
        // Fill remaining sessions with null (future events)
        while (player.sessions.length < 6) {
            player.sessions.push({
                points: null,  // Future event = null points
                omw: null
            });
        }

        const completedSessions = player.sessions.slice(0, uploadedSessionCount);
        
        // Always calculate best and worst points first
        if (completedSessions.length > 0) {
            const pointValues = completedSessions
                .map(s => s.points)
                .filter(points => points !== null);
            
            player.bestPoints = pointValues.length > 0 ? Math.max(...pointValues) : null;
            player.worstPoints = pointValues.length > 0 ? Math.min(...pointValues) : null;
        }

        let totalPoints = 0;
        let validOmwCount = 0;
        let omwSum = 0;

        if (useSpecialScoring && completedSessions.length >= 2) {
            // Sort by points (descending), then by OMW (descending)
            const sortedSessions = [...completedSessions].sort((a, b) => {
                if (a.points !== b.points) return b.points - a.points;
                return (b.omw || 0) - (a.omw || 0);
            });

            const highest = sortedSessions[0];
            const lowest = sortedSessions[sortedSessions.length - 1];

            // Calculate total points
            totalPoints = sortedSessions.reduce((sum, session) => sum + session.points, 0);
            totalPoints += highest.points; // Double the highest
            totalPoints -= lowest.points; // Remove the lowest

            // Calculate OMW (counting each OMW just once)
            sortedSessions.forEach(session => {
                if (session === lowest) return; // Skip lowest OMW
                if (session.omw) {
                    omwSum += session.omw;
                    validOmwCount++;
                }
            });
        } else {
            // Regular scoring
            totalPoints = completedSessions.reduce((sum, session) => {
                if (session.omw) {
                    omwSum += session.omw;
                    validOmwCount++;
                }
                return sum + (session.points || 0);
            }, 0);
        }

        return {
            name: player.name,
            points: totalPoints,
            omw: validOmwCount ? Math.round(omwSum / validOmwCount) : null,
            bestPoints: player.bestPoints,
            worstPoints: player.worstPoints,
            sessionCount: player.participatedSessions,
            totalSessions: uploadedSessionCount
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
        .map(s => s.eventDate)
        .filter(Boolean)
        .sort();
    const dateRange = dates.length > 0 
        ? `Sessions ${sessions.length}/6 (${dates[0]} - ${dates[dates.length-1]})`
        : `Sessions ${sessions.length}/6`;
    document.getElementById('event-date').textContent = dateRange;

    const combinedStandings = calculateCombinedStandings(sessions);

    combinedStandings.forEach(player => {
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