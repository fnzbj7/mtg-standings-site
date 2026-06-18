import { useRef, useState } from 'react';
import type { PlayerStanding } from '../lib/types';
import { buildRoundTimestampedName, downloadTableAsImage } from '../lib/tableImage';

type StandingsTableProps = {
    combinedStandings: PlayerStanding[];
    currentRound: number;
};

export default function StandingsTable({ combinedStandings, currentRound }: StandingsTableProps) {
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
                buildRoundTimestampedName('combined-standings', currentRound),
            );
        } catch {
            setDownloadError('Unable to download this table image. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <section className='panel card'>
            <div className='panel-header'>
                <h2>Combined standings</h2>
                <button
                    type='button'
                    className='table-download-button'
                    onClick={handleDownload}
                    disabled={isDownloading}>
                    {isDownloading ? 'Preparing PNG...' : 'Download PNG'}
                </button>
            </div>
            <div className='table-wrap'>
                <table ref={tableRef} className='standings-table'>
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
            {downloadError && <p className='download-error'>{downloadError}</p>}
        </section>
    );
}
