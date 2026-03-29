import { Module } from '@nestjs/common';
import { ContractsModule } from '../contracts/contracts.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardWeatherService } from './dashboard-weather.service';

@Module({
  imports: [ContractsModule],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardWeatherService],
  exports: [DashboardWeatherService],
})
export class DashboardModule {}
