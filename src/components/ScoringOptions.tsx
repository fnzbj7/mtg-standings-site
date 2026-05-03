import { useState } from 'react';
import {
	DEFAULT_NUMBER_OF_ROUNDS,
} from '../lib/constants';

type ScoringOptionsProps = {
	specialScoring: boolean;
	numberOfRounds: number;
	skipLowest: boolean;
	skipLowestCount: number;
	doubleHighest: boolean;
	doubleLast: boolean;
	onToggleSpecialScoring: (value: boolean) => void;
	onChangeNumberOfRounds: (value: number) => void;
	onToggleSkipLowest: (value: boolean) => void;
	onChangeSkipLowestCount: (value: number) => void;
	onToggleDoubleHighest: (value: boolean) => void;
	onToggleDoubleLast: (value: boolean) => void;
};

export default function ScoringOptions({
	specialScoring,
	numberOfRounds,
	skipLowest,
	skipLowestCount,
	doubleHighest,
	doubleLast,
	onToggleSpecialScoring,
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
						className='mr-1'
					/>
					<span>Enable special scoring</span>
				</label>
			</div>

			{showAdvanced && (
				<fieldset className='radio-group border-2 border-bs-2 border-be-2 border-gray-300 p-2 m-2'>
					<legend>Advanced scoring</legend>
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
								min={0}
								value={skipLowestCount}
								onChange={(event) => {
									const parsed = parseInt(
										event.target.value,
										10,
									);
									onChangeSkipLowestCount(
										parsed >= 0
											? parsed
											: 0,
									);
								}}
								className='input-base'
							/>
						)}
					</div>
					<div>
						<label className='checkbox-label'>
							<input
								type='checkbox'
								checked={doubleHighest}
								onChange={(event) =>
									onToggleDoubleHighest(event.target.checked)
								}
								className='mr-1'
							/>
							<span>Double highest score</span>
						</label>
					</div>
					<div>
						<label className='checkbox-label'>
							<input
								type='checkbox'
								checked={doubleLast}
								onChange={(event) =>
									onToggleDoubleLast(event.target.checked)
								}
								className='mr-1'
							/>
							<span>Double last round</span>
						</label>
					</div>
				</fieldset>
			)}
		</div>
	);
}
