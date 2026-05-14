import { useState } from 'react';
import axios from 'axios';

const API = '';

export default function ScatterPlot({ clusters, anomalies }) {
    console.log('ScatterPlot render:', typeof clusters, clusters);
}

export function useCluster() {
    const [logs, setLogs] = useState('');
    const [loading, setLoading] = useState(false);
    const [tuning, setTuning] = useState(false);
    const [error, setError] = useState(null);
    const [tuningResult, setTuningResult] = useState(null);
    const [bestSize, setBestSize] = useState(null);
    const [result, setResult] = useState(null);

    async function runTuning() {
        if (!logs.trim()) return;

        setTuning(true);
        setError(null);
        setTuningResult(null);
        setBestSize(null);
        setResult(null);

        try {
            const response = await axios.post(`/api/cluster/tune`, {
                logs,
                min_cluster_size: 2,
            });
            const data = response.data.results;
            setTuningResult(data);

            const best = data.reduce((prev, curr) =>
                curr.silhouette_score > prev.silhouette_score ? curr : prev
            );
            setBestSize(best.min_cluster_size);
        } catch (err) {
            setError(err.response?.data?.detail || 'Tuning failed');
        } finally {
            setTuning(false);
        }
    }

    async function runClustering() {
        if (!logs.trim() || bestSize == null) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await axios.post(`/api/cluster/run`, {
                logs,
                min_cluster_size: bestSize,
            });
            setResult(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    function reset() {
        setLogs('');
        setResult(null);
        setTuningResult(null);
        setBestSize(null);
        setError(null);
    }

    return {
        logs, setLogs,
        tuning, loading,
        error,
        tuningResult, bestSize, setBestSize,
        result,
        runTuning, runClustering, reset,
    };
}