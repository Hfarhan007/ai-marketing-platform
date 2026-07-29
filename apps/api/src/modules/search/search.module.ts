import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module.js';
import { FilterCompiler } from './filter-compiler.service.js';
import { SearchController } from './search.controller.js';
import { SearchMetrics } from './search-metrics.service.js';
import { SearchService } from './search.service.js';
@Module({
  imports: [PermissionsModule],
  controllers: [SearchController],
  providers: [FilterCompiler, SearchMetrics, SearchService],
  exports: [FilterCompiler, SearchService],
})
export class SearchModule {}
