import { useCallback, useMemo, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';

const CLUSTER_COLORS = [
    '#f59e0b', '#3b82f6', '#22c55e', '#ef4444',
    '#a855f7', '#06b6d4', '#f97316', '#ec4899',
    '#84cc16', '#14b8a6',
];

const ANOMALY_COLOR = '#4b4b4b';
const MAX_POINTS = 500;

function stratifiedSample(clusterPoints, anomalyPoints, max) {
    const total = clusterPoints.length + anomalyPoints.length;
    if (total <= max) return { points: [...clusterPoints, ...anomalyPoints], sampled: false };

    const budgetForClusters = max - anomalyPoints.length;
    const ratio = budgetForClusters / clusterPoints.length;

    const sampledClusters = ratio >= 1
        ? clusterPoints
        : clusterPoints.filter(() => Math.random() < ratio);

    return {
        points: [...sampledClusters, ...anomalyPoints],
        sampled: true,
    };
}

export default function ScatterPlot({ clusters, anomalies }) {
    const [hiddenClusters, setHiddenClusters] = useState(new Set());

    const safeClusters = useMemo(() => Array.isArray(clusters) ? clusters : [], [clusters]);
    const safeAnomalies = useMemo(() => Array.isArray(anomalies) ? anomalies : [], [anomalies]);

    function toggleCluster(id) {
        setHiddenClusters(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    const clusterPoints = useMemo(() =>
        safeClusters
            .filter(c => !hiddenClusters.has(c.id))
            .flatMap(c =>
                (c.points ?? []).map(p => ({
                    ...p,
                    clusterId: c.id,
                    clusterLabel: c.label,
                    color: CLUSTER_COLORS[c.id % CLUSTER_COLORS.length],
                    isAnomaly: false,
                }))
            ),
        [safeClusters, hiddenClusters]);

    const anomalyPoints = useMemo(() =>
        safeAnomalies.map(p => ({
            ...p,
            clusterId: -1,
            clusterLabel: 'Anomaly',
            color: ANOMALY_COLOR,
            isAnomaly: true,
        })),
        [safeAnomalies]);

    const { points: allPoints, sampled } = useMemo(
        () => stratifiedSample(clusterPoints, anomalyPoints, MAX_POINTS),
        [clusterPoints, anomalyPoints]
    );

    const totalPoints = clusterPoints.length + anomalyPoints.length;

    const CustomTooltip = useCallback(({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;
        return (
            <div className="tooltip-box">
                <div style={{ color: d.color, marginBottom: 4, letterSpacing: '0.1em' }}>
                    {d.isAnomaly ? '⚠ ANOMALY' : d.clusterLabel}
                </div>
                {d.raw
                    ? <div style={{ color: 'var(--text-mid)' }}>{d.raw}</div>
                    : <div style={{ color: 'var(--text-dim)' }}>{d.error_type} · {d.module}</div>
                }
            </div>
        );
    }, []);

    return (
        <div className="scatter-wrapper fade-in">
            <div className="scatter-header">
                <span className="scatter-title">CLUSTER MAP — UMAP 2D PROJECTION</span>

                {sampled && (
                    <span style={{
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-dim)',
                        marginLeft: 12,
                    }}>
                        showing {allPoints.length} of {totalPoints} points
                    </span>
                )}

                <div className="scatter-legend">
                    {safeClusters.map(c => (
                        <div
                            key={c.id}
                            className="legend-item"
                            onClick={() => toggleCluster(c.id)}
                            style={{
                                cursor: 'pointer',
                                opacity: hiddenClusters.has(c.id) ? 0.3 : 1,
                                transition: 'opacity 0.2s',
                            }}
                        >
                            <div
                                className="legend-dot"
                                style={{ background: CLUSTER_COLORS[c.id % CLUSTER_COLORS.length] }}
                            />
                            {c.label}
                        </div>
                    ))}
                    {safeAnomalies.length > 0 && (
                        <div className="legend-item">
                            <div className="legend-dot" style={{ background: ANOMALY_COLOR }} />
                            Anomalies
                        </div>
                    )}
                </div>
            </div>

            <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <XAxis
                        dataKey="x"
                        type="number"
                        domain={['auto', 'auto']}
                        tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                        label={{ value: 'UMAP-1', position: 'insideBottom', offset: -10, fill: 'var(--text-dim)', fontSize: 9 }}
                    />
                    <YAxis
                        dataKey="y"
                        type="number"
                        domain={['auto', 'auto']}
                        tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
                        axisLine={{ stroke: 'var(--border)' }}
                        tickLine={false}
                        label={{ value: 'UMAP-2', angle: -90, position: 'insideLeft', fill: 'var(--text-dim)', fontSize: 9 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Scatter
                        data={allPoints}
                        isAnimationActive={allPoints.length < 200}
                    >
                        {allPoints.map((point, i) => (
                            <Cell
                                key={i}
                                fill={point.color}
                                opacity={point.isAnomaly ? 0.5 : 0.85}
                                r={point.isAnomaly ? 4 : 6}
                            />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}