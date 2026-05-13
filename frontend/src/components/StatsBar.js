export default function StatsBar({ stats, nClusters, nAnomalies, silhouette }) {
    const items = [
        { label: 'TOTAL LINES', value: stats.total_lines },
        { label: 'VALID ERRORS', value: stats.valid },
        { label: 'DUPLICATES', value: stats.duplicates },
        { label: 'SKIPPED INFO', value: stats.skipped_info },
        { label: 'CLUSTERS', value: nClusters },
        { label: 'ANOMALIES', value: nAnomalies },
        { label: 'SILHOUETTE', value: silhouette.toFixed(3) },
    ];

    const formats = Object.entries(stats.formats_detected || {});

    return (
        <div className="stats-section fade-in">
            <div className="stats-bar">
                {items.map(item => (
                    <div key={item.label} className="stat-item">
                        <div className="stat-value">{item.value}</div>
                        <div className="stat-label">{item.label}</div>
                    </div>
                ))}
            </div>

            {formats.length > 0 && (
                <div className="formats-bar">
                    <span className="formats-label">DETECTED FORMATS</span>
                    <div className="formats-list">
                        {formats.map(([fmt, count]) => (
                            <div key={fmt} className="format-badge">
                                <span className="format-name">{fmt.toUpperCase()}</span>
                                <span className="format-count">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}