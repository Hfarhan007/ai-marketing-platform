import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type mongo } from 'mongoose';
import {
  NotificationDefinition,
  NotificationDeliveryAttempt,
  NotificationDeliveryRequest,
  NotificationPreference,
  NotificationSuppression,
  NotificationTemplate,
} from '../schemas/notification.schemas.js';
@Injectable()
export class NotificationRepository {
  constructor(
    @InjectModel(NotificationDefinition.name)
    private readonly definitions: Model<NotificationDefinition>,
    @InjectModel(NotificationPreference.name)
    private readonly preferences: Model<NotificationPreference>,
    @InjectModel(NotificationTemplate.name) private readonly templates: Model<NotificationTemplate>,
    @InjectModel(NotificationDeliveryRequest.name)
    private readonly requests: Model<NotificationDeliveryRequest>,
    @InjectModel(NotificationDeliveryAttempt.name)
    private readonly attempts: Model<NotificationDeliveryAttempt>,
    @InjectModel(NotificationSuppression.name)
    private readonly suppressions: Model<NotificationSuppression>,
  ) {}
  definition(workspaceId: string, key: string) {
    return this.definitions
      .findOne({ workspaceId: new Types.ObjectId(workspaceId), key, active: true })
      .lean<NotificationDefinition>()
      .exec();
  }
  preference(workspaceId: string, userId: string, key: string) {
    return this.preferences
      .findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        userId: new Types.ObjectId(userId),
        definitionKey: key,
      })
      .lean<NotificationPreference>()
      .exec();
  }
  async template(workspaceId: string, key: string, channel: string, locale: string) {
    return this.templates
      .findOne({
        workspaceId: new Types.ObjectId(workspaceId),
        definitionKey: key,
        channel,
        locale: { $in: [locale, 'en'] },
      })
      .sort({ locale: locale === 'en' ? 1 : -1 })
      .lean<NotificationTemplate>()
      .exec();
  }
  suppressed(workspaceId: string, channel: string, destination: string, key: string) {
    return this.suppressions.exists({
      workspaceId: new Types.ObjectId(workspaceId),
      channel,
      destination,
      definitionKey: { $in: [key, '*'] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });
  }
  async reserve(input: Record<string, unknown>) {
    try {
      return { value: (await this.requests.create(input)).toObject(), duplicate: false };
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const value = await this.requests
          .findOne({
            workspaceId: input.workspaceId,
            deduplicationKey: input.deduplicationKey,
            channel: input.channel,
            destination: input.destination,
          } as mongo.Filter<NotificationDeliveryRequest>)
          .lean<NotificationDeliveryRequest>()
          .exec();
        if (value) return { value, duplicate: true };
      }
      throw error;
    }
  }
  claim(id: string) {
    return this.requests
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          status: { $in: ['queued', 'deferred'] },
          deliverAt: { $lte: new Date() },
        },
        { $set: { status: 'sending' }, $inc: { attempts: 1 } },
        { new: true },
      )
      .lean<NotificationDeliveryRequest>()
      .exec();
  }
  update(id: string, update: Record<string, unknown>) {
    return this.requests.updateOne({ _id: new Types.ObjectId(id) }, update);
  }
  attempt(input: Record<string, unknown>) {
    return this.attempts.create(input);
  }
  dueDigests(limit = 100) {
    return this.requests
      .find({ status: 'digest_pending', deliverAt: { $lte: new Date() } })
      .limit(limit)
      .lean<NotificationDeliveryRequest[]>()
      .exec();
  }
  releaseDigest(id: string) {
    return this.requests.updateOne(
      { _id: new Types.ObjectId(id), status: 'digest_pending' },
      { $set: { status: 'queued' } },
    );
  }
}
