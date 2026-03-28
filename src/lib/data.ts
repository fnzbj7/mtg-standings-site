import type { SessionData } from './types';

export const readUploadedFile = (file: File): Promise<string | object> => {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));

    const readerUTF8 = new FileReader();

    readerUTF8.onload = () => {
      const text = readerUTF8.result;
      if (typeof text !== 'string') {
        return reject(new Error('Unable to read file contents'));
      }

      if (text.includes('�')) {
        const readerANSI = new FileReader();
        readerANSI.onload = () => {
          try {
            const uint8Array = new Uint8Array(readerANSI.result as ArrayBuffer);
            const decoder = new TextDecoder('windows-1252');
            const convertedText = decoder.decode(uint8Array);
            const json = JSON.parse(convertedText);
            resolve(json);
          } catch (_error) {
            resolve(text);
          }
        };
        readerANSI.onerror = () => reject(readerANSI.error);
        readerANSI.readAsArrayBuffer(file);
      } else {
        try {
          const json = JSON.parse(text);
          resolve(json);
        } catch {
          resolve(text);
        }
      }
    };

    readerUTF8.onerror = () => reject(readerUTF8.error);
    readerUTF8.readAsText(file, 'utf-8');
  });
};

export const processEventData = (data: unknown, file: File | null = null): SessionData | null => {
  if (!data) return null;

  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    const playersArray =
      (Array.isArray(record.players) ? record.players : undefined) ||
      (Array.isArray(record.standings) ? record.standings : undefined);

    if (playersArray) {
      const players = playersArray.map((item) => {
        const player = item as Record<string, unknown>;
        const parseNum = (value: unknown) => {
          if (value === null || value === undefined) return null;
          if (typeof value === 'number') return value;
          const cleaned = String(value).replace(/[^0-9.-]/g, '');
          const parsed = cleaned === '' ? null : Number(cleaned);
          return Number.isFinite(parsed) ? parsed : null;
        };
        return {
          rank: parseInt(String(player.rank ?? player.Rank ?? ''), 10) || null,
          name: String(player.name ?? player.Name ?? player.player ?? '') || null,
          points: parseNum(player.points ?? player.Points),
          omw: parseNum(player.omw ?? player.OMW),
          gw: parseNum(player.gw ?? player.GW),
          ogw: parseNum(player.ogw ?? player.OGW),
        };
      });

      return {
        title: String(record.title ?? '') || null,
        event: String(record.event ?? '') || null,
        eventDate: String(record.eventDate ?? '') || null,
        players,
      };
    }

    return {
      title: null,
      event: null,
      eventDate: String(record.eventDate ?? '') || null,
      players: [],
    };
  }

  if (typeof data === 'string') {
    const isHtml =
      (file && file.name.toLowerCase().endsWith('.html')) ||
      data.includes('<html') ||
      data.includes('<!DOCTYPE') ||
      data.includes('<table');

    if (isHtml) {
      return parseStandingsHTML(data, file);
    }

    try {
      const parsed = JSON.parse(data);
      return processEventData(parsed, file);
    } catch {
      return parseStandingsText(data);
    }
  }

  return null;
};

