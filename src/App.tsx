import { type ChangeEvent, useMemo, useState } from 'react';
import FileUpload from './components/FileUpload';
import ScoringOptions from './components/ScoringOptions';
import StandingsTable from './components/StandingsTable';
import ScoreChart from './components/ScoreChart';
import RoundScoresTable from './components/RoundScoresTable';
import { useSessions } from './hooks/useSessions';
import { calculateCombinedStandingsWithConfig } from './lib/standings';
import { processEventData, readUploadedFile } from './lib/data';
import type { ScoringConfig, ScoringMode, SessionData } from './lib/types';
import './App.css';

function App() {
    const [fileContent, setFileContent] = useState('');
    const [errorText, setErrorText] = useState<string | null>(null);
    const [specialScoring, setSpecialScoring] = useState(false);
    const [scoringMode, setScoringMode] = useState<ScoringMode>('standard');

    const { sessions, addOrUpdateSession, resetSessions } = useSessions();

    const totalSessionsTarget = specialScoring && scoringMode === 'long' ? 9 : 6;

    const scoringConfig = useMemo<ScoringConfig>(
        () => ({
            useSpecialScoring: specialScoring,
            useLongMode: specialScoring && scoringMode === 'long',
            totalSessionsTarget,
        }),
        [specialScoring, scoringMode, totalSessionsTarget],
    );

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

            addOrUpdateSession(resolvedSession);
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
        resetSessions();
        setFileContent('');
        setErrorText(null);
        setSpecialScoring(false);
        setScoringMode('standard');
    };

    return (
        <>
            <header>
                <h1>Magic: The Gathering Standings</h1>
                <p>
                    Event Date: <span id='event-date'>{eventDateSummary}</span>
                </p>
            </header>

            <main>
                <section className='controls-grid'>
                    <FileUpload
                        onFileChange={handleFileChange}
                        onReset={handleReset}
                        errorText={errorText}
                        fileContent={fileContent}
                    />
                    <ScoringOptions
                        specialScoring={specialScoring}
                        scoringMode={scoringMode}
                        onToggleSpecialScoring={(value) => {
                            setSpecialScoring(value);
                            if (!value) {
                                setScoringMode('standard');
                            }
                        }}
                        onChangeMode={setScoringMode}
                    />
                </section>

                <StandingsTable combinedStandings={combinedStandings} />
                <ScoreChart combinedStandings={combinedStandings} />
                <RoundScoresTable sessions={sessions} combinedStandings={combinedStandings} />
            </main>
        </>
    );
}

export default App;
