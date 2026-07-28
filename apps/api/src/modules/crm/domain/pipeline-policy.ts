export interface StageDefinition {
  id?: string;
  name: string;
  order: number;
  probability: number;
  rules?: Record<string, unknown>;
}
export class PipelinePolicy {
  validate(stages: readonly StageDefinition[]) {
    if (!stages.length) throw new Error('PIPELINE_DEFAULT_STAGE_REQUIRED');
    const orders = stages.map((stage) => stage.order);
    if (new Set(orders).size !== orders.length) throw new Error('PIPELINE_STAGE_ORDER_DUPLICATE');
    if (!stages.some((stage) => stage.order === 0))
      throw new Error('PIPELINE_DEFAULT_STAGE_REQUIRED');
    for (const stage of stages)
      if (stage.probability < 0 || stage.probability > 100)
        throw new Error('PIPELINE_STAGE_PROBABILITY_INVALID');
  }
  assertSafeChange(
    current: readonly StageDefinition[],
    next: readonly StageDefinition[],
    usedStageIds: ReadonlySet<string>,
    migration: ReadonlyMap<string, string> = new Map(),
  ) {
    const nextIds = new Set(next.flatMap((stage) => (stage.id ? [stage.id] : [])));
    for (const stage of current) {
      if (
        stage.id &&
        usedStageIds.has(stage.id) &&
        !nextIds.has(stage.id) &&
        !migration.has(stage.id)
      )
        throw new Error('USED_PIPELINE_STAGE_REQUIRES_MIGRATION');
      if (stage.id && migration.has(stage.id) && !nextIds.has(migration.get(stage.id)!))
        throw new Error('PIPELINE_STAGE_MIGRATION_TARGET_INVALID');
      const replacement = stage.id ? next.find((value) => value.id === stage.id) : undefined;
      if (stage.id && replacement && replacement.id !== stage.id)
        throw new Error('PIPELINE_STAGE_ID_IMMUTABLE');
    }
  }
  assertEntry(stage: StageDefinition, deal: { value: number; ownerId?: unknown }) {
    const minimum = Number(stage.rules?.minimumValue ?? 0);
    if (deal.value < minimum) throw new Error('PIPELINE_STAGE_MINIMUM_VALUE_NOT_MET');
    if (stage.rules?.requiresOwner === true && !deal.ownerId)
      throw new Error('PIPELINE_STAGE_OWNER_REQUIRED');
  }
}
