import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoomEntity } from '../entity/room.entity';
import { Repository } from 'typeorm';
import { inChatUserMap, userSocketMap } from './wsStatusMap';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomEntity: Repository<RoomEntity>,
  ) {}

  async getRoomListByUserId(userId: string) {
    return await this.roomEntity.findAndCount({
      where: { users: { id: userId } },
    });
  }

  /**
   * 동일 유저에 대한 소켓들을 관리 (ex - 여러 기기 접속)
   */
  async addUserSocket(userId: string, socketId: string) {
    if (!(userId in userSocketMap)) {
      userSocketMap[userId] = [];
    }

    userSocketMap[userId].push(socketId);
  }
}
