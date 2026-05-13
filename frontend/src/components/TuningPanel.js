import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';

export default function TuningPanel({
    tuningResult,
    tuning,
    loading,
    bestSize,
    setBestSize,
    onRun,
}) {
    const [showFormula, setShowFormula] = useState(false);

    const best = tuningResult?.reduce((prev, curr) =>
        curr.silhouette_score > prev.silhouette_score ? curr : prev
    );

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;
        return (
            <div className="tooltip-box">
                <div style={{ color: 'var(--accent)', marginBottom: 4 }}>
                    min_cluster_size = {d.min_cluster_size}
                </div>
                <div>Clusters: {d.n_clusters}</div>
                <div>Noise points: {d.n_noise}</div>
                <div>Silhouette: {d.silhouette_score}</div>
                {d.min_cluster_size === best?.min_cluster_size && (
                    <div style={{ color: 'var(--low)', marginTop: 4 }}>★ Best</div>
                )}
            </div>
        );
    };

    return (
        <div className="panel fade-in">
            <div className="panel-header">
                <span className="panel-title">CLUSTER SIZE TUNING</span>
                <div className="panel-actions">
                    <button
                        className="btn-ghost"
                        onClick={() => setShowFormula(!showFormula)}
                    >
                        {showFormula ? 'Hide Formula' : 'Silhouette Formula'}
                    </button>
                </div>
            </div>

            {showFormula && (
                <div className="formula-box">
                    <div className="formula-title">SILHOUETTE SCORE — s(i)</div>
                    <div className="formula">
                        s(i) = ( b(i) − a(i) ) / max( a(i), b(i) )
                    </div>
                    <div className="formula-legend">
                        <div className="formula-item">
                            <span className="formula-var">a(i)</span>
                            <span className="formula-desc">mean distance from point i to all other points in its own cluster — measures cohesion. Lower = tighter cluster.</span>
                        </div>
                        <div className="formula-item">
                            <span className="formula-var">b(i)</span>
                            <span className="formula-desc">mean distance from point i to all points in the nearest other cluster — measures separation. Higher = more distinct clusters.</span>
                        </div>
                        <div className="formula-item">
                            <span className="formula-var">s → +1</span>
                            <span className="formula-desc">point is well inside its cluster, far from others. Good.</span>
                        </div>
                        <div className="formula-item">
                            <span className="formula-var">s → 0</span>
                            <span className="formula-desc">point is on the boundary between two clusters. Ambiguous.</span>
                        </div>
                        <div className="formula-item">
                            <span className="formula-var">s → -1</span>
                            <span className="formula-desc">point is closer to another cluster than its own. Misclassified.</span>
                        </div>
                    </div>
                </div>
            )}

            {tuning && (
                <div style={{ padding: '16px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    Testing cluster sizes 2, 3, 5, 8, 10, 15, 20, 30...
                </div>
            )}

            {tuningResult && !tuning && (
                <div className="tuning-results">
                    <div className="tuning-best">
                        <span className="tuning-best-label">BEST SIZE</span>
                        <input
                            type="number"
                            className="setting-input"
                            value={bestSize ?? ''}
                            min={2}
                            max={50}
                            onChange={e => setBestSize(Number(e.target.value))}
                            style={{ width: 64, textAlign: 'center' }}
                        />
                        <span className="tuning-best-meta">
                            {best.n_clusters} clusters · {best.n_noise} noise · silhouette {best.silhouette_score}
                        </span>
                        <button
                            className="btn-primary"
                            onClick={onRun}
                            disabled={loading || bestSize == null}
                            style={{ marginLeft: 'auto' }}
                        >
                            {loading ? 'Running...' : 'Run Clustering'}
                        </button>
                    </div>

                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                            data={tuningResult}
                            margin={{ top: 8, right: 24, bottom: 8, left: 0 }}
                        >
                            <XAxis
                                dataKey="min_cluster_size"
                                tick={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                                axisLine={{ stroke: 'var(--border)' }}
                                tickLine={false}
                                label={{ value: 'min_cluster_size', position: 'insideBottom', offset: -4, fill: 'var(--text-dim)', fontSize: 9 }}
                            />
                            <YAxis
                                domain={[0, 1]}
                                tick={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                                axisLine={{ stroke: 'var(--border)' }}
                                tickLine={false}
                                label={{ value: 'silhouette', angle: -90, position: 'insideLeft', fill: 'var(--text-dim)', fontSize: 9 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="silhouette_score" radius={[3, 3, 0, 0]}>
                                {tuningResult.map((entry, i) => (
                                    <Cell
                                        key={i}
                                        fill={entry.min_cluster_size === best.min_cluster_size
                                            ? 'var(--low)'
                                            : 'var(--bg-3)'}
                                        stroke={entry.min_cluster_size === best.min_cluster_size
                                            ? 'var(--low)'
                                            : 'var(--border)'}
                                        strokeWidth={1}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    <div className="tuning-table">
                        <div className="tuning-row tuning-header">
                            <span>SIZE</span>
                            <span>CLUSTERS</span>
                            <span>NOISE</span>
                            <span>SILHOUETTE</span>
                        </div>
                        {tuningResult.map(r => (
                            <div
                                key={r.min_cluster_size}
                                className="tuning-row"
                                style={{
                                    background: r.min_cluster_size === best.min_cluster_size
                                        ? 'rgba(34, 197, 94, 0.05)'
                                        : 'transparent',
                                    borderLeft: r.min_cluster_size === best.min_cluster_size
                                        ? '2px solid var(--low)'
                                        : '2px solid transparent',
                                }}
                            >
                                <span style={{ color: r.min_cluster_size === best.min_cluster_size ? 'var(--low)' : 'var(--text)' }}>
                                    {r.min_cluster_size}
                                    {r.min_cluster_size === best.min_cluster_size && ' ★'}
                                </span>
                                <span>{r.n_clusters}</span>
                                <span>{r.n_noise}</span>
                                <span>{r.silhouette_score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}