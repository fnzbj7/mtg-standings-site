import { useState } from 'react';
import type { ScoringMode } from '../lib/types';

type ScoringOptionsProps = {
    specialScoring: boolean;
    scoringMode: ScoringMode;
    onToggleSpecialScoring: (value: boolean) => void;
    onChangeMode: (mode: ScoringMode) => void;
};

const scoringModeLabels: Record<ScoringMode, string> = {
    standard: 'Skip 1, double highest',
    long: 'Long event (9 sessions, 2 skips, double last)',
};

export default function ScoringOptions({
    specialScoring,
    scoringMode,
    onToggleSpecialScoring,
    onChangeMode,
}: ScoringOptionsProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);

    return (
        <div className='panel card scoring-panel'>
            <div className='scoring-panel-header'>
                <h2>Scoring configuration</h2>
                <button
                    type='button'
                    className='config-toggle'
                    onClick={() => setShowAdvanced((current) => !current)}
                    aria-expanded={showAdvanced}
                    aria-label='Toggle scoring configuration'>
                    ⚙
                </button>
            </div>

            <div className='checkbox-row'>
                <label className='checkbox-label'>
                    <input
                        type='checkbox'
                        checked={specialScoring}
                        onChange={(event) => onToggleSpecialScoring(event.target.checked)}
                    />
                    <span>Enable special scoring</span>
                </label>
                {specialScoring && (
                    <div className='config-summary'>
                        Active mode: {scoringModeLabels[scoringMode]}
                    </div>
                )}
            </div>

            {showAdvanced && (
                <fieldset className='radio-group'>
                    <legend>Advanced scoring mode</legend>
                    <label className='radio-label'>
                        <input
                            type='radio'
                            name='special-scoring-mode'
                            value='standard'
                            checked={scoringMode === 'standard'}
                            onChange={() => onChangeMode('standard')}
                        />
                        <span>Skip 1, double highest</span>
                    </label>
                    <label className='radio-label'>
                        <input
                            type='radio'
                            name='special-scoring-mode'
                            value='long'
                            checked={scoringMode === 'long'}
                            onChange={() => onChangeMode('long')}
                        />
                        <span>Long event (9 sessions, 2 skips, double last)</span>
                    </label>
                </fieldset>
            )}
        </div>
    );
}
