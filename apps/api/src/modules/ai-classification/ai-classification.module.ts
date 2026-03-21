import { Module } from '@nestjs/common';
import { PostClassificationService } from './post-classification.service';

@Module({
  providers: [PostClassificationService],
  exports: [PostClassificationService],
})
export class AiClassificationModule {}
