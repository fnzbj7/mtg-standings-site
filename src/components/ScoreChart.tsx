import { type CSSProperties, useRef, useState } from 'react';
import type { PlayerStanding } from '../lib/types';
import { buildRoundTimestampedName, downloadTableAsImage } from '../lib/tableImage';

type ScoreChartProps = {
    combinedStandings: PlayerStanding[];
    currentRound: number;
};

export default function ScoreChart({ combinedStandings, currentRound }: ScoreChartProps) {
    const tableRef = useRef<HTMLTableElement | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const maxTotalPos = Math.max(
        0,
        ...combinedStandings.map(
            (player) => player.chartBreakdown.normalPoints + player.chartBreakdown.doubledPoints,
        ),
    );
    const maxTotalNeg = Math.max(
        0,
        ...combinedStandings.map((player) => player.chartBreakdown.ignoredPoints),
    );

    const totalRange = maxTotalPos + maxTotalNeg;
    const posBasisPct = totalRange > 0 ? (maxTotalPos / totalRange) * 100 : 0;
    const negBasisPct = totalRange > 0 ? (maxTotalNeg / totalRange) * 100 : 0;

    const handleDownload = async () => {
        if (!tableRef.current || isDownloading || combinedStandings.length === 0) {
            return;
        }

        setIsDownloading(true);
        setDownloadError(null);

        try {
            await downloadTableAsImage(
                tableRef.current,
                buildRoundTimestampedName('score-breakdown', currentRound),
            );
        } catch {
            setDownloadError('Unable to download this table image. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <section
            id='score-chart'
            className='score-chart'
            style={
                {
                    '--score-chart-pos-basis': `${posBasisPct}%`,
                    '--score-chart-neg-basis': `${negBasisPct}%`,
                } as CSSProperties
            }>
            <div className='panel-header'>
                <h2>Score Breakdown</h2>
                <button
                    type='button'
                    className='table-download-button'
                    onClick={handleDownload}
                    disabled={isDownloading || combinedStandings.length === 0}>
                    {isDownloading ? 'Preparing PNG...' : 'Download PNG'}
                </button>
            </div>
            <div id='score-chart-content' className='score-chart-content'>
                {combinedStandings.length === 0 ? (
                    <div className='score-chart-empty'>
                        Upload a file to see score breakdowns.
                    </div>
                ) : (
                    <table ref={tableRef} className='score-chart-table'>
                        <thead>
                            <tr>
                                <th>#</th>
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
                                        ? (normalPoints / maxTotalPos) * 100
                                        : 0;
                                const doubledPct =
                                    maxTotalPos > 0
                                        ? (doubledPoints / maxTotalPos) * 100
                                        : 0;
                                const ignoredPct =
                                    maxTotalNeg > 0
                                        ? (ignoredPoints / maxTotalNeg) * 100
                                        : 0;

                                return (
                                    <tr key={`chart-${player.name}-${player.rank}`}>
                                        <td>{player.rank}</td>
                                        <td>{player.name || '-'}</td>
                                        <td>{player.points}</td>
                                        <td className='score-bar-cell'>
                                            <div className='score-bar'>
                                                <div className='score-bar-side score-bar-positive'>
                                                    {normalPoints > 0 && (
                                                        <div
                                                            className='score-segment score-normal'
                                                            style={{ width: `${normalPct}%` }}
                                                            title={`Normal: ${normalPoints}`}
                                                        />
                                                    )}
                                                    {doubledPoints > 0 && (
                                                        <div
                                                            className='score-segment score-doubled'
                                                            style={{ width: `${doubledPct}%` }}
                                                            title={`Doubled: ${doubledPoints}`}
                                                        />
                                                    )}
                                                </div>
                                                <div className='score-bar-side score-bar-negative'>
                                                    {ignoredPoints > 0 && (
                                                        <div
                                                            className='score-segment score-ignored'
                                                            style={{ width: `${ignoredPct}%` }}
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
            {downloadError && <p className='download-error'>{downloadError}</p>}
        </section>
    );
}
