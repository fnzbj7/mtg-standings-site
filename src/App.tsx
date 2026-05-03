import { type ChangeEvent, useMemo, useState } from 'react';
import FileUpload from './components/FileUpload';
import ScoringOptions from './components/ScoringOptions';
import StandingsTable from './components/StandingsTable';
import ScoreChart from './components/ScoreChart';
import RoundScoresTable from './components/RoundScoresTable';
import { useSessions } from './hooks/useSessions';
import { useAppConfig } from './hooks/useAppConfig';
import { calculateCombinedStandingsWithConfig } from './lib/standings';
import { processEventData, readUploadedFile } from './lib/data';
import type { ScoringConfig, SessionData } from './lib/types';
import './App.css';

function App() {
    const [fileContent, setFileContent] = useState('');
    const [errorText, setErrorText] = useState<string | null>(null);

    const { config, updateConfig, resetConfig } = useAppConfig();
    const { specialScoring, scoringMode, numberOfRounds } = config;

    const { sessions, addOrUpdateSession, resetSessions } = useSessions();

    const totalSessionsTarget = numberOfRounds;
    const hasOverroundWarning = sessions.length > totalSessionsTarget;

    const scoringConfig = useMemo<ScoringConfig>(
        () => ({
            useSpecialScoring: specialScoring,
            useLongMode: specialScoring && scoringMode === 'long',
            skipLowest: config.skipLowest,
            skipLowestCount: config.skipLowestCount,
            doubleHighest: config.doubleHighest,
            numberOfRounds,
            totalSessionsTarget,
        }),
        [
            specialScoring,
            scoringMode,
            config.skipLowest,
            config.skipLowestCount,
            config.doubleHighest,
            numberOfRounds,
            totalSessionsTarget,
        ],
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
        resetConfig();
        setFileContent('');
        setErrorText(null);
    };

    return (
        <>
            <header>
                <h1>Magic: The Gathering Standings</h1>
                <p>
                    Event Date: <span id='event-date'>{eventDateSummary}</span>
                </p>
                {hasOverroundWarning && (
                    <p className='header-warning'>
                        Warning: Uploaded sessions exceed configured rounds. Round {totalSessionsTarget} is treated as the configured last round.
                    </p>
                )}
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
                        numberOfRounds={config.numberOfRounds}
                        skipLowest={config.skipLowest}
                        skipLowestCount={config.skipLowestCount}
                        doubleHighest={config.doubleHighest}
                        doubleLast={config.doubleLast}
                        onToggleSpecialScoring={(value) => {
                            updateConfig({
                                specialScoring: value,
                                ...(!value && { scoringMode: 'standard' }),
                            });
                        }}
                        onChangeMode={(mode) => updateConfig({ scoringMode: mode })}
                        onChangeNumberOfRounds={(value) => updateConfig({ numberOfRounds: value })}
                        onToggleSkipLowest={(value) => updateConfig({ skipLowest: value })}
                        onChangeSkipLowestCount={(value) => updateConfig({ skipLowestCount: value })}
                        onToggleDoubleHighest={(value) => updateConfig({ doubleHighest: value })}
                        onToggleDoubleLast={(value) => updateConfig({ doubleLast: value })}
                    />
                </section>

                <StandingsTable combinedStandings={combinedStandings} />
                <ScoreChart combinedStandings={combinedStandings} />
                <RoundScoresTable
                    sessions={sessions}
                    combinedStandings={combinedStandings}
                    scoringConfig={scoringConfig}
                />
            </main>
        </>
    );
}

export default App;
