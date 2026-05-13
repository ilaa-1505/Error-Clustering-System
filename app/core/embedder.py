import numpy as np
from sentence_transformers import SentenceTransformer
from app.core.parser import ParsedLog
from app.core.parser import LogParser

class Embedder:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        print(f"Loading embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)

    def embed(self, logs: list[ParsedLog]) -> np.ndarray:
        texts = [log.cleaned for log in logs]
        embeddings = self.model.encode(
            texts,
            batch_size=64,        
            show_progress_bar=True
        )
        return embeddings        
    