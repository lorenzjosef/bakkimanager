import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TreeSurveysController } from './tree-surveys.controller';
import { TreeSurveysService } from './tree-surveys.service';

@Module({
  imports: [AuthModule],
  controllers: [TreeSurveysController],
  providers: [TreeSurveysService],
  exports: [TreeSurveysService],
})
export class TreeSurveysModule {}
