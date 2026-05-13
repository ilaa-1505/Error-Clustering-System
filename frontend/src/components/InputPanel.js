import { useRef } from 'react';

export default function InputPanel({
    logs, setLogs,
    onAnalyse, onReset,
    tuning, hasResult
}) {
    const fileRef = useRef(null);

    function handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setLogs(ev.target.result);
        reader.readAsText(file);
    }

    return (
        <div className="panel fade-in">
            <div className="panel-header">
                <span className="panel-title">INPUT LOGS</span>
                <div className="panel-actions">
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".log,.txt,.csv"
                        style={{ display: 'none' }}
                        onChange={handleFile}
                    />
                    <button className="btn-ghost" onClick={() => fileRef.current.click()}>
                        Upload File
                    </button>
                    {hasResult && (
                        <button className="btn-ghost" onClick={onReset}>Reset</button>
                    )}
                </div>
            </div>

            <textarea
                className="log-input"
                placeholder="Paste your error logs here..."
                value={logs}
                onChange={e => setLogs(e.target.value)}
                rows={10}
            />

            <div className="input-footer">
                <div className="log-stats">
                    {logs && `${logs.trim().split('\n').filter(Boolean).length} lines`}
                </div>

                <button
                    className="btn-primary"
                    onClick={onAnalyse}
                    disabled={tuning || !logs.trim()}
                >
                    {tuning ? 'Analysing...' : 'Analyse Logs'}
                </button>
            </div>
        </div>
    );
}