import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [PhasesController],
  providers: [PhasesService],
})
export class PhasesModule {}
