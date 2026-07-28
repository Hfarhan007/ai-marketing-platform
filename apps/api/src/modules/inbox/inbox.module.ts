import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../../events/events.module.js';
import { CrmModule } from '../crm/crm.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { InboxController } from './controllers/inbox.controller.js';
import { InboxGateway } from './realtime/inbox.gateway.js';
import { InboxRealtimeService } from './realtime/inbox-realtime.service.js';
import { InboxRepository } from './repositories/inbox.repository.js';
import {
  ChannelConnection,
  ChannelConnectionSchema,
  Conversation,
  ConversationAssignment,
  ConversationAssignmentSchema,
  ConversationLabel,
  ConversationLabelSchema,
  ConversationSchema,
  Message,
  MessageSchema,
  MessageTemplate,
  MessageTemplateSchema,
  Participant,
  ParticipantSchema,
} from './schemas/inbox.schemas.js';
import { ContentSanitizerService } from './services/content-sanitizer.service.js';
import { InboxService, OUTBOUND_MESSAGES_QUEUE } from './services/inbox.service.js';
import { OutboundMessageProcessor } from './jobs/outbound-message.processor.js';
@Module({
  imports: [
    AuthModule,
    MembershipsModule,
    CrmModule,
    EventsModule,
    BullModule.registerQueue({ name: OUTBOUND_MESSAGES_QUEUE }),
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: ChannelConnection.name, schema: ChannelConnectionSchema },
      { name: MessageTemplate.name, schema: MessageTemplateSchema },
      { name: ConversationAssignment.name, schema: ConversationAssignmentSchema },
      { name: ConversationLabel.name, schema: ConversationLabelSchema },
    ]),
  ],
  controllers: [InboxController],
  providers: [
    InboxRepository,
    ContentSanitizerService,
    InboxRealtimeService,
    InboxService,
    InboxGateway,
    OutboundMessageProcessor,
  ],
  exports: [InboxService, InboxRealtimeService],
})
export class InboxModule {}
