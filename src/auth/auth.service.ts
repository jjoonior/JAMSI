import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../users/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userEntityRepository: Repository<UserEntity>,
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
}
