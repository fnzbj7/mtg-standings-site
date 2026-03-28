/**
 * Read an uploaded file (text or JSON) and return parsed JSON or raw text.
 * Resolves with an object (if JSON) or string (raw text).
 */
const readUploadedFile = (file) => {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('No file provided'));

        // First try to read as UTF-8
        const readerUTF8 = new FileReader();
        readerUTF8.onload = () => {
            const text = readerUTF8.result;
            // Check if the text contains replacement characters (�) which might indicate wrong encoding
            if (text.includes('�')) {
                // If UTF-8 failed, try Windows-1252 (ANSI)
                const readerANSI = new FileReader();
                readerANSI.onload = () => {
                    // Convert Windows-1252 to UTF-8
                    const decoder = new TextDecoder('windows-1252');
                    const uint8Array = new Uint8Array(readerANSI.result);
                    const convertedText = decoder.decode(uint8Array);
                    
                    console.log('File was ANSI encoded, converted to UTF-8');
                    try {
                        const json = JSON.parse(convertedText);
                        resolve(json);
                    } catch (e) {
                        resolve(convertedText);
                    }
                };
                readerANSI.onerror = () => reject(readerANSI.error);
                readerANSI.readAsArrayBuffer(file);
            } else {
                // UTF-8 reading was successful
                console.log('File was UTF-8 encoded');
                try {
                    const json = JSON.parse(text);
                    resolve(json);
                } catch (e) {
                    resolve(text);
                }
            }
        };
        readerUTF8.onerror = () => reject(readerUTF8.error);
        readerUTF8.readAsText(file, 'utf-8');
    });
};

const fetchEventData = async () => {
    try {
        const response = await fetch('../data/sample-event.json');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching event data:', error);
    }
};

const processEventData = (data, file = null) => {
    // Accept object (already structured), JSON string, raw standings text, or HTML content
    if (!data) return null;
    if (typeof data === 'object') {
        // assume structured: try to map into normalized shape if possible
        if (Array.isArray(data.players) || Array.isArray(data.standings)) {
            const players = (data.players || data.standings || []).map(p => ({
                rank: p.rank ?? p.Rank ?? null,
                name: p.name ?? p.Name ?? p.player ?? null,
                points: p.points ?? p.Points ?? null,
                omw: p.omw ?? p.OMW ?? null,
                gw: p.gw ?? p.GW ?? null,
                ogw: p.ogw ?? p.OGW ?? null
            }));
            return { title: data.title || null, event: data.event || null, eventDate: data.eventDate || null, players };
        }
        // unknown object format -> return as-is
        return data;
    }

    if (typeof data === 'string') {
        // Check if it's HTML content (file extension or HTML tags)
        const isHtml = (file && file.name && file.name.toLowerCase().endsWith('.html')) || 
                      data.includes('<html') || data.includes('<!DOCTYPE') || data.includes('<table');
        
        if (isHtml) {
            const parsed = parseStandingsHTML(data, file);
            return parsed;
        }
        
        // try JSON parse first
        try {
            const obj = JSON.parse(data);
            return processEventData(obj);
        } catch (e) {
            // not JSON -> try plain text parser
            const parsed = parseStandingsText(data);
            return parsed;
        }
    }

    return null;
};

/**
 * Parse plain text standings files produced by EventLink/Wizards output.
 * Returns an object:
 * {
 *   title: string,
 *   event: string,
 *   eventDate: string,
 *   raw: string,
 *   players: [{ rank, name, points, omw, gw, ogw, rawLine }, ...]
 * }
 */
function parseStandingsText(text) {
    if (typeof text !== 'string') return null;
    const lines = text.split(/\r?\n/).map(l => l.replace(/\u00A0/g, ' ').replace(/\t/g, ' ').trimRight());
    const result = { title: null, event: null, eventDate: null, raw: text, players: [] };

    // Extract event title and date lines if present
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const l = lines[i] || '';
        if (!result.title && l.startsWith('Report:')) result.title = l.replace(/^Report:\s*/,'').trim();
        if (!result.event && l.startsWith('Event:')) result.event = l.replace(/^Event:\s*/,'').trim();
        if (!result.eventDate && l.startsWith('Event Date:')) result.eventDate = l.replace(/^Event Date:\s*/,'').trim();
    }

    // find separator line (----...) index
    let sepIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (/^-{5,}/.test(lines[i])) { sepIndex = i; break; }
    }
    if (sepIndex === -1) {
        // fallback: find header line containing "Rank" and skip one line
        for (let i = 0; i < lines.length; i++) {
            if (/^\s*Rank\b/i.test(lines[i]) || lines[i].includes('OMW%')) {
                sepIndex = i + 1;
                break;
            }
        }
    }

    // collect data lines after sepIndex
    if (sepIndex >= 0) {
        for (let i = sepIndex + 1; i < lines.length; i++) {
            const raw = lines[i].trim();
            if (!raw) continue;
            if (/^EventLink/i.test(raw)) break; // stop at footer
            // sometimes header rows or stray text appear; skip lines that don't start with digit rank
            // tokens approach: rank is first token (number), last 3 tokens are OGW GW OMW (numbers), before them Points
            const tokens = raw.split(/\s+/);
            if (tokens.length < 4) continue;
            // find first numeric token as rank index (handles stray leading chars)
            let rankIdx = 0;
            if (!/^\d+$/.test(tokens[0])) {
                rankIdx = tokens.findIndex(t => /^\d+$/.test(t));
                if (rankIdx === -1) continue;
            }
            // Slice tokens from rankIdx to end
            const dataTokens = tokens.slice(rankIdx);
            if (dataTokens.length < 5) continue; // need at least rank + name + points + 3 win fields
            // parse numbers from the end
            const ogwRaw = dataTokens.pop();
            const gwRaw = dataTokens.pop();
            const omwRaw = dataTokens.pop();
            const pointsRaw = dataTokens.pop();
            const rankRaw = dataTokens.shift(); // first token
            const name = dataTokens.join(' ').replace(/\s+/g, ' ').trim();

            const parseNum = (s) => {
                if (s == null) return null;
                const cleaned = s.replace(/[^0-9\.\-]/g,'');
                const n = cleaned === '' ? null : Number(cleaned);
                return Number.isFinite(n) ? n : null;
            };

            const player = {
                rank: parseInt(rankRaw, 10) || null,
                name: name || null,
                points: parseNum(pointsRaw),
                omw: parseNum(omwRaw),
                gw: parseNum(gwRaw),
                ogw: parseNum(ogwRaw),
                rawLine: raw
            };
            result.players.push(player);
        }
    }

    return result;

};

