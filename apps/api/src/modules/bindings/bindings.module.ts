import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { CrawlerModule } from '../crawler/crawler.module';
import { BindingsController } from './bindings.controller';
import { BindingsService } from './bindings.service';

@Module({
  imports: [CryptoModule, CrawlerModule],
  controllers: [BindingsController],
  providers: [BindingsService],
})
export class BindingsModule {}
