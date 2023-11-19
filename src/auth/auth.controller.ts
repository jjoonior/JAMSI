import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('duplication-check')
  async duplicationCheck(
    @Query('nickname') nickname: string,
    @Query('email') email: string,
  ) {
    if (!!nickname) {
      await this.authService.duplicationCheckNickname(nickname);
    }
    if (!!email) {
      await this.authService.duplicationCheckEmail(email);
    }
  }

  @Get('send-code')
  async sendEmailCode(@Query('email') email: string) {
    this.authService.sendEmailCode(email);
  }

  @Post('verify-code')
  async verifyEmailCode(
    @Body('email') email: string,
    @Body('code') code: string,
  ) {
    await this.authService.verifyEmailCode(email, code);
  }

  @Post('signup')
  async signup(
    @Body('nickname') nickname: string,
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('language') language: number,
    @Body('code') code: string,
    @Res({ passthrough: true }) res,
  ) {
    return await this.authService.signup(
      res,
      nickname,
      email,
      password,
      language,
      code,
    );
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Res({ passthrough: true }) res,
  ) {
    return await this.authService.login(res, email, password);
  }
}