/**
 * Parse HTML standings files (saved web pages from EventLink).
 * Returns an object:
 * {
 *   title: string,
 *   event: string,
 *   eventDate: string,
 *   raw: string,
 *   players: [{ rank, name, points, omw, gw, ogw, rawLine }, ...]
 * }
 */
function parseStandingsHTML(html, file = null) {
    if (typeof html !== 'string') return null;
    
    const result = { title: null, event: null, eventDate: null, raw: html, players: [] };
    
    // Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Try to extract event name from page title or headings
    const title = doc.querySelector('title');
    if (title) {
        result.title = title.textContent.trim();
        // Extract event name from title if it follows pattern like "EventLink - Standings for LimCon 4"
        const titleMatch = result.title.match(/Standings for (.+?)(?:_\d+)?$/);
        if (titleMatch) {
            result.event = titleMatch[1].trim();
        }
    }

    // Try to get event date from file modification time if available
    if (file && file.lastModified) {
        result.eventDate = new Date(file.lastModified).toLocaleDateString();
    }
    
    // Look for standings table - try multiple selectors
    let standingsTable = doc.querySelector('table.standings') || 
                        doc.querySelector('table[class*="standings"]') ||
                        doc.querySelector('table');
    
    if (!standingsTable) {
        console.warn('No standings table found in HTML');
        return result;
    }
    
    // Find all table rows
    const rows = standingsTable.querySelectorAll('tr');
    let headerRowIndex = -1;
    
    // Find the header row (contains "Rank", "Name", "Points", etc.)
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const text = row.textContent.toLowerCase();
        if (text.includes('rank') && (text.includes('name') || text.includes('player')) && text.includes('points')) {
            headerRowIndex = i;
            break;
        }
    }
    
    // If no header found, assume first row is header
    if (headerRowIndex === -1 && rows.length > 0) {
        headerRowIndex = 0;
    }
    
    // Parse data rows (after header)
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td, th');
        
        if (cells.length < 4) continue; // Need at least rank, name, points, and one tiebreaker
        
        // Extract cell text values
        const cellTexts = Array.from(cells).map(cell => {
            return cell.textContent.trim().replace(/\s+/g, ' ');
        });
        
        // Skip empty rows or rows that don't start with a number
        if (!cellTexts[0] || !/^\d+$/.test(cellTexts[0])) continue;
        
        const parseNum = (s) => {
            if (!s) return null;
            const cleaned = s.replace(/[^0-9\.\-]/g, '');
            const n = cleaned === '' ? null : Number(cleaned);
            return Number.isFinite(n) ? n : null;
        };
        
        // Map columns - typical order is: Rank, Name, Points, OMW%, GW%, OGW%
        const player = {
            rank: parseInt(cellTexts[0], 10) || null,
            name: cellTexts[1] || null,
            points: parseNum(cellTexts[2]),
            omw: cellTexts.length > 3 ? parseNum(cellTexts[4]) : null,
            gw: cellTexts.length > 4 ? parseNum(cellTexts[5]) : null,
            ogw: cellTexts.length > 5 ? parseNum(cellTexts[6]) : null,
            rawLine: cellTexts.join('\t')
        };
        
        // Only add players with valid rank and name
        if (player.rank && player.name) {
            result.players.push(player);
        }
    }
    
    console.log(`Parsed ${result.players.length} players from HTML standings`);
    return result;
}


// Add this instead:
window.MTG = window.MTG || {};
window.MTG.fetchEventData = fetchEventData;
window.MTG.processEventData = processEventData;
window.MTG.readUploadedFile = readUploadedFile;
window.MTG.parseStandingsText = parseStandingsText;
window.MTG.parseStandingsHTML = parseStandingsHTML;