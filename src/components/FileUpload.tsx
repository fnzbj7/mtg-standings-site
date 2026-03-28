import type { ChangeEvent } from 'react';

type FileUploadProps = {
    onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onReset: () => void;
    errorText?: string | null;
    fileContent?: string;
};

export default function FileUpload({
    onFileChange,
    onReset,
    errorText,
    fileContent,
}: FileUploadProps) {
    return (
        <div className='panel card'>
            <h2>Upload standings</h2>
            <form className='upload-form'>
                <label className='file-label'>
                    <span>Select a standings file</span>
                    <input
                        type='file'
                        accept='.txt,.json,.html'
                        onChange={onFileChange}
                    />
                </label>
                <div className='button-row'>
                    <button type='button' className='button button-primary' onClick={onReset}>
                        Reset All Sessions
                    </button>
                </div>
            </form>
            {errorText && <div className='error-box'>{errorText}</div>}
            {fileContent && <pre className='file-content'>{fileContent}</pre>}
        </div>
    );
}
