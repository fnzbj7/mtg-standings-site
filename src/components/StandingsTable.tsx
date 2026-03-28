import type { PlayerStanding } from '../lib/types';

type StandingsTableProps = {
    combinedStandings: PlayerStanding[];
};

export default function StandingsTable({ combinedStandings }: StandingsTableProps) {
    return (
        <section className='panel card'>
            <h2>Combined standings</h2>
            <div className='table-wrap'>
                <table className='standings-table'>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Points</th>
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
            </div>
        </section>
    );
}
