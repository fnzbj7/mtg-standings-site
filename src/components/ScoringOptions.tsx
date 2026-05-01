import { useState } from 'react';
import { DEFAULT_NUMBER_OF_ROUNDS, DEFAULT_SKIP_LOWEST_COUNT } from '../lib/constants';
import type { ScoringMode } from '../lib/types';

type ScoringOptionsProps = {
	specialScoring: boolean;
	scoringMode: ScoringMode;
	numberOfRounds: number;
	skipLowest: boolean;
	skipLowestCount: number;
	doubleHighest: boolean;
	doubleLast: boolean;
	onToggleSpecialScoring: (value: boolean) => void;
	onChangeMode: (mode: ScoringMode) => void;
	onChangeNumberOfRounds: (value: number) => void;
	onToggleSkipLowest: (value: boolean) => void;
	onChangeSkipLowestCount: (value: number) => void;
	onToggleDoubleHighest: (value: boolean) => void;
	onToggleDoubleLast: (value: boolean) => void;
};

const scoringModeLabels: Record<ScoringMode, string> = {
	standard: 'Skip 1, double highest',
	long: 'Long event (9 sessions, 2 skips, double last)',
};

export default function ScoringOptions({
	specialScoring,
	scoringMode,
	numberOfRounds,
	skipLowest,
	skipLowestCount,
	doubleHighest,
	doubleLast,
	onToggleSpecialScoring,
	onChangeMode,
	onChangeNumberOfRounds,
	onToggleSkipLowest,
	onChangeSkipLowestCount,
	onToggleDoubleHighest,
	onToggleDoubleLast,
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
						onChange={(event) =>
							onToggleSpecialScoring(event.target.checked)
						}
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
				<fieldset className='radio-group border-2 border-bs-2 border-be-2 border-gray-300 p-2 m-2'>
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
						<span>
							Long event (9 sessions, 2 skips, double last)
						</span>
					</label>
					<div className='number-input-row'>
						<label htmlFor='number-of-rounds'>
							Number of rounds
						</label>
						<input
							id='number-of-rounds'
							type='number'
							min={1}
							value={numberOfRounds}
							onChange={(event) => {
								const parsed = parseInt(event.target.value, 10);
								onChangeNumberOfRounds(
									parsed > 0
										? parsed
										: DEFAULT_NUMBER_OF_ROUNDS,
								);
							}}
                            className='input-base'
						/>
					</div>
					<div className='checkbox-row'>
						<label className='checkbox-label w-fit'>
							<input
								type='checkbox'
								checked={skipLowest}
								onChange={(event) =>
									onToggleSkipLowest(event.target.checked)
								}
                                className='mr-1'
							/>
							<span>Skip lowest score(s)</span>
						</label>
						{skipLowest && (
							<input
								id='skip-lowest-count'
								type='number'
								min={1}
								value={skipLowestCount}
								onChange={(event) => {
									const parsed = parseInt(event.target.value, 10);
									onChangeSkipLowestCount(
										parsed > 0
											? parsed
											: DEFAULT_SKIP_LOWEST_COUNT,
									);
								}}
                                className='input-base'
							/>
						)}
					</div>
					<label className='checkbox-label'>
						<input
							type='checkbox'
							checked={doubleHighest}
							onChange={(event) =>
								onToggleDoubleHighest(event.target.checked)
							}
						/>
						<span>Double highest score</span>
					</label>
					<label className='checkbox-label'>
						<input
							type='checkbox'
							checked={doubleLast}
							onChange={(event) =>
								onToggleDoubleLast(event.target.checked)
							}
						/>
						<span>Double last round</span>
					</label>
				</fieldset>
			)}
		</div>
	);
}
