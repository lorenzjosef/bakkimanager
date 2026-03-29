import { Module } from '@nestjs/common';
import { OdooModule } from '../../odoo/odoo.module';
import { AuthModule } from '../auth/auth.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { MediaModule } from '../media/media.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { OdooTaskSyncService } from './odoo-task-sync.service';

@Module({
  imports: [OdooModule, AuthModule, DashboardModule, MediaModule, TasksModule, UsersModule],
  controllers: [HealthController],
  providers: [HealthService, OdooTaskSyncService],
})
export class HealthModule {}
