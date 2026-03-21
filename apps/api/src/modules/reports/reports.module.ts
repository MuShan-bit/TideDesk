import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsService } from './reports.service';

@Module({
  imports: [PrismaModule],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
