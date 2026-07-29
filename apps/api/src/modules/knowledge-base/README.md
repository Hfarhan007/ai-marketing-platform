# RAG storage and search

Production retrieval uses MongoDB Atlas Vector Search index `knowledge_chunks_vector`.
The index must map `embedding` as a vector and filter `workspaceId`, `collectionIds`,
`sourceId`, `documentId`, `language`, `status`, and `metadata`.

`InMemoryVectorSearchAdapter` exists only for deterministic tests and small local
fixtures (hard cap: 5,000 records). It performs an O(n) scan, is not wired into the
application module, and is not production scalable.
