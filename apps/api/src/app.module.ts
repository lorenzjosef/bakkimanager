import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BakkiCoreModule } from './bakki-core/bakki-core.module';
import { OdooModule } from './odoo/odoo.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { MapModule } from './modules/map/map.module';
import { MediaModule } from './modules/media/media.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { PhasesModule } from './modules/phases/phases.module';
import { SpeciesModule } from './modules/species/species.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { SessionAuthGuard, RolesGuard } from './common/guards';

@Module({
  imports: [
    // Rate limiting: 100 requests per minute default, stricter limits on auth endpoints
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'login',
        ttl: 60000,
        limit: 5,
      },
    ]),
    BakkiCoreModule,
    OdooModule,
    HealthModule,
    AuditModule,
    AuthModule,
    DashboardModule,
    ContractsModule,
    UsersModule,
    SpeciesModule,
    MapModule,
    MobileModule,
    PhasesModule,
    TasksModule,
    MediaModule,
  ],
  providers: [
    // Global rate limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global authentication - all routes require auth unless marked @Public()
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard,
    },
    // Global role-based authorization
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