function parseStandingsText(text: string): SessionData | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\u00A0/g, ' ').replace(/\t/g, ' ').trimRight());

  const result: SessionData = {
    title: null,
    event: null,
    eventDate: null,
    raw: text,
    players: [],
  };

  for (let i = 0; i < Math.min(lines.length, 20); i += 1) {
    const line = lines[i] || '';
    if (!result.title && line.startsWith('Report:')) {
      result.title = line.replace(/^Report:\s*/, '').trim();
    }
    if (!result.event && line.startsWith('Event:')) {
      result.event = line.replace(/^Event:\s*/, '').trim();
    }
    if (!result.eventDate && line.startsWith('Event Date:')) {
      result.eventDate = line.replace(/^Event Date:\s*/, '').trim();
    }
  }

  let sepIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^-{5,}/.test(lines[i])) {
      sepIndex = i;
      break;
    }
  }

  if (sepIndex === -1) {
    for (let i = 0; i < lines.length; i += 1) {
      if (/^\s*Rank\b/i.test(lines[i]) || lines[i].includes('OMW%')) {
        sepIndex = i + 1;
        break;
      }
    }
  }

  for (let i = sepIndex + 1; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    if (!raw) continue;
    if (/^EventLink/i.test(raw)) break;

    const tokens = raw.split(/\s+/);
    if (tokens.length < 4) continue;

    let rankIndex = 0;
    if (!/^\d+$/.test(tokens[0])) {
      rankIndex = tokens.findIndex((token) => /^\d+$/.test(token));
      if (rankIndex === -1) continue;
    }

    const dataTokens = tokens.slice(rankIndex);
    if (dataTokens.length < 5) continue;

    const parseNum = (value: string | undefined) => {
      if (value == null) return null;
      const cleaned = value.replace(/[^0-9.-]/g, '');
      const parsed = cleaned === '' ? null : Number(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const rankRaw = dataTokens.shift();
    const ogwRaw = dataTokens.pop();
    const gwRaw = dataTokens.pop();
    const omwRaw = dataTokens.pop();
    const pointsRaw = dataTokens.pop();
    const name = dataTokens.join(' ').replace(/\s+/g, ' ').trim();

    const player = {
      rank: rankRaw ? parseInt(rankRaw, 10) || null : null,
      name: name || null,
      points: parseNum(pointsRaw),
      omw: parseNum(omwRaw),
      gw: parseNum(gwRaw),
      ogw: parseNum(ogwRaw),
    };

    if (player.rank && player.name) {
      result.players.push(player);
    }
  }

  return result;
}

function parseStandingsHTML(html: string, file: File | null): SessionData | null {
  const result: SessionData = {
    title: null,
    event: null,
    eventDate: null,
    raw: html,
    players: [],
  };

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const title = doc.querySelector('title');
  if (title) {
    result.title = title.textContent?.trim() || null;
    if (result.title) {
      const titleMatch = result.title.match(/Standings for (.+?)(?:_\d+)?$/);
      if (titleMatch) {
        result.event = titleMatch[1].trim();
      }
    }
  }

  if (file && file.lastModified) {
    result.eventDate = new Date(file.lastModified).toLocaleDateString();
  }

  const standingsTable =
    doc.querySelector('table.standings') ||
    doc.querySelector('table[class*="standings"]') ||
    doc.querySelector('table');

  if (!standingsTable) {
    return result;
  }

  const rows = Array.from(standingsTable.querySelectorAll('tr'));
  let headerRowIndex = -1;

  for (let i = 0; i < rows.length; i += 1) {
    const rowText = rows[i].textContent?.toLowerCase() || '';
    if (rowText.includes('rank') && (rowText.includes('name') || rowText.includes('player')) && rowText.includes('points')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1 && rows.length > 0) {
    headerRowIndex = 0;
  }

  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const cells = Array.from(row.querySelectorAll('td, th'));
    if (cells.length < 4) continue;

    const cellTexts = cells.map((cell) => cell.textContent?.trim().replace(/\s+/g, ' ') || '');
    if (!cellTexts[0] || !/^\d+$/.test(cellTexts[0])) continue;

    const parseNum = (value: string | undefined) => {
      if (!value) return null;
      const cleaned = value.replace(/[^0-9.-]/g, '');
      const parsed = cleaned === '' ? null : Number(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const player = {
      rank: parseInt(cellTexts[0], 10) || null,
      name: cellTexts[1] || null,
      points: parseNum(cellTexts[2]),
      omw: parseNum(cellTexts[4]),
      gw: parseNum(cellTexts[5]),
      ogw: parseNum(cellTexts[6]),
    };

    if (player.rank && player.name) {
      result.players.push(player);
    }
  }

  return result;
}
