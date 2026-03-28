import { type ChangeEvent, type CSSProperties, useMemo, useState } from 'react';
import {
    addOrUpdateSession,
    loadSavedSessions,
    resetSessions,
    saveSessions,
} from './lib/storage';
import { calculateCombinedStandingsWithConfig } from './lib/standings';
import { processEventData, readUploadedFile } from './lib/data';
import type { ScoringConfig, ScoringMode, SessionData } from './lib/types';
import './App.css';

function App() {
    const [sessions, setSessions] = useState<SessionData[]>(() => loadSavedSessions());
    const [fileContent, setFileContent] = useState('');
    const [errorText, setErrorText] = useState<string | null>(null);
    const [specialScoring, setSpecialScoring] = useState(false);
    const [scoringMode, setScoringMode] = useState<ScoringMode>('standard');

    const totalSessionsTarget = specialScoring && scoringMode === 'long' ? 9 : 6;

    const scoringConfig = useMemo<ScoringConfig>(() => ({
        useSpecialScoring: specialScoring,
        useLongMode: specialScoring && scoringMode === 'long',
        totalSessionsTarget,
    }), [specialScoring, scoringMode, totalSessionsTarget]);

    const combinedStandings = useMemo(
        () => calculateCombinedStandingsWithConfig(sessions, scoringConfig),
        [sessions, scoringConfig],
    );

    const eventDateSummary = useMemo(() => {
        const dates = sessions
            .map((session) => session.eventDate)
            .filter((date): date is string => Boolean(date))
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        if (dates.length === 0) {
            return `Sessions 0/${totalSessionsTarget}`;
        }
        if (dates.length === 1) {
            return `Sessions 1/${totalSessionsTarget} (${dates[0]})`;
        }
        return `Sessions ${dates.length}/${totalSessionsTarget} (${dates[0]} - ${dates[dates.length - 1]})`;
    }, [sessions, totalSessionsTarget]);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        if (!file) return;

        try {
            const content = await readUploadedFile(file);
            const sessionData = processEventData(content, file);
            if (!sessionData) {
                setErrorText('Unable to parse the uploaded file.');
                return;
            }

            const resolvedSession: SessionData = {
                ...sessionData,
                eventDate:
                    sessionData.eventDate ||
                    new Date(file.lastModified).toLocaleDateString(),
            };

            const updated = addOrUpdateSession(resolvedSession, sessions);
            setSessions(updated);
            saveSessions(updated);
            setErrorText(null);
            setFileContent(
                typeof content === 'string'
                    ? content
                    : JSON.stringify(content, null, 2),
            );
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Unknown error';
            setErrorText(`Error reading file: ${message}`);
            setFileContent('');
        }
    };

    const handleReset = () => {
        setSessions(resetSessions());
        setFileContent('');
        setErrorText(null);
    };

    const maxTotalPos = Math.max(
        0,
        ...combinedStandings.map(
            (player) =>
                player.chartBreakdown.normalPoints +
                player.chartBreakdown.doubledPoints,
        ),
    );
    const maxTotalNeg = Math.max(
        0,
        ...combinedStandings.map(
            (player) => player.chartBreakdown.ignoredPoints,
        ),
    );
    const totalRange = maxTotalPos + maxTotalNeg;
    const posBasisPct = totalRange > 0 ? (maxTotalPos / totalRange) * 100 : 0;
    const negBasisPct = totalRange > 0 ? (maxTotalNeg / totalRange) * 100 : 0;

    return (
        <>
            <header>
                <h1>Magic: The Gathering Standings</h1>
                <p>
                    Event Date: <span id='event-date'>{eventDateSummary}</span>
                </p>
                <div className='scoring-toggle'>
                    <label>
                        <input
                            id='special-scoring'
                            type='checkbox'
                            checked={specialScoring}
                            onChange={(event) => {
                                setSpecialScoring(event.target.checked);
                                if (!event.target.checked) {
                                    setScoringMode('standard');
                                }
                            }}
                        />
                        Use Special Scoring (Double Best, Ignore Worst)
                    </label>
                    <div className='scoring-modes'>
                        <label>
                            <input
                                type='radio'
                                name='special-scoring-mode'
                                id='special-scoring-standard'
                                value='standard'
                                checked={scoringMode === 'standard'}
                                onChange={() => setScoringMode('standard')}
                                disabled={!specialScoring}
                            />
                            Skip 1, Double Highest
                        </label>
                        <label>
                            <input
                                type='radio'
                                name='special-scoring-mode'
                                id='special-scoring-long'
                                value='long'
                                checked={scoringMode === 'long'}
                                onChange={() => setScoringMode('long')}
                                disabled={!specialScoring}
                            />
                            Long Event (9 Sessions, 2 Skips, Double Last)
                        </label>
                    </div>
                </div>
            </header>

            <main>
                <form id='upload-form'>
                    <input
                        id='file-input'
                        type='file'
                        accept='.txt,.json,.html'
                        onChange={handleFileChange}
                    />
                    <button type='button' onClick={handleReset}>
                        Reset All Sessions
                    </button>
                </form>

                {errorText && <div className='error-box'>{errorText}</div>}
                {fileContent && <pre id='file-content'>{fileContent}</pre>}

                <table id='standings'>
                    <thead>
                        <tr>
                            <th><span>Rank</span></th>
                            <th>Name</th>
                            <th><span>Points</span></th>
                            <th>Best</th>
                            <th>Worst</th>
                            <th>OMW%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {combinedStandings.length === 0 ? (
                            <tr>
                                <td colSpan={6} className='empty-state'>
                                    Upload a file to show standings.
                                </td>
                            </tr>
                        ) : (
                            combinedStandings.map((player) => (
                                <tr key={`${player.name}-${player.rank}`}>
                                    <td>{player.rank}</td>
                                    <td>{player.name || '-'}</td>
                                    <td>{player.points}</td>
                                    <td>{player.bestPoints ?? '-'}</td>
                                    <td>{player.worstPoints ?? '-'}</td>
                                    <td>{player.omw != null ? player.omw : '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <section
                    id='score-chart'
                    className='score-chart'
                    style={
                        {
                            '--score-chart-pos-basis': `${posBasisPct}%`,
                            '--score-chart-neg-basis': `${negBasisPct}%`,
                        } as CSSProperties
                    }>
                    <h2>Score Breakdown</h2>
                    <div id='score-chart-content' className='score-chart-content'>
                        {combinedStandings.length === 0 ? (
                            <div className='score-chart-empty'>
                                Upload a file to see score breakdowns.
                            </div>
                        ) : (
                            <table className='score-chart-table'>
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Name</th>
                                        <th>Pts</th>
                                        <th>Score Breakdown</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {combinedStandings.map((player) => {
                                        const {
                                            normalPoints,
                                            doubledPoints,
                                            ignoredPoints,
                                        } = player.chartBreakdown;
                                        const normalPct =
                                            maxTotalPos > 0
                                                ? (normalPoints / maxTotalPos) *
                                                  100
                                                : 0;
                                        const doubledPct =
                                            maxTotalPos > 0
                                                ? (doubledPoints / maxTotalPos) *
                                                  100
                                                : 0;
                                        const ignoredPct =
                                            maxTotalNeg > 0
                                                ? (ignoredPoints / maxTotalNeg) *
                                                  100
                                                : 0;

                                        return (
                                            <tr
                                                key={`chart-${player.name}-${player.rank}`}>
                                                <td>{player.rank}</td>
                                                <td>{player.name || '-'}</td>
                                                <td>{player.points}</td>
                                                <td className='score-bar-cell'>
                                                    <div className='score-bar'>
                                                        <div className='score-bar-side score-bar-positive'>
                                                            {normalPoints > 0 && (
                                                                <div
                                                                    className='score-segment score-normal'
                                                                    style={{
                                                                        width: `${normalPct}%`,
                                                                    }}
                                                                    title={`Normal: ${normalPoints}`}
                                                                />
                                                            )}
                                                            {doubledPoints > 0 && (
                                                                <div
                                                                    className='score-segment score-doubled'
                                                                    style={{
                                                                        width: `${doubledPct}%`,
                                                                    }}
                                                                    title={`Doubled: ${doubledPoints}`}
                                                                />
                                                            )}
                                                        </div>
                                                        <div className='score-bar-side score-bar-negative'>
                                                            {ignoredPoints > 0 && (
                                                                <div
                                                                    className='score-segment score-ignored'
                                                                    style={{
                                                                        width: `${ignoredPct}%`,
                                                                    }}
                                                                    title={`Ignored: ${ignoredPoints}`}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            </main>
        </>
    );
}

export default App;
