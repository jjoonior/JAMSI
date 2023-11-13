import { Controller, Get, Param } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('/duplication-check/nickname/:nickname')
  async duplicationCheckNickname(@Param('nickname') nickname: string) {
    return this.authService.duplicationCheckNickname(nickname);
  }

  @Get('/duplication-check/email/:email')
  async duplicationCheckEmail(@Param('email') email: string) {
    return this.authService.duplicationCheckEmail(email);
  }
}
