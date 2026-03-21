import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportAggregationService } from './report-aggregation.service';
import { ReportsService } from './reports.service';

@Module({
  imports: [PrismaModule],
  providers: [ReportsService, ReportAggregationService],
  exports: [ReportsService, ReportAggregationService],
})
export class ReportsModule {}
