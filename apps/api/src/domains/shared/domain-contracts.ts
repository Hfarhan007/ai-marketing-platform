export interface DomainEvent<TPayload extends object = object> {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateVersion: number;
  readonly type: string;
  readonly payload: Readonly<TPayload>;
}

export interface IntegrationEvent<TPayload extends object = object> {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly workspaceId?: string;
  readonly type: string;
  readonly version: number;
  readonly payload: Readonly<TPayload>;
}

export interface Command<TPayload extends object = object> {
  readonly correlationId: string;
  readonly actorId: string;
  readonly workspaceId?: string;
  readonly payload: Readonly<TPayload>;
}

export interface Query<TCriteria extends object = object> {
  readonly workspaceId?: string;
  readonly criteria: Readonly<TCriteria>;
}

export interface RepositoryPort<TAggregate> {
  findById(id: string, workspaceId?: string): Promise<TAggregate | null>;
  save(aggregate: TAggregate): Promise<void>;
}

export interface DomainPolicy<TContext> {
  evaluate(context: Readonly<TContext>): boolean;
}

export abstract class AggregateRoot {
  private readonly pendingEvents: DomainEvent[] = [];
  protected constructor(
    readonly id: string,
    protected version: number,
  ) {}
  protected record(event: DomainEvent): void {
    this.pendingEvents.push(event);
  }
  pullEvents(): readonly DomainEvent[] {
    return this.pendingEvents.splice(0);
  }
}

export class WorkspaceId {
  private static readonly pattern = /^[a-f\d]{24}$/iu;
  private constructor(readonly value: string) {}
  static create(value: string): WorkspaceId {
    if (!this.pattern.test(value)) throw new Error('Invalid workspace identifier');
    return new WorkspaceId(value.toLowerCase());
  }
  equals(other: WorkspaceId): boolean {
    return this.value === other.value;
  }
}
