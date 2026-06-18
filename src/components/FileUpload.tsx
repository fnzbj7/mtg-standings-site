import { useState, type ChangeEvent, type DragEvent } from 'react';

type FileUploadProps = {
	onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
	onFileDrop: (files: File[]) => void;
	onReset: () => void;
	onClearUploadedFiles: () => void;
	errorText?: string | null;
	uploadedFiles?: string[];
};

export default function FileUpload({
	onFileChange,
	onFileDrop,
	onReset,
	onClearUploadedFiles,
	errorText,
	uploadedFiles,
}: FileUploadProps) {
	const [isDragActive, setIsDragActive] = useState(false);

	const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (!isDragActive) {
			setIsDragActive(true);
		}
	};

	const handleDragEnter = (event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragActive(true);
	};

	const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragActive(false);
	};

	const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragActive(false);

		const files = Array.from(event.dataTransfer.files ?? []).sort((a, b) =>
			a.name.localeCompare(b.name, undefined, {
				numeric: true,
				sensitivity: 'base',
			}),
		);
		onFileDrop(files);
	};

	return (
		<div className='panel card'>
			<h2>Upload standings</h2>
			<form className='upload-form'>
				<div className='max-w-xl'>
					<label
						className={`flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none ${isDragActive ? 'drag-active' : ''}`}
						onDragEnter={handleDragEnter}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}>
						<span className='flex items-center space-x-2'>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								className='w-6 h-6 text-gray-600'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
								stroke-width='2'>
								<path
									stroke-linecap='round'
									stroke-linejoin='round'
									d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
								/>
							</svg>
							<span className='font-medium text-gray-600'>
								Drop a file here, or
								<span className='text-blue-600 underline pl-1'>
									browse
								</span>
							</span>
						</span>
						<input
							type='file'
							name='file_upload'
							className='hidden'
							accept='.txt,.json,.html'
							onChange={onFileChange}
						/>
					</label>
				</div>
				<div className='button-row'>
					<button
						type='button'
						className='button button-primary'
						onClick={onReset}>
						Reset All Sessions
					</button>
				</div>
			</form>
			{errorText && <div className='error-box'>{errorText}</div>}
			{uploadedFiles && uploadedFiles.length > 0 && (
				<div className='success-box'>
					<button
						type='button'
						className='success-close-button'
						onClick={onClearUploadedFiles}
						aria-label='Dismiss uploaded files message'>
						×
					</button>
					<div className='success-title'>Uploaded files</div>
					<ul className='uploaded-files-list'>
						{uploadedFiles.map((fileName) => (
							<li key={fileName}>{fileName}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
