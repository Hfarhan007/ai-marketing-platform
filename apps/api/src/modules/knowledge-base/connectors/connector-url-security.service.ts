import { BadRequestException, Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
@Injectable()
export class ConnectorUrlSecurityService {
  constructor(private readonly resolve: (hostname: string) => Promise<Array<{ address: string }>> = async (hostname) => lookup(hostname, { all: true })) {}
  async assertAllowed(value: string, allowedDomains: string[]) {
    let url: URL; try { url = new URL(value); } catch { throw new BadRequestException('Connector URL is invalid'); }
    if (url.protocol !== 'https:' || url.username || url.password || !allowedDomains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) throw new BadRequestException('Connector URL violates the domain allowlist');
    const addresses = isIP(url.hostname) ? [{ address: url.hostname }] : await this.resolve(url.hostname);
    if (!addresses.length || addresses.some(({ address }) => this.privateAddress(address))) throw new BadRequestException('Connector URL resolves to a prohibited network');
    return url;
  }
  private privateAddress(address: string) {
    const normalized = address.toLowerCase();
    if (normalized === '::1' || normalized === '::' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
    const parts = normalized.split('.').map(Number); if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
    const [a, b] = parts; return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b === 168) || a! >= 224;
  }
}
