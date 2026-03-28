import type { PlayerStanding, SessionData } from '../lib/types';

type RoundScoresTableProps = {
    sessions: SessionData[];
    combinedStandings: PlayerStanding[];
};

type RoundScoreRow = {
    name: string;
    scores: Array<number | null>;
    totalPoints: number;
};

function buildRoundScores(sessions: SessionData[], combinedStandings: PlayerStanding[]) {
    const roundCount = sessions.length;
    const rows: RoundScoreRow[] = combinedStandings.map((player) => ({
        name: player.name || 'Unknown',
        scores: sessions.map((session) => {
            const sessionPlayer = session.players.find((playerRow) => playerRow.name === player.name);
            return sessionPlayer?.points ?? null;
        }),
        totalPoints: player.points,
    }));

    return {
        roundCount,
        rows,
    };
}

export default function RoundScoresTable({ sessions, combinedStandings }: RoundScoresTableProps) {
    const { roundCount, rows } = buildRoundScores(sessions, combinedStandings);

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
                        {rows.map((row) => (
                            <tr key={row.name}>
                                <td>{row.name}</td>
                                {row.scores.map((score, index) => (
                                    <td key={index}>{score != null ? score : '-'}</td>
                                ))}
                                <td>{row.totalPoints}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
