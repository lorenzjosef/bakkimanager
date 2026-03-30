import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AUTH_ROUTES } from '../../contracts';
import { Public } from '../../common/decorators';
import {
  applyDesktopSessionClearResponse,
  applyDesktopSessionResponse,
  AuthService,
  BAKKI_SESSION_COOKIE,
  getRequestSessionToken,
} from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ login: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @Post(AUTH_ROUTES.login.replace('/auth/', ''))
  async login(
    @Body() body: LoginRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookieToken = this.authService.createCookieToken();
    const payload = await this.authService.login(body.username, body.password, cookieToken);
    response.cookie(BAKKI_SESSION_COOKIE, cookieToken, this.authService.createSessionCookie());
    applyDesktopSessionResponse(request, response, cookieToken);
    return payload;
  }

  @Public()
  @Get(AUTH_ROUTES.session.replace('/auth/', ''))
  async getSession(@Req() request: Request) {
    return this.authService.getSession(getRequestSessionToken(request));
  }

  @Post(AUTH_ROUTES.refresh.replace('/auth/', ''))
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const sessionToken = getRequestSessionToken(request);
    const payload = await this.authService.refresh(sessionToken);
    if (sessionToken) {
      response.cookie(BAKKI_SESSION_COOKIE, sessionToken, this.authService.createSessionCookie());
      applyDesktopSessionResponse(request, response, sessionToken);
    }
    return payload;
  }

  @Post(AUTH_ROUTES.logout.replace('/auth/', ''))
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const sessionToken = getRequestSessionToken(request);
    response.clearCookie(BAKKI_SESSION_COOKIE, { path: '/' });
    applyDesktopSessionClearResponse(request, response);
    return this.authService.logout(sessionToken);
  }

  @Post(AUTH_ROUTES.resetUserPassword.replace('/auth/', ''))
  async resetUserPassword(@Body() body: ResetUserPasswordDto, @Req() request: Request) {
    const sessionToken = getRequestSessionToken(request);
    if (!sessionToken) {
      throw new UnauthorizedException('No active session');
    }

    return this.authService.resetUserPassword(body.targetUserId, body.reason, sessionToken);
  }
}
