import os
import json
import re
from groq import Groq
from app.core.parser import ParsedLog

class Labeler:
    def __init__(self):
        self.model = "llama-3.1-8b-instant"
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def _get_representatives(self, logs: list[ParsedLog], n: int = 5) -> list[str]:
        step = max(1, len(logs) // n)
        return [logs[i].raw for i in range(0, len(logs), step)][:n]

    def label_cluster(self, cluster_id: int, logs: list[ParsedLog]) -> dict:
        representatives = self._get_representatives(logs)
        examples = "\n".join(f"- {log}" for log in representatives)

        prompt = f"""You are an expert SRE analyzing error logs.

Here are {len(logs)} errors from the same cluster (showing up to 5 examples):
{examples}

Identify the dominant error pattern. Do NOT explain your reasoning or narrate your thought process. Return ONLY valid JSON, nothing else:
{{
  "label": "short descriptive label (max 8 words)",
  "root_cause": "one sentence root cause hypothesis",
  "severity": "Critical" | "High" | "Medium" | "Low"
}}"""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )

        raw = response.choices[0].message.content.strip()
        cleaned = re.sub(r"```json|```", "", raw).strip()

        try:
            result = json.loads(cleaned)
            if not isinstance(result, dict):
                raise ValueError("LLM returned non-dict")
            return result
        except (json.JSONDecodeError, ValueError):
            return {
                "label": f"Cluster {cluster_id}",
                "root_cause": "Could not determine root cause",
                "severity": "Medium"
            }

    def label_all(self, clusters: dict[int, list[ParsedLog]]) -> dict[int, dict]:
        results = {}
        for cluster_id, logs in clusters.items():
            print(f"Labeling cluster {cluster_id} ({len(logs)} logs)...")
            results[cluster_id] = self.label_cluster(cluster_id, logs)
        return results