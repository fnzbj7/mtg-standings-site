import { useRef, useState } from 'react';
import type { PlayerStanding, SessionData, ScoringConfig } from '../lib/types';
import { buildRoundTimestampedName, downloadTableAsImage } from '../lib/tableImage';

type RoundScoresTableProps = {
    sessions: SessionData[];
    combinedStandings: PlayerStanding[];
    scoringConfig: ScoringConfig;
};

type RoundScoreCell = {
    value: number;
    skipped: boolean;
};

type RoundScoreRow = {
    name: string;
    cells: RoundScoreCell[];
    totalPoints: number;
};

function sortRoundsByPointsThenOmwDesc(
    rounds: Array<{ points: number; omw: number | null; roundIndex: number }>,
) {
    return [...rounds].sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        return (b.omw ?? 0) - (a.omw ?? 0);
    });
}

function buildRoundScores(
    sessions: SessionData[],
    combinedStandings: PlayerStanding[],
    scoringConfig: ScoringConfig,
) {
    const roundCount = sessions.length;

    const rows: RoundScoreRow[] = combinedStandings.map((player) => {
        const playerRounds = sessions.map((session, roundIndex) => {
            const sessionPlayer = session.players.find((playerRow) => playerRow.name === player.name);
            return {
                roundIndex,
                points: sessionPlayer?.points ?? 0,
                omw: sessionPlayer?.omw ?? null,
            };
        });

        const skippedIndexes = new Set<number>();

        if (scoringConfig.useSpecialScoring && scoringConfig.skipLowest) {
            const sortedRounds = sortRoundsByPointsThenOmwDesc(playerRounds);
            const parsedCount = Math.floor(scoringConfig.skipLowestCount);
            const requestedCount = Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 0;
            const dropCount = Math.min(requestedCount, playerRounds.length);
            if(dropCount !== 0) {
                sortedRounds
                    .slice(-dropCount)
                    .forEach((round) => skippedIndexes.add(round.roundIndex));
            }
        }

        return {
            name: player.name || 'Unknown',
            cells: playerRounds.map((round) => ({
                value: round.points,
                skipped: skippedIndexes.has(round.roundIndex),
            })),
            totalPoints: player.points,
        };
    });

    return {
        roundCount,
        rows,
    };
}

export default function RoundScoresTable({
    sessions,
    combinedStandings,
    scoringConfig,
}: RoundScoresTableProps) {
    const { roundCount, rows } = buildRoundScores(sessions, combinedStandings, scoringConfig);
    const tableRef = useRef<HTMLTableElement | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handleDownload = async () => {
        if (!tableRef.current || isDownloading) {
            return;
        }

        setIsDownloading(true);
        setDownloadError(null);

        try {
            await downloadTableAsImage(
                tableRef.current,
                buildRoundTimestampedName('round-scores', roundCount),
            );
        } catch {
            setDownloadError('Unable to download this table image. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    if (roundCount === 0) {
        return null;
    }

    return (
        <section className='panel card'>
            <div className='panel-header'>
                <h2>Round-by-round scores</h2>
                <button
                    type='button'
                    className='table-download-button'
                    onClick={handleDownload}
                    disabled={isDownloading}>
                    {isDownloading ? 'Preparing PNG...' : 'Download PNG'}
                </button>
            </div>
            <div className='table-wrap'>
                <table ref={tableRef} className='round-scores-table'>
                    <thead>
                        <tr>
                            <th>Name</th>
                            {Array.from({ length: roundCount }, (_, index) => (
                                <th key={index}>Round {index + 1}</th>
                            ))}
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIndex) => (
                            <tr key={`${row.name}-${rowIndex}`}>
                                <td>{row.name}</td>
                                {row.cells.map((cell, index) => (
                                    <td key={index} className={cell.skipped ? 'skipped-score' : undefined}>
                                        {cell.value}
                                        {cell.skipped ? '*' : ''}
                                    </td>
                                ))}
                                <td>{row.totalPoints}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className='round-scores-legend'>* skipped score under special scoring</div>
            {downloadError && <p className='download-error'>{downloadError}</p>}
        </section>
    );
}
