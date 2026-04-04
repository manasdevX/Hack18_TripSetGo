"""
Phase 1: Data Ingestion Pipeline
=================================
Standalone script to build the TripSetGo knowledge base.
Run this ONCE before launching the server, or whenever data is updated.

Usage:
    cd backend/
    python -m app.rag.ingest

Requirements:
    - OPENAI_API_KEY set in .env
    - Travel data files (*.txt, *.md, *.json) placed in the ./data/ directory
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import List

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


def _get_config() -> dict:
    """Read config from environment variables."""
    return {
        "data_dir": os.getenv("DATA_DIR", "data"),
        "chroma_db_path": os.getenv("CHROMA_DB_PATH", "chroma_db"),
        "openai_api_key": os.getenv("OPENAI_API_KEY", ""),
        "chunk_size": int(os.getenv("CHUNK_SIZE", "500")),
        "chunk_overlap": int(os.getenv("CHUNK_OVERLAP", "50")),
    }


def load_documents(data_dir: str) -> list:
    """
    Load all .txt, .md, and .json files from the data directory.
    Returns a flat list of LangChain Document objects.
    """
    from langchain_community.document_loaders import (
        TextLoader,
        DirectoryLoader,
    )

    data_path = Path(data_dir)
    if not data_path.exists():
        logger.error(f"Data directory not found: {data_dir}")
        logger.info("Creating empty data directory. Please add your travel data files.")
        data_path.mkdir(parents=True, exist_ok=True)
        return []

    all_docs = []

    # Load .txt and .md files
    for glob_pattern in ["**/*.txt", "**/*.md"]:
        try:
            loader = DirectoryLoader(
                str(data_path),
                glob=glob_pattern,
                loader_cls=TextLoader,
                loader_kwargs={"encoding": "utf-8"},
                silent_errors=True,
            )
            docs = loader.load()
            all_docs.extend(docs)
            logger.info(f"Loaded {len(docs)} documents matching '{glob_pattern}'")
        except Exception as e:
            logger.warning(f"Error loading {glob_pattern}: {e}")

    # Load .json files — each JSON file must be a list of records or a dict with a "content" key
    json_files = list(data_path.rglob("*.json"))
    for json_file in json_files:
        try:
            from langchain_core.documents import Document
            with open(json_file, "r", encoding="utf-8") as f:
                raw = json.load(f)

            # Handle list of records (e.g., hotel listings)
            if isinstance(raw, list):
                for i, record in enumerate(raw):
                    content = json.dumps(record, ensure_ascii=False, indent=2)
                    all_docs.append(
                        Document(
                            page_content=content,
                            metadata={"source": str(json_file), "record_index": i}
                        )
                    )
            # Handle single dict with a "content" key
            elif isinstance(raw, dict):
                content = raw.get("content") or json.dumps(raw, ensure_ascii=False, indent=2)
                all_docs.append(
                    Document(
                        page_content=content,
                        metadata={"source": str(json_file)}
                    )
                )
            logger.info(f"Loaded JSON file: {json_file.name}")
        except Exception as e:
            logger.warning(f"Error loading {json_file}: {e}")

    logger.info(f"Total documents loaded: {len(all_docs)}")
    return all_docs


def chunk_documents(documents: list, chunk_size: int, chunk_overlap: int) -> list:
    """
    Split documents into smaller chunks for embedding.
    Uses RecursiveCharacterTextSplitter as recommended for travel/prose text.
    """
    from langchain.text_splitter import RecursiveCharacterTextSplitter

    if not documents:
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = splitter.split_documents(documents)
    logger.info(f"Chunked {len(documents)} docs → {len(chunks)} chunks "
                f"(size={chunk_size}, overlap={chunk_overlap})")
    return chunks


def build_vector_store(chunks: list, openai_api_key: str, chroma_db_path: str):
    """
    Embed chunks and persist the ChromaDB vector store.
    """
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain_community.vectorstores import Chroma

    if not chunks:
        logger.warning("No chunks to embed. Exiting.")
        return None

    logger.info("Initializing HuggingFace embeddings (all-MiniLM-L6-v2)...")
    embeddings = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2",
    )

    logger.info(f"Building ChromaDB at: {chroma_db_path} ...")
    vectordb = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=chroma_db_path,
        collection_name="tripsetgo_knowledge",
    )

    vectordb.persist()
    logger.info(f"✅ Knowledge base built! {len(chunks)} chunks persisted to '{chroma_db_path}'")
    return vectordb


def ingest(data_dir: str = None, chroma_db_path: str = None) -> None:
    """Main ingestion entry point."""
    config = _get_config()
    data_dir = data_dir or config["data_dir"]
    chroma_db_path = chroma_db_path or config["chroma_db_path"]

    logger.info("=" * 60)
    logger.info("TripSetGo RAG Ingestion Pipeline Starting...")
    logger.info(f"  Data directory : {data_dir}")
    logger.info(f"  ChromaDB path  : {chroma_db_path}")
    logger.info("=" * 60)

    documents = load_documents(data_dir)
    if not documents:
        logger.error("No documents found. Please add travel data to the data/ directory.")
        return

    chunks = chunk_documents(
        documents,
        chunk_size=config["chunk_size"],
        chunk_overlap=config["chunk_overlap"],
    )

    build_vector_store(
        chunks=chunks,
        openai_api_key=config["openai_api_key"],
        chroma_db_path=chroma_db_path,
    )


if __name__ == "__main__":
    ingest()
