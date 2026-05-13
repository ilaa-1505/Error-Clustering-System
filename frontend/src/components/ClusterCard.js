import { useState } from 'react';

const SEVERITY_COLORS = {
    Critical: 'var(--critical)',
    High: 'var(--high)',
    Medium: 'var(--medium)',
    Low: 'var(--low)',
};

export default function ClusterCard({ cluster }) {
    const [expanded, setExpanded] = useState(false);
    const color = SEVERITY_COLORS[cluster.severity] || 'var(--medium)';

    return (
        <div className="cluster-card fade-in" style={{ borderLeftColor: color }}>
            <div className="cluster-header">
                <span className="severity-badge" style={{ color }}>
                    {cluster.severity.toUpperCase()}
                </span>
                <span className="cluster-count">{cluster.count} errors</span>
            </div>

            <div className="cluster-label">{cluster.label}</div>
            <div className="cluster-cause">{cluster.root_cause}</div>

            <button
                className="expand-btn"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? 'Hide errors ↑' : `Show all errors ↓`}
            </button>

            {expanded && (
                <div className="cluster-errors">
                    {cluster.points.map((p, i) => (
                        <div key={i} className="error-line">
                            <span className="error-ts">{p.timestamp || '—'}</span>
                            <span className="error-raw">{p.raw}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}