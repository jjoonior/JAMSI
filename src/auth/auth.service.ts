import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entity/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as nodemailer from 'nodemailer';

const cookieOptions = {
  httpOnly: true,
  secure: true,
};

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userEntityRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.transporter = nodemailer.createTransport({
      service: process.env.MAIL_SERVICE,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

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

  private generateVerificationCode(): string {
    return (Math.floor(Math.random() * 900000) + 100000).toString();
  }

  async sendEmailCode(email: string) {
    const code = this.generateVerificationCode();

    const key = `emailCode:${email}`;
    await this.cacheManager.set(
      key,
      code,
      Number(process.env.MAIL_CODE_EXPIRE),
    );

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: '[JAMSI] 인증 코드',
      text: `인증코드: ${code}`,
    };
    this.transporter.sendMail(mailOptions);
  }

  async verifyEmailCode(email: string, code: string) {
    const key = `emailCode:${email}`;
    const storedCode = await this.cacheManager.get(key);
    if (storedCode !== code) {
      throw new HttpException(
        '인증코드가 일치하지 않습니다.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async signup(
    res,
    nickname: string,
    email: string,
    password: string,
    language: number,
    code: string,
  ) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // todo language enum 처리

    // todo 중복체크 로직 동시성 처리 필요
    await this.duplicationCheckNickname(nickname);
    await this.duplicationCheckEmail(email);
    await this.verifyEmailCode(email, code);

    const newUserObject = await this.userEntityRepository.create({
      nickname,
      email,
      password: hashedPassword,
      language,
    });
    const newUser = await this.userEntityRepository.save(newUserObject);

    await this.signToken(res, newUser);
  }

  async login(res, email: string, password: string) {
    const user = await this.userEntityRepository.findOneBy({ email });

    if (!user) {
      throw new UnauthorizedException('존재하지 않는 사용자입니다.');
    }

    const checkPassword = await bcrypt.compare(password, user.password);

    if (!checkPassword) {
      throw new UnauthorizedException('비밀번호가 틀렸습니다.');
    }

    await this.signToken(res, user);
  }

  async signToken(res, user) {
    const payload = {
      id: user.id,
      email: user.email,
      language: user.language,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: Number(process.env.JWT_ACCESS_EXPIRE),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: Number(process.env.JWT_REFRESH_EXPIRE),
    });

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, cookieOptions);

    await this.storeToken(user.id, accessToken, refreshToken);

    return payload;
  }

  async storeToken(id: string, accessToken: string, refreshToken: string) {
    const token = { accessToken, refreshToken };
    const key = `token:${id}`;
    await this.cacheManager.set(
      key,
      token,
      Number(process.env.JWT_REFRESH_EXPIRE),
    );
  }

  async getToken(id: string) {
    const key = `token:${id}`;
    const token = await this.cacheManager.get(key);
    if (token) {
      return {
        accessToken: token['accessToken'],
        refreshToken: token['refreshToken'],
      };
    } else {
      return null;
    }
  }

  verifyToken(token: string) {
    return this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET,
    });
  }

  async reissueToken(res, accessToken: string, refreshToken: string) {
    try {
      const payload = this.verifyToken(refreshToken);
      const token = await this.getToken(payload.id);
      if (
        token.accessToken !== accessToken ||
        token.refreshToken !== refreshToken
      ) {
        throw new Error();
      }
      return this.signToken(res, payload);
    } catch (e) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  async getUserByPayload(payload): Promise<UserEntity> {
    return await this.userEntityRepository.findOneBy({ id: payload.id });
  }
}
