import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, getRequestSessionToken } from '../auth/auth.service';
import { MediaService } from './media.service';
import { CreateUploadIntentDto } from './dto/create-upload-intent.dto';
import { FinalizeUploadDto } from './dto/finalize-upload.dto';

@Controller('media')
export class MediaController {
  constructor(
    private readonly authService: AuthService,
    private readonly mediaService: MediaService,
  ) {}

  @Get('status')
  getUploadStatus() {
    return this.mediaService.getUploadStatus();
  }

  @Get('tasks/:taskId/photos')
  async listTaskPhotos(@Param('taskId') taskId: string, @Req() request: Request) {
    await this.authService.requireAuthenticatedSession(getRequestSessionToken(request));
    return this.mediaService.listTaskPhotos(taskId);
  }

  @Get('observations/:observationId/photos')
  async listObservationPhotos(@Param('observationId') observationId: string, @Req() request: Request) {
    await this.authService.requireAuthenticatedSession(getRequestSessionToken(request));
    return this.mediaService.listObservationPhotos(observationId);
  }

  @Post('tasks/:taskId/uploads')
  async createTaskUploadIntent(
    @Param('taskId') taskId: string,
    @Body() body: CreateUploadIntentDto,
    @Req() request: Request,
  ) {
    await this.authService.requireAuthenticatedSession(getRequestSessionToken(request));
    return this.mediaService.createTaskUploadIntent(taskId, body);
  }

  @Post('observations/:observationId/uploads')
  async createObservationUploadIntent(
    @Param('observationId') observationId: string,
    @Body() body: CreateUploadIntentDto,
    @Req() request: Request,
  ) {
    await this.authService.requireAuthenticatedSession(getRequestSessionToken(request));
    return this.mediaService.createObservationUploadIntent(observationId, body);
  }

  @Post('tasks/:taskId/photos')
  async finalizeTaskUpload(
    @Param('taskId') taskId: string,
    @Body() body: FinalizeUploadDto,
    @Req() request: Request,
  ) {
    await this.authService.requireAuthenticatedSession(getRequestSessionToken(request));
    return this.mediaService.finalizeTaskUpload(taskId, body);
  }

  @Post('observations/:observationId/photos')
  async finalizeObservationUpload(
    @Param('observationId') observationId: string,
    @Body() body: FinalizeUploadDto,
    @Req() request: Request,
  ) {
    await this.authService.requireAuthenticatedSession(getRequestSessionToken(request));
    return this.mediaService.finalizeObservationUpload(observationId, body);
  }
}
