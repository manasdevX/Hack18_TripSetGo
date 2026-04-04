"""
Phase 2: RAG Retrieval Tool
============================
Core utility class that performs semantic search against the private
TripSetGo knowledge base (ChromaDB).

All agents call this class to get grounded, factual context before
any LLM generation — eliminating hallucinations.
"""

import os
import logging
from typing import Optional
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class TripRetriever:
    """
    Semantic retriever for the TripSetGo knowledge base.

    Wraps ChromaDB similarity search into a clean async interface.
    Agents call `search_knowledge_base()` to get grounded facts.
    """

    def __init__(
        self,
        chroma_db_path: Optional[str] = None,
        collection_name: str = "tripsetgo_knowledge",
    ) -> None:
        self._chroma_db_path = chroma_db_path or os.getenv("CHROMA_DB_PATH", "chroma_db")
        self._collection_name = collection_name
        self._openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self._vectordb = None  # lazy-initialized

    def _ensure_db(self) -> None:
        """Initialize ChromaDB connection lazily (only when first needed)."""
        if self._vectordb is not None:
            return

        from langchain_huggingface import HuggingFaceEmbeddings
        from langchain_community.vectorstores import Chroma

        if not os.path.exists(self._chroma_db_path):
            logger.warning(
                f"ChromaDB not found at '{self._chroma_db_path}'. "
                "Run 'python -m app.rag.ingest' to build the knowledge base first."
            )

        logger.info(f"Connecting to ChromaDB at '{self._chroma_db_path}'...")
        embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
        )

        self._vectordb = Chroma(
            persist_directory=self._chroma_db_path,
            embedding_function=embeddings,
            collection_name=self._collection_name,
        )
        logger.info("ChromaDB connected successfully.")

    async def search_knowledge_base(
        self,
        query: str,
        top_k: int = 5,
        destination_filter: Optional[str] = None,
    ) -> str:
        """
        Perform a semantic similarity search against the knowledge base.

        Args:
            query:              The natural-language query (e.g. "Hotels in Goa under ₹3000").
            top_k:              Number of top matching chunks to return.
            destination_filter: Optional metadata filter to narrow results to a city.

        Returns:
            A formatted string of retrieved fact chunks, ready to inject into an LLM prompt.
            Returns a "no context" message if nothing is found.
        """
        if not query.strip():
            return "No query provided."

        try:
            self._ensure_db()
        except RuntimeError as e:
            return f"[RETRIEVAL_ERROR] {e}"

        try:
            # Build optional metadata filter
            where_filter = None
            if destination_filter:
                where_filter = {"destination": destination_filter.lower()}

            # Use MMR (Maximal Marginal Relevance) for diverse, non-redundant results
            docs = self._vectordb.max_marginal_relevance_search(
                query=query,
                k=top_k,
                fetch_k=top_k * 3,  # fetch more, then re-rank for diversity
                filter=where_filter,
            )

            if not docs:
                logger.warning(f"No results found for query: '{query}'")
                return "NO_CONTEXT_FOUND"

            # Format retrieved chunks into a readable context block
            lines = []
            for i, doc in enumerate(docs, start=1):
                source = doc.metadata.get("source", "unknown")
                source_name = os.path.basename(source)
                lines.append(f"[FACT {i} | source: {source_name}]")
                lines.append(doc.page_content.strip())
                lines.append("")  # blank separator

            result = "\n".join(lines).strip()
            logger.info(f"Retrieved {len(docs)} relevant chunks for: '{query[:60]}...' ")
            return result

        except Exception as e:
            logger.error(f"Retrieval failed for query '{query}': {e}")
            return f"[RETRIEVAL_ERROR] {e}"


# ─────────────────────────────────────────────────────────────
# Singleton factory — shared across the app via dependency injection
# ─────────────────────────────────────────────────────────────

_retriever_instance: Optional[TripRetriever] = None


def get_retriever() -> TripRetriever:
    """Return the global TripRetriever singleton."""
    global _retriever_instance
    if _retriever_instance is None:
        _retriever_instance = TripRetriever()
    return _retriever_instance
