import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoomEntity } from '../entity/room.entity';
import { Repository } from 'typeorm';
import { UserEntity } from '../entity/user.entity';

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
  async addUserSocket(userSocketMap, userId: string, socketId: string) {
    if (!(userId in userSocketMap)) {
      userSocketMap[userId] = [];
    }

    userSocketMap[userId].push(socketId);
  }

  async createRoom(user: UserEntity) {
    return await this.roomEntity
      .create({
        users: [user],
      })
      .save();
  }

  /**
   * 채팅방에 접속한 유저 관리
   */
  async addInChatUser(inChatUserMap, socket, roomId) {
    if (!(roomId in inChatUserMap)) {
      inChatUserMap[roomId] = {};
    }

    if (!(socket.user.id in inChatUserMap[roomId])) {
      inChatUserMap[roomId][socket.user.id] = [];
    }

    inChatUserMap[roomId][socket.user.id].push(socket.id);
  }
}
