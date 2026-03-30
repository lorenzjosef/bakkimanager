import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { UserRoleDesignation } from '@bakki/domain';
import { OwnerOnly } from '../../common/decorators';
import { getRequestSessionToken } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async listUsers() {
    return {
      users: await this.usersService.listUsers(),
    };
  }

  @Get('management')
  getManagementData(@Query('role') role?: UserRoleDesignation) {
    return this.usersService.getManagementData(role);
  }

  @Get('permissions-panel')
  getPermissionsPanel(@Query('role') role?: UserRoleDesignation) {
    return this.usersService.getPermissionsPanel(role);
  }

  @OwnerOnly()
  @Post()
  createUser(@Body() body: CreateUserDto, @Req() request: Request) {
    return this.usersService.createUser(body, getRequestSessionToken(request));
  }

  @OwnerOnly()
  @Patch(':id/status')
  updateUserStatus(
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
    @Req() request: Request,
  ) {
    return this.usersService.updateUserStatus(id, body.active, getRequestSessionToken(request));
  }
}
