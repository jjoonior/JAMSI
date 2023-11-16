import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const accessToken = req.cookies['accessToken'];
    const refreshToken = req.cookies['refreshToken'];

    if (!accessToken) {
      throw new UnauthorizedException('토큰이 없습니다.');
    }

    let payload;
    try {
      payload = this.authService.verifyToken(accessToken);
    } catch (e) {
      if (e.name === 'TokenExpiredError') {
        payload = await this.authService.reissueToken(
          res,
          accessToken,
          refreshToken,
        );
      } else {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }
    }

    req.user = {
      id: payload.id,
      email: payload.email,
      language: payload.language,
    };

    return true;
  }
}
