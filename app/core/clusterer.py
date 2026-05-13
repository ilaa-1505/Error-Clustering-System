import numpy as np
import hdbscan
import umap
from sklearn.metrics import silhouette_score
from app.core.parser import ParsedLog

class Clusterer:
    def __init__(self, min_cluster_size: int = 5):
        self.min_cluster_size = min_cluster_size

    def reduce(self, embeddings: np.ndarray) -> np.ndarray:
        reducer = umap.UMAP(
            n_components=2,      
            n_neighbors=15,      
            min_dist=0.1,      
            random_state=42     
        )
        return reducer.fit_transform(embeddings)

    def cluster(self, embeddings_2d: np.ndarray) -> np.ndarray:
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=self.min_cluster_size,
            metric='euclidean',
            prediction_data=True  
        )
        clusterer.fit(embeddings_2d)
        self.clusterer_ = clusterer
        return clusterer.labels_  

    def get_probabilities(self) -> np.ndarray:
        return self.clusterer_.probabilities_  

    def silhouette(self, embeddings_2d: np.ndarray, labels: np.ndarray) -> float:
        mask = labels != -1
        if len(set(labels[mask])) < 2 or mask.sum() < 2:
            return 0.0
        return float(silhouette_score(embeddings_2d[mask], labels[mask]))

    def run(self, embeddings: np.ndarray) -> dict:
        print("Reducing dimensions with UMAP...")
        coords_2d = self.reduce(embeddings)

        print("Clustering with HDBSCAN...")
        labels = self.cluster(coords_2d)
        probs = self.get_probabilities()

        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        n_noise = int((labels == -1).sum())
        score = self.silhouette(coords_2d, labels)

        print(f"Found {n_clusters} clusters, {n_noise} anomalies, silhouette={score:.3f}")

        return {
            "coords_2d": coords_2d,      
            "labels": labels,             
            "probabilities": probs,       
            "n_clusters": n_clusters,
            "n_noise": n_noise,
            "silhouette_score": score,
        }