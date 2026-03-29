import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getRequestSessionToken } from '../auth/auth.service';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { RecordMonitoringResultDto } from './dto/record-monitoring-result.dto';
import { UpdateTaskWorkflowDto } from './dto/update-task-workflow.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('summary')
  getSummary() {
    return this.tasksService.getSummary();
  }

  @Get('templates')
  getTemplates() {
    return this.tasksService.getTemplates();
  }

  @Post()
  createTask(@Body() body: CreateTaskDto, @Req() request: Request) {
    return this.tasksService.createTask(body, getRequestSessionToken(request));
  }

  @Post(':taskId/monitoring-result')
  recordMonitoringResult(
    @Param('taskId') taskId: string,
    @Body() body: RecordMonitoringResultDto,
    @Req() request: Request,
  ) {
    const sessionToken = getRequestSessionToken(request);
    return this.tasksService.recordMonitoringResult(taskId, body, sessionToken);
  }

  @Patch(':taskId/workflow-state')
  updateWorkflowState(
    @Param('taskId') taskId: string,
    @Body() body: UpdateTaskWorkflowDto,
    @Req() request: Request,
  ) {
    const sessionToken = getRequestSessionToken(request);
    return this.tasksService.updateWorkflowState(taskId, body.workflowState, sessionToken);
  }
}
