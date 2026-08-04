export const VECTOR_FILTER_PATHS = [
  'workspaceId',
  'collectionIds',
  'sourceId',
  'documentId',
  'language',
  'status',
  'accessControl.groups',
  'metadata.contentType',
  'createdAt',
] as const;

export interface AtlasVectorIndexDefinition {
  collection: 'knowledge_chunks';
  version: string;
  name: string;
  dimensions: number;
  definition: { fields: Array<Record<string, unknown>> };
}

export function vectorIndexName(environment: string, version: string) {
  const safeEnvironment = environment.toLowerCase().replace(/[^a-z0-9]+/gu, '-');
  const safeVersion = version.toLowerCase().replace(/[^a-z0-9]+/gu, '-');
  return `knowledge-chunks-${safeEnvironment}-${safeVersion}`;
}

export function atlasVectorIndex(
  environment: string,
  version: string,
  dimensions: number,
): AtlasVectorIndexDefinition {
  if (!Number.isInteger(dimensions) || dimensions < 1)
    throw new Error('Vector dimensions must be a positive integer');
  return {
    collection: 'knowledge_chunks',
    version,
    name: vectorIndexName(environment, version),
    dimensions,
    definition: {
      fields: [
        { type: 'vector', path: 'embedding', numDimensions: dimensions, similarity: 'cosine' },
        ...VECTOR_FILTER_PATHS.map((path) => ({ type: 'filter', path })),
      ],
    },
  };
}

export function configuredVectorIndexes(environment: string) {
  return [
    atlasVectorIndex(environment, 'v1', 1536),
    atlasVectorIndex(environment, 'v2', 3072),
  ] as const;
}
