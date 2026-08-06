# Regional outage runbook

Owner: `[Incident commander]` | Technical lead: `[Regional recovery lead]`

1. Declare SEV-1, freeze deployments, establish 30-minute communications, and confirm whether identity, DNS/CDN, EKS, Atlas, Redis, object storage, secrets, and CI control planes are reachable.
2. Choose failover only when the alternate region is provisioned, current, and tested. Record the latest replicated MongoDB/object/state recovery points and expected data-loss window before changing traffic.
3. Restore or promote managed data services in the recovery region, retrieve secrets through the approved recovery identity, and deploy the last known-good immutable digests.
4. Run migrations only if required by those digests. Validate tenant isolation, critical business flows, queues, integrations, RAG indexes, backup continuity, and observability.
5. Shift DNS/CDN traffic gradually with low TTL, canary monitoring, and a documented abort threshold. Prevent both regions from accepting conflicting writes.
6. Reconcile data before failback. Failback is a separate approved change, not an automatic consequence of the primary region returning.
