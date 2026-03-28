import type { CSSProperties } from 'react';
import type { PlayerStanding } from '../lib/types';

type ScoreChartProps = {
    combinedStandings: PlayerStanding[];
};

export default function ScoreChart({ combinedStandings }: ScoreChartProps) {
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
        </section>
    );
}
