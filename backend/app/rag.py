import numpy as np
import faiss
import google.generativeai as genai
from app.config import settings

class RAGManager:
    def __init__(self, dimension: int = 768):
        self.dimension = dimension
        self.index = faiss.IndexFlatL2(dimension)
        self.chunks = []
        self.is_built = False

    def _get_embedding(self, text: str) -> list:
        """Fetch embedding from Gemini models/embedding-001."""
        if not settings.GEMINI_API_KEY:
            return [0.0] * self.dimension
        
        genai.configure(api_key=settings.GEMINI_API_KEY)
        result = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type="retrieval_document"
        )
        return result["embedding"]

    def build_index(self, text: str, chunk_size: int = 400, overlap: int = 50):
        """Split text into chunks, generate embeddings, and build the FAISS index."""
        if not text.strip():
            return
        
        # Simple character-based sliding window chunking
        self.chunks = []
        words = text.split()
        
        # Reconstruct chunks of approximately chunk_size characters
        current_chunk = []
        current_length = 0
        
        for word in words:
            current_chunk.append(word)
            current_length += len(word) + 1
            if current_length >= chunk_size:
                self.chunks.append(" ".join(current_chunk))
                # keep overlap
                overlap_words = current_chunk[-max(1, int(overlap / 10)):]
                current_chunk = list(overlap_words)
                current_length = sum(len(w) + 1 for w in current_chunk)
                
        if current_chunk:
            self.chunks.append(" ".join(current_chunk))
            
        if not self.chunks:
            return

        embeddings = []
        for chunk in self.chunks:
            try:
                emb = self._get_embedding(chunk)
                embeddings.append(emb)
            except Exception as e:
                print(f"Error embedding chunk: {e}")
                embeddings.append([0.0] * self.dimension)
                
        # Load into FAISS
        self.index = faiss.IndexFlatL2(self.dimension)
        vectors = np.array(embeddings).astype("float32")
        self.index.add(vectors)
        self.is_built = True

    def search(self, query: str, k: int = 2) -> list:
        """Search the FAISS index for relevant chunks."""
        if not self.is_built or not self.chunks:
            return []
        
        try:
            query_emb = self._get_embedding(query)
            query_vector = np.array([query_emb]).astype("float32")
            
            k_val = min(k, len(self.chunks))
            distances, indices = self.index.search(query_vector, k_val)
            
            results = []
            for idx in indices[0]:
                if idx >= 0 and idx < len(self.chunks):
                    results.append(self.chunks[idx])
            return results
        except Exception as e:
            print(f"RAG Search error: {e}")
            return []
