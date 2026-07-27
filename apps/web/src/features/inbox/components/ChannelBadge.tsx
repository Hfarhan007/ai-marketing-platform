import { Camera, Globe2, Mail, MessageCircle, MessagesSquare, Smartphone } from 'lucide-react';
import { Badge } from '@/shared/ui';
import type { Channel } from '../types/inbox.types';

const config = {
  email: { icon: Mail, label: 'Email' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp' },
  sms: { icon: Smartphone, label: 'SMS' },
  facebook: { icon: MessagesSquare, label: 'Messenger' },
  instagram: { icon: Camera, label: 'Instagram' },
  website: { icon: Globe2, label: 'Website Chat' },
} satisfies Record<Channel, { icon: typeof Mail; label: string }>;

export function ChannelBadge({ channel, compact = false }: { channel: Channel; compact?: boolean }) {
  const { icon: Icon, label } = config[channel];
  return <Badge aria-label={label} className="gap-1" tone="neutral"><Icon size={12} />{compact ? <span className="sr-only">{label}</span> : label}</Badge>;
}
