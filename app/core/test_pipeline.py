from parser import LogParser
from embedder import Embedder
from clusterer import Clusterer

sample = """
2024-01-15 03:42:11 ERROR ConnectionError: Database timeout in auth.py
2024-01-15 03:43:22 ERROR ConnectionError: Database timeout in auth.py
2024-01-15 03:44:11 ERROR ConnectionError: Database connection refused in auth.py
2024-01-15 03:45:00 ERROR ConnectionError: Database timeout in auth.py
2024-01-15 03:46:10 ERROR ConnectionError: Could not connect to database in auth.py
2024-01-15 03:47:11 ERROR ConnectionError: Database timeout in auth.py
2024-01-15 03:48:22 ERROR ConnectionError: Database connection failed in auth.py
2024-01-15 05:12:01 ERROR NullPointerException in user.py line 891
2024-01-15 05:13:44 ERROR NullPointerException in user.py line 812
2024-01-15 05:14:22 ERROR NullPointerException: user object is null in user.py
2024-01-15 05:15:01 ERROR NullPointerException in user.py line 901
2024-01-15 05:16:44 ERROR NullPointerException: cannot dereference null in user.py
2024-01-15 05:17:22 ERROR NullPointerException in user.py line 788
2024-01-15 05:18:01 ERROR NullPointerException: null reference in user.py
2024-01-15 07:22:11 ERROR KeyError: user_id not found in session.py
2024-01-15 07:23:55 ERROR KeyError: user_id missing from session in session.py
2024-01-15 07:24:11 ERROR KeyError: user_id not found in session.py
2024-01-15 07:25:00 ERROR KeyError: missing key user_id in session.py
2024-01-15 07:26:10 ERROR KeyError: user_id not found in session.py
2024-01-15 07:27:11 ERROR KeyError: user_id missing in session.py
2024-01-15 07:28:22 ERROR KeyError: user_id not found in session.py
2024-01-15 09:01:33 ERROR OutOfMemoryError: heap space exceeded in worker.py
2024-01-15 09:02:44 ERROR OutOfMemoryError: heap space exceeded in worker.py
2024-01-15 09:03:55 ERROR OutOfMemoryError: not enough memory in worker.py
2024-01-15 09:04:11 ERROR OutOfMemoryError: heap space exceeded in worker.py
2024-01-15 09:05:22 ERROR OutOfMemoryError: out of memory in worker.py
2024-01-15 09:06:33 ERROR OutOfMemoryError: heap space exceeded in worker.py
2024-01-15 09:07:44 ERROR OutOfMemoryError: heap space exceeded in worker.py
2024-01-15 11:34:22 ERROR SSL certificate verification failed unexpectedly
2024-01-15 14:22:11 ERROR Segmentation fault core dumped unexpectedly
"""

parser = LogParser()
result = parser.parse_many(sample)
print(f"Parsed: {result['stats']}")

embedder = Embedder()
embeddings = embedder.embed(result["logs"])

clusterer = Clusterer(min_cluster_size=2)
output = clusterer.run(embeddings)

print(f"Clusters: {output['n_clusters']}")
print(f"Anomalies: {output['n_noise']}")
print(f"Silhouette: {output['silhouette_score']:.3f}")
print(f"Labels: {output['labels']}")

