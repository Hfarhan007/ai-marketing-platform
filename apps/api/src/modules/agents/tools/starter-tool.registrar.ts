import { Injectable, OnModuleInit } from '@nestjs/common';
import { AgentToolRegistry } from './agent-tool.registry.js';
import { starterTools } from './starter-tools.js';
import { StarterToolProvider } from './starter-tool.provider.js';

@Injectable()
export class StarterToolRegistrar implements OnModuleInit {
  constructor(private readonly registry: AgentToolRegistry, private readonly provider: StarterToolProvider) {}
  onModuleInit() {
    for (const tool of starterTools(this.provider)) this.registry.register(tool);
  }
}
