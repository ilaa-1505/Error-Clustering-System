import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.parser import LogParser
from app.core.embedder import Embedder
from app.core.clusterer import Clusterer
from app.core.labeller import Labeler
from collections import defaultdict
import json
import re
from datetime import datetime

def numpy_to_python(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

router = APIRouter(prefix="/cluster", tags=["clustering"])

parser = LogParser()
embedder = Embedder()

def parse_timestamp(ts: str) -> datetime | None:
    if not ts:
        return None
    formats = [
        "%Y-%m-%d %H:%M:%S",        
        "%b %d %H:%M:%S",             
        "%a %b %d %H:%M:%S %Y",      
        "%y%m%d %H%M%S",              
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(ts, fmt)
            if dt.year == 1900:
                dt = dt.replace(year=2024)
            return dt
        except ValueError:
            continue
    return None

def build_timeline(clusters_out: list, bucket_minutes: int = 30) -> dict:
    all_times = []
    for cluster in clusters_out:
        for point in cluster["points"]:
            dt = parse_timestamp(point["timestamp"])
            if dt:
                all_times.append(dt)

    if not all_times:
        return {"buckets": [], "cluster_ids": [], "cluster_labels": {}}

    min_time = min(all_times)
    max_time = max(all_times)

    total_minutes = (max_time - min_time).total_seconds() / 60
    if total_minutes <= 60:
        bucket_minutes = 5
    elif total_minutes <= 360:
        bucket_minutes = 15
    elif total_minutes <= 1440:
        bucket_minutes = 60
    else:
        bucket_minutes = 120

    min_time = min(all_times)
    max_time = max(all_times)

    from datetime import timedelta
    bucket_delta = timedelta(minutes=bucket_minutes)
    buckets = []
    current = min_time
    while current <= max_time:
        buckets.append(current)
        current += bucket_delta

    counts = defaultdict(lambda: defaultdict(int))

    for cluster in clusters_out:
        cid = str(cluster["id"])
        for point in cluster["points"]:
            dt = parse_timestamp(point["timestamp"])
            if not dt:
                continue
            bucket_idx = int((dt - min_time).total_seconds() / (bucket_minutes * 60))
            bucket_idx = min(bucket_idx, len(buckets) - 1)
            counts[bucket_idx][cid] += 1


    cluster_ids = [str(c["id"]) for c in clusters_out]
    cluster_labels = {str(c["id"]): c["label"] for c in clusters_out}

    timeline_data = []
    for i, bucket_time in enumerate(buckets):
        entry = {"time": bucket_time.strftime("%H:%M")}
        for cid in cluster_ids:
            entry[f"cluster_{cid}"] = counts[i].get(cid, 0)
        timeline_data.append(entry)
    print(f"min_time: {min_time}, max_time: {max_time}, total_minutes: {total_minutes}")

    MAX_BUCKETS = 200
    if len(timeline_data) > MAX_BUCKETS:
        step = len(timeline_data) // MAX_BUCKETS
        timeline_data = timeline_data[::step][:MAX_BUCKETS]

    print(f"min_time: {min_time}, max_time: {max_time}, total_minutes: {total_minutes}")
    return {
        "buckets": timeline_data,
        "cluster_ids": cluster_ids,
        "cluster_labels": cluster_labels,
    }

class ClusterRequest(BaseModel):
    logs: str
    min_cluster_size: int = 5

@router.post("/run")
def run_clustering(req: ClusterRequest):
    parse_result = parser.parse_many(req.logs)
    logs = parse_result["logs"]

    if len(logs) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 valid log lines")

    embeddings = embedder.embed(logs)

    clusterer = Clusterer(min_cluster_size=req.min_cluster_size)
    cluster_result = clusterer.run(embeddings)

    labels = cluster_result["labels"]
    coords = cluster_result["coords_2d"]
    probs  = cluster_result["probabilities"]

    clusters = {}
    anomalies = []

    is_large = len(logs) > 500      
 
    for i, (log, label, prob) in enumerate(zip(logs, labels, probs)):
        point = {
            "x": float(coords[i][0]),
            "y": float(coords[i][1]),
            "probability": float(prob),
            "cluster": int(label),
            "error_type": log.error_type,
            "module": log.module,
            "timestamp": log.timestamp,
        }
        if not is_large:
            point["raw"] = log.raw
            point["cleaned"] = log.cleaned
 
        if label == -1:
            anomalies.append(point)
        else:
            clusters.setdefault(int(label), []).append(point)

    labeler = Labeler()
    cluster_logs = defaultdict(list)
    for i, log in enumerate(logs):
        if labels[i] != -1:
            cluster_logs[int(labels[i])].append(log)

    labels_result = labeler.label_all(cluster_logs)

    clusters_out = []
    for cid, points in clusters.items():
        meta = labels_result.get(cid, {})
        if not isinstance(meta, dict):
            meta = {}

        clusters_out.append({
            "id": cid,
            "label": meta.get("label", f"Cluster {cid}"),
            "root_cause": meta.get("root_cause", ""),
            "severity": meta.get("severity", "Medium"),
            "count": len(points),
            "points": points,
        })

    clusters_out.sort(key=lambda c: c["count"], reverse=True)

    timeline = build_timeline(clusters_out, bucket_minutes=30)

    response = {
        "stats": parse_result["stats"],
        "n_clusters": cluster_result["n_clusters"],
        "n_anomalies": len(anomalies),
        "silhouette_score": cluster_result["silhouette_score"],
        "clusters": clusters_out,
        "anomalies": anomalies,
        "timeline": timeline,        
    }

    return json.loads(json.dumps(response, default=numpy_to_python))


class ReportRequest(BaseModel):
    clusters: list
    anomalies: list
    stats: dict

@router.post("/report")
def generate_report(req: ReportRequest):
    labeler = Labeler()

    cluster_summary = "\n".join([
        f"- Cluster '{c['label']}' ({c['severity']}): {c['count']} errors. Root cause: {c['root_cause']}"
        for c in sorted(req.clusters, key=lambda x: x['count'], reverse=True)
    ])

    anomaly_summary = "\n".join([
        f"- {a['raw']}"
        for a in req.anomalies[:5]
    ]) or "None detected"

    prompt = f"""You are a senior SRE writing an incident report based on error log analysis.

STATS:
- Total lines analyzed: {req.stats['total_lines']}
- Valid errors: {req.stats['valid']}
- Clusters found: {len(req.clusters)}
- Anomalies: {len(req.anomalies)}

CLUSTERS (sorted by size):
{cluster_summary}

ANOMALIES:
{anomaly_summary}

Write a structured incident report. Return ONLY valid JSON:
{{
  "executive_summary": "2-3 sentence summary of the overall situation",
  "top_issues": [
    {{
      "rank": 1,
      "label": "cluster label",
      "severity": "Critical/High/Medium/Low",
      "impact": "how many errors, what's affected",
      "suggested_fix": "concrete next debugging step"
    }}
  ],
  "anomaly_assessment": "one sentence about the anomalies",
  "overall_severity": "Critical/High/Medium/Low",
  "estimated_affected_systems": ["system1", "system2"]
}}

Return top 3 issues maximum. Be specific and actionable.
"""

    response = labeler.client.chat.completions.create(
        model=labeler.model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )

    raw = response.choices[0].message.content.strip()
    cleaned = re.sub(r"```json|```", "", raw).strip()

    try:
        result = json.loads(cleaned)
        if not isinstance(result, dict):
            raise ValueError("non-dict")
        return result
    except (json.JSONDecodeError, ValueError):
        return {
            "executive_summary": "Could not generate report.",
            "top_issues": [],
            "anomaly_assessment": "",
            "overall_severity": "Unknown",
            "estimated_affected_systems": []
        }
    
@router.post("/tune")
def tune_cluster_size(req: ClusterRequest):
    parse_result = parser.parse_many(req.logs)
    logs = parse_result["logs"]

    if len(logs) < 10:
        raise HTTPException(status_code=400, detail="Need at least 10 valid log lines")

    embeddings = embedder.embed(logs)

    from app.core.clusterer import Clusterer
    base = Clusterer(min_cluster_size=2)
    coords_2d = base.reduce(embeddings)

    results = []
    for size in [2, 3, 5, 8, 10, 15, 20, 30]:
        import hdbscan
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=size,
            metric='euclidean',
        )
        clusterer.fit(coords_2d)
        labels = clusterer.labels_
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        n_noise = int((labels == -1).sum())

        from sklearn.metrics import silhouette_score
        import numpy as np
        mask = labels != -1
        if len(set(labels[mask])) >= 2 and mask.sum() >= 2:
            score = float(silhouette_score(coords_2d[mask], labels[mask]))
        else:
            score = 0.0

        results.append({
            "min_cluster_size": size,
            "n_clusters": n_clusters,
            "n_noise": n_noise,
            "silhouette_score": round(score, 4),
        })
        print(f"size={size}: {n_clusters} clusters, {n_noise} noise, silhouette={score:.3f}")

    return json.loads(json.dumps({"results": results}, default=numpy_to_python))