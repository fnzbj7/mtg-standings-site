import type { PlayerStanding, SessionData, ScoringConfig } from '../lib/types';

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

        if (scoringConfig.useSpecialScoring) {
            const sortedRounds = sortRoundsByPointsThenOmwDesc(playerRounds);

            if (scoringConfig.useLongMode && playerRounds.length >= 3) {
                const dropCount = Math.min(2, playerRounds.length);
                sortedRounds.slice(-dropCount).forEach((round) => skippedIndexes.add(round.roundIndex));
            } else if (!scoringConfig.useLongMode && playerRounds.length >= 2) {
                const lowest = sortedRounds[sortedRounds.length - 1];
                skippedIndexes.add(lowest.roundIndex);
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

    if (roundCount === 0) {
        return null;
    }

    return (
        <section className='panel card'>
            <h2>Round-by-round scores</h2>
            <div className='table-wrap'>
                <table className='round-scores-table'>
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
        </section>
    );
}
