import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CrmModule } from '../crm/crm.module.js';
import { ContactsController } from './controllers/contacts.controller.js';
import { ContactsRepository } from './repositories/contacts.repository.js';
import { Contact, ContactSchema } from './schemas/contact.schema.js';
import { ContactsService } from './services/contacts.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Contact.name, schema: ContactSchema }]), CrmModule],
  controllers: [ContactsController],
  providers: [ContactsRepository, ContactsService],
  exports: [ContactsRepository],
})
export class ContactsModule {}
