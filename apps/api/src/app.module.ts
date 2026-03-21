import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { envValidationSchema } from './config/env.validation';
import { AiConfigModule } from './modules/ai-config/ai-config.module';
import { ArchivesModule } from './modules/archives/archives.module';
import { BindingsModule } from './modules/bindings/bindings.module';
import { CrawlJobsModule } from './modules/crawl-jobs/crawl-jobs.module';
import { CrawlRunsModule } from './modules/crawl-runs/crawl-runs.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['../../.env', '.env'],
      validationSchema: envValidationSchema,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    IdentityModule,
    AiConfigModule,
    ArchivesModule,
    BindingsModule,
    CrawlJobsModule,
    CrawlRunsModule,
    DashboardModule,
    TaxonomyModule,
  ],
})
export class AppModule {}
