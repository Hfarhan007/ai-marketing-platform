# RAG storage and search

Production retrieval uses MongoDB Atlas Vector Search index `knowledge_chunks_vector`.
The index must map `embedding` as a vector and filter `workspaceId`, `collectionIds`,
`sourceId`, `documentId`, `language`, `status`, and `metadata`.

`InMemoryVectorSearchAdapter` exists only for deterministic tests and small local
fixtures (hard cap: 5,000 records). It performs an O(n) scan, is not wired into the
application module, and is not production scalable.

## Complete vertical slice

`POST /knowledge-base/sources/complete-rag` accepts either `manual_text` or a base64-encoded
UTF-8 `.txt`, `.md`, or `.markdown` upload. It creates the source, extracts and validates text,
normalizes, revisions, chunks, embeds, persists, retrieves through Atlas hybrid search, reranks,
assembles a bounded context, generates a grounded answer, validates citations, and returns the
persisted retrieval trace ID. Provider credentials remain server-side.

Atlas Search and Atlas Vector Search are always the application runtime implementations. The
deterministic in-memory vector adapter and deterministic embeddings are non-production test
fixtures only; local testing with them does not establish Atlas index compatibility or quality.
