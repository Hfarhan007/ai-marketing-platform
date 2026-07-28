import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { zonedParts } from '../../scheduling/time.js';
import type { CampaignChannel, CampaignVariant } from '../types/campaign.types.js';
export interface ConsentContact {
  communicationPreferences: Record<string, boolean>;
  consentSummary: Record<string, string | boolean>;
}
@Injectable()
export class CampaignPolicyService {
  isConsented(contact: ConsentContact, channel: CampaignChannel) {
    return (
      contact.communicationPreferences[channel] !== false &&
      contact.consentSummary[channel] === true
    );
  }
  assignVariant(contactId: string, variants: CampaignVariant[]) {
    const total = variants.reduce((sum, v) => sum + v.weight, 0);
    if (total <= 0) throw new Error('Variant weights must be positive');
    const bucket =
      parseInt(createHash('sha256').update(contactId).digest('hex').slice(0, 8), 16) % total;
    let cursor = 0;
    for (const variant of variants) {
      cursor += variant.weight;
      if (bucket < cursor) return variant;
    }
    return variants.at(-1)!;
  }
  nextDelivery(now: Date, timezone: string, quiet: { startMinutes: number; endMinutes: number }) {
    const local = zonedParts(now, timezone),
      inside =
        quiet.startMinutes <= quiet.endMinutes
          ? local.minutes >= quiet.startMinutes && local.minutes < quiet.endMinutes
          : local.minutes >= quiet.startMinutes || local.minutes < quiet.endMinutes;
    if (!inside) return now;
    const minutes =
      quiet.endMinutes -
      local.minutes +
      (quiet.startMinutes > quiet.endMinutes && local.minutes >= quiet.startMinutes ? 1440 : 0);
    return new Date(now.valueOf() + Math.max(1, minutes) * 60_000);
  }
  personalize(template: string, values: Record<string, string>, defaults: Record<string, string>) {
    return template.replace(
      /\{\{\s*([\w.]+)\s*\}\}/gu,
      (_match: string, key: string) => values[key] ?? defaults[key] ?? '',
    );
  }
}
