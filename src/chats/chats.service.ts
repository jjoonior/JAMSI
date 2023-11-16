import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoomEntity } from './room.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomEntity: Repository<RoomEntity>,
  ) {}

  async getRoomList() {
    return await this.roomEntity.find();
  }
}
