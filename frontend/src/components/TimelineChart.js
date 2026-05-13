import { useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

const CLUSTER_COLORS = [
    '#f59e0b', '#3b82f6', '#22c55e', '#ef4444',
    '#a855f7', '#06b6d4', '#f97316', '#ec4899',
    '#84cc16', '#14b8a6',
];

export default function TimelineChart({ timeline }) {
    const { buckets, cluster_ids, cluster_labels } = timeline;
    const [hidden, setHidden] = useState(new Set());

    if (!buckets || buckets.length === 0) {
        return (
            <div className="panel fade-in">
                <div className="panel-header">
                    <span className="panel-title">TIMELINE — ERROR FREQUENCY OVER TIME</span>
                </div>
                <div style={{ padding: 24, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    No timestamp data available for timeline.
                </div>
            </div>
        );
    }

    function toggleCluster(cid) {
        setHidden(prev => {
            const next = new Set(prev);
            next.has(cid) ? next.delete(cid) : next.add(cid);
            return next;
        });
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="tooltip-box">
                <div style={{ color: 'var(--text-dim)', marginBottom: 6 }}>{label}</div>
                {payload.map(p => (
                    p.value > 0 && (
                        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
                            {cluster_labels[p.dataKey.replace('cluster_', '')]} — {p.value} errors
                        </div>
                    )
                ))}
            </div>
        );
    };

    return (
        <div className="panel fade-in">
            <div className="panel-header">
                <span className="panel-title">TIMELINE — ERROR FREQUENCY OVER TIME</span>
                <div className="formats-list">
                    {cluster_ids.map((cid, i) => (
                        <div
                            key={cid}
                            className="format-badge"
                            onClick={() => toggleCluster(cid)}
                            style={{
                                cursor: 'pointer',
                                opacity: hidden.has(cid) ? 0.3 : 1,
                                transition: 'opacity 0.2s',
                            }}
                        >
                            <div style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
                                flexShrink: 0,
                            }} />
                            <span className="format-name" style={{ color: 'var(--text-mid)' }}>
                                {cluster_labels[cid]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ padding: '16px 8px 8px' }}>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={buckets} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
                        <XAxis
                            dataKey="time"
                            tick={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                            axisLine={{ stroke: 'var(--border)' }}
                            tickLine={false}
                            interval={Math.floor(buckets.length / 8)}
                        />
                        <YAxis
                            tick={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                            axisLine={{ stroke: 'var(--border)' }}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {cluster_ids.map((cid, i) => (
                            !hidden.has(cid) && (
                                <Line
                                    key={cid}
                                    type="monotone"
                                    dataKey={`cluster_${cid}`}
                                    stroke={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                    isAnimationActive={true}
                                />
                            )
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}