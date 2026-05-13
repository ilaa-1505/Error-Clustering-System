import { useCluster } from './hooks/useCluster';
import InputPanel from './components/InputPanel';
import TuningPanel from './components/TuningPanel';
import StatsBar from './components/StatsBar';
import ClusterCard from './components/ClusterCard';
import AnomalyPanel from './components/AnomalyPanel';
import ScatterPlot from './components/ScatterPlot';
import TimelineChart from './components/TimelineChart';
import ReportPanel from './components/ReportPanel';
import './index.css';

export default function App() {
  const cluster = useCluster();

  return (
    <div className="app">
      <header className="header">
        <h1>Error Clustering Engine</h1>
        <p>Paste logs. Get clusters. Find the root cause.</p>
      </header>

      <main className="main">
        <InputPanel
          logs={cluster.logs}
          setLogs={cluster.setLogs}
          onAnalyse={cluster.runTuning}
          onReset={cluster.reset}
          tuning={cluster.tuning}
          hasResult={!!cluster.result}
        />

        {cluster.error && (
          <div className="error-bar">⚠ {cluster.error}</div>
        )}

        {cluster.logs.trim() && (
          <TuningPanel
            tuningResult={cluster.tuningResult}
            tuning={cluster.tuning}
            loading={cluster.loading}
            bestSize={cluster.bestSize}
            setBestSize={cluster.setBestSize}
            onRun={cluster.runClustering}
          />
        )}

        {cluster.loading && (
          <div className="loading-bar">
            Running pipeline — parsing, embedding, clustering...
          </div>
        )}

        {cluster.result && (
          <>
            <StatsBar
              stats={cluster.result.stats}
              nClusters={cluster.result.n_clusters}
              nAnomalies={cluster.result.n_anomalies}
              silhouette={cluster.result.silhouette_score}
            />

            <ScatterPlot
              clusters={cluster.result.clusters}
              anomalies={cluster.result.anomalies}
            />

            <TimelineChart timeline={cluster.result.timeline} />

            <div className="clusters-grid">
              {cluster.result.clusters.map(c => (
                <ClusterCard key={c.id} cluster={c} />
              ))}
            </div>

            {cluster.result.anomalies.length > 0 && (
              <AnomalyPanel anomalies={cluster.result.anomalies} />
            )}

            <ReportPanel
              clusters={cluster.result.clusters}
              anomalies={cluster.result.anomalies}
              stats={cluster.result.stats}
            />
          </>
        )}
      </main>
    </div>
  );
}