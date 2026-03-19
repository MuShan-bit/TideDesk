import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { BindingsModule } from './modules/bindings/bindings.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { PrismaModule } from './modules/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['../../.env', '.env'],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    HealthModule,
    IdentityModule,
    BindingsModule,
  ],
})
export class AppModule {}
