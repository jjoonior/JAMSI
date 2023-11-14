import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../users/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userEntityRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async duplicationCheckNickname(nickname: string) {
    if (!!(await this.userEntityRepository.findOneBy({ nickname }))) {
      throw new HttpException(
        '이미 존재하는 닉네임입니다.',
        HttpStatus.CONFLICT,
      );
    }
  }

  async duplicationCheckEmail(email: string) {
    if (!!(await this.userEntityRepository.findOneBy({ email }))) {
      throw new HttpException(
        '이미 존재하는 이메일입니다.',
        HttpStatus.CONFLICT,
      );
    }
  }

  signToken(user: UserEntity, isRefreshToken: boolean) {
    const payload = {
      id: user.id,
      email: user.email,
      language: user.language,
      type: isRefreshToken ? 'refresh' : 'access',
    };

    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: isRefreshToken ? 3600 : 300,
    });
  }

  async signup(
    nickname: string,
    email: string,
    password: string,
    language: number,
    code: number,
  ) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // todo language enum 처리

    // todo 이메일 인증코드 재확인

    // 중복체크
    await this.duplicationCheckNickname(nickname);
    await this.duplicationCheckEmail(email);

    const newUserObject = await this.userEntityRepository.create({
      nickname,
      email,
      password: hashedPassword,
      language,
    });
    const newUser = await this.userEntityRepository.save(newUserObject);

    const accessToken = this.signToken(newUser, false);
    const refreshToken = this.signToken(newUser, true);

    return { accessToken, refreshToken };
  }

  async login(email: string, password: string) {
    const user = await this.userEntityRepository.findOneBy({ email });

    if (!user) {
      throw new UnauthorizedException('존재하지 않는 사용자입니다.');
    }

    const checkPassword = await bcrypt.compare(password, user.password);

    if (!checkPassword) {
      throw new UnauthorizedException('비밀번호가 틀렸습니다.');
    }

    const accessToken = this.signToken(user, false);
    const refreshToken = this.signToken(user, true);

    return { accessToken, refreshToken };
  }
}
