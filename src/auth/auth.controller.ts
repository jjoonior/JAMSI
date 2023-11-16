import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('duplication-check/nickname/:nickname')
  async duplicationCheckNickname(@Param('nickname') nickname: string) {
    return this.authService.duplicationCheckNickname(nickname);
  }

  @Get('duplication-check/email/:email')
  async duplicationCheckEmail(@Param('email') email: string) {
    return this.authService.duplicationCheckEmail(email);
  }

  @Post('signup')
  async signup(
    @Body('nickname') nickname: string,
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('language') language: number,
    @Body('code') code: number,
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
