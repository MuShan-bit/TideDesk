import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { ArchivesModule } from '../archives/archives.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { PostClassificationService } from './post-classification.service';
import { PostClassificationTaskService } from './post-classification-task.service';

@Module({
  imports: [PrismaModule, ArchivesModule, TaxonomyModule, AiGatewayModule],
  providers: [PostClassificationService, PostClassificationTaskService],
  exports: [PostClassificationService, PostClassificationTaskService],
})
export class AiClassificationModule {}
