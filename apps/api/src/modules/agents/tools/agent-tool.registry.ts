import { BadRequestException, Injectable } from '@nestjs/common';
import type { AgentToolDefinition } from './agent-tool.types.js';
@Injectable()
export class AgentToolRegistry {
  private readonly tools = new Map<string, AgentToolDefinition>();
  register(tool: AgentToolDefinition) {
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
