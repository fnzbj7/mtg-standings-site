import { calculateCombinedStandings } from './standings.js';
import { SCORING_MODE_STANDARD, DEFAULT_TOTAL_SESSIONS, LONG_TOTAL_SESSIONS } from './constants.js';

function getAttendanceDisplay(attended, total) {
	if (attended === total) {
		return `<span class="perfect">✓</span>`;
	}
	const missed = total - attended;
	return `<span class="missed">${'❌'.repeat(missed)}</span>`;
}

export function displayCombinedStandings(sessions) {
	const standingsTable = document.getElementById('standings');
	const tbody = standingsTable.querySelector('tbody');
	tbody.innerHTML = '';

	// Update event date to show range
	const dates = sessions
		.map((s) => s.eventDate)
		.filter(Boolean)
		.sort();
	const totalSessionsTarget = getTotalSessionsTarget();
	const dateRange =
		dates.length > 0
			? `Sessions ${sessions.length}/${totalSessionsTarget} (${dates[0]} - ${dates[dates.length - 1]})`
			: `Sessions ${sessions.length}/${totalSessionsTarget}`;
	document.getElementById('event-date').textContent = dateRange;

	const combinedStandings = calculateCombinedStandings(sessions);

	combinedStandings.forEach((player) => {
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

	renderScoreChart(combinedStandings);
}

function renderScoreChart(players) {
	const chart = document.getElementById('score-chart-content');
	if (!chart) return;

	// Clear any previous rows (keep the heading)
	chart.replaceChildren();

	// If there are no players, show a small placeholder
	if (!players || players.length === 0) {
		const empty = document.createElement('div');
		empty.className = 'score-chart-empty';
		empty.textContent = 'Upload a file to see score breakdowns.';
		chart.appendChild(empty);
		return;
	}

	const maxTotalPos = Math.max(
		0,
		...players.map((p) => {
			const b = p.chartBreakdown || {
				normalPoints: 0,
				doubledPoints: 0,
			};
			return b.normalPoints + b.doubledPoints;
		}),
	);

	const maxTotalNeg = Math.max(
		0,
		...players.map((p) => {
			const b = p.chartBreakdown || {
				ignoredPoints: 0,
			};
			return b.ignoredPoints;
		}),
	);

	const totalRange = maxTotalPos + maxTotalNeg;
	const posBasisPct = (maxTotalPos / totalRange) * 100;
	const negBasisPct = (maxTotalNeg / totalRange) * 100;
    console.log('Max total positive points:', maxTotalPos, posBasisPct);
    console.log('Max total negative points:', maxTotalNeg, negBasisPct);

	chart.style.setProperty('--score-chart-pos-basis', `${posBasisPct}%`);
	chart.style.setProperty('--score-chart-neg-basis', `${negBasisPct}%`);

	const createSegment = (widthPercent, cls, title) => {
		if (!widthPercent || widthPercent <= 0) return null;
		const seg = document.createElement('div');
		seg.className = `score-segment ${cls}`;
		seg.style.width = `${widthPercent}%`;
		if (title) seg.title = title;
		return seg;
	};

	const table = document.createElement('table');
	table.className = 'score-chart-table';

	const thead = document.createElement('thead');
	const headerRow = document.createElement('tr');
	headerRow.innerHTML = `
		<th>Rank</th>
		<th>Name</th>
		<th>Pts</th>
		<th>Score Breakdown</th>
	`;
	thead.appendChild(headerRow);
	table.appendChild(thead);

	const tbody = document.createElement('tbody');

	players.forEach((player) => {
		const breakdown = player.chartBreakdown || {
			ignoredPoints: 0,
			normalPoints: 0,
			doubledPoints: 0,
		};

		const normalPct =
			maxTotalPos > 0
				? (breakdown.normalPoints / maxTotalPos) * 100
				: 0;
		const doubledPct =
			maxTotalPos > 0
				? (breakdown.doubledPoints / maxTotalPos) * 100
				: 0;
		const ignoredPct =
			maxTotalNeg > 0
				? (breakdown.ignoredPoints / maxTotalNeg) * 100
				: 0;

		const row = document.createElement('tr');
		row.className = 'score-row';

		const rankCell = document.createElement('td');
		rankCell.className = 'score-rank';
		rankCell.textContent = player.rank || '';

		const nameCell = document.createElement('td');
		nameCell.className = 'score-name';
		nameCell.textContent = player.name;

		const pointsCell = document.createElement('td');
		pointsCell.className = 'score-points';
		pointsCell.textContent = player.points != null ? player.points : '';

		const barCell = document.createElement('td');
		barCell.className = 'score-bar-cell';

		const bar = document.createElement('div');
		bar.className = 'score-bar';

		const positiveSide = document.createElement('div');
		positiveSide.className = 'score-bar-side score-bar-positive';
		const negativeSide = document.createElement('div');
		negativeSide.className = 'score-bar-side score-bar-negative';

		const normalSeg = createSegment(
			normalPct,
			'score-normal',
			`Normal: ${breakdown.normalPoints}`,
		);
		const doubledSeg = createSegment(
			doubledPct,
			'score-doubled',
			`Doubled: ${breakdown.doubledPoints}`,
		);
		const ignoredSeg = createSegment(
			ignoredPct,
			'score-ignored',
			`Ignored: ${breakdown.ignoredPoints}`,
		);

		if (normalSeg) positiveSide.appendChild(normalSeg);
		if (doubledSeg) positiveSide.appendChild(doubledSeg);
		if (ignoredSeg) negativeSide.appendChild(ignoredSeg);

		bar.appendChild(positiveSide);
		bar.appendChild(negativeSide);
		barCell.appendChild(bar);

		row.appendChild(rankCell);
		row.appendChild(nameCell);
		row.appendChild(pointsCell);
		row.appendChild(barCell);
		tbody.appendChild(row);
	});

	table.appendChild(tbody);
	chart.appendChild(table);
}

function updateScoringModeAvailability() {
	const disabled = !isSpecialScoringEnabled();
	const radios = document.querySelectorAll('input[name="special-scoring-mode"]');
	radios.forEach((radio) => {
		radio.disabled = disabled;
	});
}

function isSpecialScoringEnabled() {
	const checkbox = document.getElementById('special-scoring');
	return checkbox && checkbox.checked;
}

function getTotalSessionsTarget() {
	const isLong = isSpecialScoringEnabled() && getSelectedScoringMode() === 'long';
	return isLong ? LONG_TOTAL_SESSIONS : DEFAULT_TOTAL_SESSIONS;
}

function getSelectedScoringMode() {
	const checked = document.querySelector('input[name="special-scoring-mode"]:checked');
	return checked ? checked.value : SCORING_MODE_STANDARD;
}

export function setupEventListeners(sessions, displayCallback) {
	const specialScoringCheckbox = document.getElementById('special-scoring');
	const scoringModeRadios = document.querySelectorAll('input[name="special-scoring-mode"]');

	if (specialScoringCheckbox) {
		specialScoringCheckbox.addEventListener('change', () => {
			updateScoringModeAvailability();
			displayCallback(sessions);
		});
	}

	scoringModeRadios.forEach((radio) => {
		radio.addEventListener('change', () => {
			displayCallback(sessions);
		});
	});

	updateScoringModeAvailability();
}