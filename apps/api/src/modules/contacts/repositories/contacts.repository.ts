import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrmRepository } from '../../crm/crm.repository.js';
import { Contact, type ContactDocument } from '../schemas/contact.schema.js';

@Injectable()
export class ContactsRepository extends CrmRepository<Contact> {
  constructor(@InjectModel(Contact.name) model: Model<ContactDocument>) {
    super(model, new Set(['createdAt', 'updatedAt', 'displayName', 'lifecycleStatus']));
  }
}
