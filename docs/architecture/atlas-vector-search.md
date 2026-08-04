# MongoDB Atlas Vector Search operations

Production retrieval uses MongoDB Atlas Vector Search. The in-memory cosine adapter is restricted to
tests and small fixtures; it is not registered as a production fallback.

## Definitions and names

Definitions live in `vector-index-definitions.ts`. Names include the environment and immutable
version, for example `knowledge-chunks-production-v2`. Every definition filters on `workspaceId`,
collections, source/document, language, status, access-control groups, content type, and creation
time. The configured vector dimension must match the embedding model.

Atlas prerequisites are an `mongodb+srv` connection, database access able to manage Search indexes,
and a cluster tier supporting Vector Search. Normal MongoDB indexes and Atlas Search indexes are
different resources; `db:indexes` does not deploy Search indexes.

## Deployment and migration plan

1. Deploy without changing reads: `pnpm --filter @repo/api db:vector:deploy -- v2 3072`.
2. Poll readiness: `pnpm --filter @repo/api db:vector:health -- v2 3072`. Do not proceed unless the
   state is `READY` and `queryable` is true.
3. Re-embed into the new model/version and retain the existing active index.
4. Set `ATLAS_VECTOR_CANDIDATE_VERSION=v2` and `ATLAS_VECTOR_DUAL_READ=true`. Candidate queries run
   with the identical tenant filter; active-index results remain authoritative.
5. Review recall, latency, errors, and tenant assertions. Activate with
   `pnpm --filter @repo/api db:vector:activate -- v2 3072`, then set
   `ATLAS_VECTOR_INDEX_VERSION=v2` and disable dual reads.
6. Retain the previous index/version through the rollback window before manual removal in Atlas.

## Rollback

Restore `ATLAS_VECTOR_INDEX_VERSION` to the prior version, disable dual reads, and redeploy the API.
The old index and embeddings remain intact during the transition. Confirm its health before rollback.
Never delete the candidate or prior index as part of activation. Index-version records in
`knowledge_vector_index_versions` provide the deployment, readiness, activation, and supersession
history.

Every repository query constructs `workspaceId` from trusted request context, asserts it in the
`$vectorSearch.filter`, and rejects cross-workspace results. A missing or mismatched tenant filter is
a fatal security error; there is no unfiltered retry path.
