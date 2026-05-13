export default function AnomalyPanel({ anomalies }) {
    return (
        <div className="panel fade-in">
            <div className="panel-header">
                <span className="panel-title" style={{ color: 'var(--anomaly)' }}>
                    ⚠ ANOMALIES DETECTED — {anomalies.length} unusual errors
                </span>
            </div>

            <div className="anomaly-list">
                {anomalies.map((a, i) => (
                    <div key={i} className="anomaly-item">
                        <div className="anomaly-meta">
                            <span className="anomaly-type">{a.error_type}</span>
                            <span className="anomaly-module">{a.module || 'unknown'}</span>
                            <span className="anomaly-ts">{a.timestamp || '—'}</span>
                        </div>
                        <div className="anomaly-raw">{a.raw}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}