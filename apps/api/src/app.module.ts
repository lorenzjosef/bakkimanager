import { Module } from '@nestjs/common';
import { BakkiCoreModule } from './bakki-core/bakki-core.module';
import { OdooModule } from './odoo/odoo.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { MapModule } from './modules/map/map.module';
import { MediaModule } from './modules/media/media.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { PhasesModule } from './modules/phases/phases.module';
import { SpeciesModule } from './modules/species/species.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
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
    PhasesModule,
    TasksModule,
    MediaModule,
  ],
})
export class AppModule {}
