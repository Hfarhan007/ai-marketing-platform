import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  Audience,
  Campaign,
  type CampaignDocument,
  CampaignMetric,
  CampaignRun,
  CampaignVersion,
  Delivery,
  Segment,
  SuppressionEntry,
  UnsubscribeEvent,
} from '../schemas/campaign.schemas.js';
import type { RecipientSnapshot } from '../types/campaign.types.js';
@Injectable()
export class CampaignRepository {
  constructor(
    @InjectModel(Campaign.name) private readonly campaigns: Model<CampaignDocument>,
    @InjectModel(CampaignVersion.name) private readonly versions: Model<CampaignVersion>,
    @InjectModel(Audience.name) private readonly audiences: Model<Audience>,
    @InjectModel(Segment.name) private readonly segments: Model<Segment>,
    @InjectModel(CampaignRun.name) private readonly runs: Model<CampaignRun>,
    @InjectModel(Delivery.name) private readonly deliveries: Model<Delivery>,
    @InjectModel(SuppressionEntry.name) private readonly suppressions: Model<SuppressionEntry>,
    @InjectModel(UnsubscribeEvent.name) private readonly unsubscribes: Model<UnsubscribeEvent>,
    @InjectModel(CampaignMetric.name) private readonly metrics: Model<CampaignMetric>,
  ) {}
  async create(workspaceId: string, userId: string, input: object, version: object) {
    const campaign = new this.campaigns({
      ...input,
      workspaceId: new Types.ObjectId(workspaceId),
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId),
    });
    await campaign.save();
    await new this.versions({
      ...version,
      workspaceId: new Types.ObjectId(workspaceId),
      campaignId: campaign._id,
      version: 1,
    }).save();
    return campaign.toObject();
  }
  async campaign(workspaceId: string, id: string) {
    const value = await this.campaigns
      .findOne({ _id: new Types.ObjectId(id), workspaceId: new Types.ObjectId(workspaceId) })
      .lean<Campaign>()
      .exec();
    if (!value) throw new NotFoundException('Campaign not found');
    return value;
  }
  draft(workspaceId: string, id: string) {
    return this.versions
      .findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        campaignId: new Types.ObjectId(id),
        status: { $in: ['draft', 'published'] },
      })
      .sort({ version: -1 })
      .lean<CampaignVersion>()
      .exec();
  }
  published(workspaceId: string, id: string) {
    return this.versions
      .findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        campaignId: new Types.ObjectId(id),
        status: 'published',
      })
      .sort({ version: -1 })
      .lean<CampaignVersion>()
      .exec();
  }
  async publish(workspaceId: string, id: string) {
    const value = await this.versions
      .findOneAndUpdate(
        {
          workspaceId: new Types.ObjectId(workspaceId),
          campaignId: new Types.ObjectId(id),
          status: 'draft',
        },
        { $set: { status: 'published', publishedAt: new Date() } },
        { new: true },
      )
      .lean<CampaignVersion>()
      .exec();
    if (!value) throw new ConflictException('Campaign version is not publishable');
    await this.campaigns.updateOne(
      { _id: new Types.ObjectId(id), workspaceId: new Types.ObjectId(workspaceId) },
      { $set: { publishedVersion: value.version, approvalStatus: 'approved' } },
    );
    return value;
  }
  audience(workspaceId: string, id: string) {
    return this.audiences
      .findOne({ _id: new Types.ObjectId(id), workspaceId: new Types.ObjectId(workspaceId) })
      .lean<Audience>()
      .exec();
  }
  segment(workspaceId: string, id: string) {
    return this.segments
      .findOne({ _id: new Types.ObjectId(id), workspaceId: new Types.ObjectId(workspaceId) })
      .lean<Segment>()
      .exec();
  }
  suppressionAddresses(workspaceId: string, channel: string, addresses: string[]) {
    return this.suppressions
      .find({
        workspaceId: new Types.ObjectId(workspaceId),
        channel,
        normalizedAddress: { $in: addresses },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      })
      .distinct('normalizedAddress')
      .exec();
  }
  async reserveRun(
    workspaceId: string,
    campaignId: string,
    versionId: string,
    key: string,
    snapshot: RecipientSnapshot[],
    session?: ClientSession,
  ) {
    const existing = await this.runs
      .findOne({ workspaceId: new Types.ObjectId(workspaceId), idempotencyKey: key })
      .session(session ?? null)
      .lean<CampaignRun>()
      .exec();
    if (existing) return { run: existing, duplicate: true };
    const run = new this.runs({
      workspaceId: new Types.ObjectId(workspaceId),
      campaignId: new Types.ObjectId(campaignId),
      campaignVersionId: new Types.ObjectId(versionId),
      idempotencyKey: key,
      totalRecipients: snapshot.length,
      audienceSnapshot: snapshot,
      status: 'queued',
    });
    await run.save(session ? { session } : {});
    return { run: run.toObject(), duplicate: false };
  }
  async createDeliveries(
    workspaceId: string,
    runId: string,
    channel: string,
    communicationType: string,
    snapshot: RecipientSnapshot[],
    session?: ClientSession,
  ) {
    if (!snapshot.length) return [];
    return this.deliveries.insertMany(
      snapshot.map((r) => ({
        workspaceId: new Types.ObjectId(workspaceId),
        campaignRunId: new Types.ObjectId(runId),
        contactId: new Types.ObjectId(r.contactId),
        channel,
        communicationType,
        region: r.region,
        address: r.address,
        variantId: r.variantId,
        idempotencyKey: `${runId}:${r.contactId}:${channel}`,
        deliverAt: r.deliverAt,
        status: 'queued',
      })),
      { ordered: false, ...(session ? { session } : {}) },
    );
  }
  run(workspaceId: string, id: string) {
    return this.runs
      .findOne({ _id: new Types.ObjectId(id), workspaceId: new Types.ObjectId(workspaceId) })
      .lean<CampaignRun>()
      .exec();
  }
  delivery(workspaceId: string, id: string) {
    return this.deliveries
      .findOne({ _id: new Types.ObjectId(id), workspaceId: new Types.ObjectId(workspaceId) })
      .lean<Delivery>()
      .exec();
  }
  version(workspaceId: string, id: string) {
    return this.versions
      .findOne({ _id: new Types.ObjectId(id), workspaceId: new Types.ObjectId(workspaceId) })
      .lean<CampaignVersion>()
      .exec();
  }
  updateDelivery(workspaceId: string, id: string, filter: object, update: object) {
    return this.deliveries
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), workspaceId: new Types.ObjectId(workspaceId), ...filter },
        update,
        { new: true },
      )
      .lean<Delivery>()
      .exec();
  }
  commandRun(workspaceId: string, id: string, status: string) {
    return this.runs
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          workspaceId: new Types.ObjectId(workspaceId),
          status: { $nin: ['completed', 'cancelled'] },
        },
        { $set: { status } },
        { new: true },
      )
      .lean<CampaignRun>()
      .exec();
  }
  async metric(workspaceId: string, runId: string, eventType: string, conversionEventId?: string) {
    return this.metrics
      .findOneAndUpdate(
        {
          workspaceId: new Types.ObjectId(workspaceId),
          campaignRunId: new Types.ObjectId(runId),
          eventType,
          conversionEventId: conversionEventId ?? null,
        },
        { $inc: { count: 1 } },
        { upsert: true, new: true },
      )
      .lean<CampaignMetric>()
      .exec();
  }
}
