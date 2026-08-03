import { BadRequestException, Injectable } from '@nestjs/common';
import type { AgentToolDefinition } from './agent-tool.types.js';
@Injectable()
export class AgentToolRegistry {
  private readonly tools = new Map<string, AgentToolDefinition>();
  register(tool: AgentToolDefinition) {
    if (!/^[a-z][a-z0-9_]{2,63}$/u.test(tool.name) || /(?:shell|exec|eval|code|database|sql|http|fetch)/iu.test(tool.name)) throw new Error(`Unsafe agent tool name ${tool.name}`);
    if (!/^\d+\.\d+\.\d+$/u.test(tool.version)) throw new Error(`Invalid agent tool version ${tool.version}`);
    if (!tool.requiredPermissions.length || !tool.allowedAgentTypes.length) throw new Error(`Incomplete security policy for ${tool.name}`);
    if (tool.risk !== 'read-only' && tool.idempotency !== 'generated') throw new Error(`Write tool ${tool.name} must generate idempotency keys`);
    if (this.tools.has(tool.name)) throw new Error(`Duplicate agent tool ${tool.name}`);
    this.tools.set(tool.name, tool);
  }
  get(name: string) {
    const tool = this.tools.get(name);
    if (!tool) throw new BadRequestException('Unknown or unavailable agent tool');
    return tool;
  }
  definitions(names: readonly string[]) {
    return names.map((name) => this.get(name));
  }
}
