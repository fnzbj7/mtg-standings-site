import type { ScoringMode } from '../lib/types';

type ScoringOptionsProps = {
    specialScoring: boolean;
    scoringMode: ScoringMode;
    onToggleSpecialScoring: (value: boolean) => void;
    onChangeMode: (mode: ScoringMode) => void;
};

export default function ScoringOptions({
    specialScoring,
    scoringMode,
    onToggleSpecialScoring,
    onChangeMode,
}: ScoringOptionsProps) {
    return (
        <div className='panel card'>
            <h2>Scoring options</h2>
            <div className='scoring-toggle'>
                <label className='checkbox-label'>
                    <input
                        type='checkbox'
                        checked={specialScoring}
                        onChange={(event) => onToggleSpecialScoring(event.target.checked)}
                    />
                    <span>Use special scoring</span>
                </label>

                <fieldset className='radio-group' disabled={!specialScoring}>
                    <legend>Mode</legend>
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
            </div>
        </div>
    );
}
