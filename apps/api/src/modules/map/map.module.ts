import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { MapController } from './map.controller';
import { MapService } from './map.service';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [MapController],
  providers: [MapService],
})
export class MapModule {}
