import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoomEntity } from '../entity/room.entity';
import { Repository } from 'typeorm';
import { UserEntity } from '../entity/user.entity';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomEntityRepository: Repository<RoomEntity>,
  ) {}

  async getRoomListByUserId(userId: string) {
    return await this.roomEntityRepository.findAndCount({
      select: {
        id: true,
        title: true,
        users: {
          id: true,
          nickname: true,
        },
      },
      relations: { users: true },
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
    return await this.roomEntityRepository
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
      inChatUserMap[roomId][socket.user.id] = new Set();
    }

    inChatUserMap[roomId][socket.user.id].add(socket.id);
  }

  async delInChatUser(inChatUserMap, socket, roomId) {
    if (!(roomId in inChatUserMap)) {
      return;
    }

    if (!(socket.user.id in inChatUserMap[roomId])) {
      return;
    }

    const userSocketList = inChatUserMap[roomId][socket.user.id];
    userSocketList.delete(socket.id);

    if (userSocketList.size === 0) {
      delete inChatUserMap[roomId][socket.user.id];
    }
  }

  async getRoomById(roomId: number) {
    return await this.roomEntityRepository.findOne({
      where: { id: roomId },
      relations: { users: true },
    });
  }

  async isExistRoomUser(room: RoomEntity, user: UserEntity) {
    return room.users.some((roomUser) => roomUser.id === user.id);
  }

  async addRoomUser(room: RoomEntity, user: UserEntity) {
    const exist = await this.isExistRoomUser(room, user);
    if (!exist) {
      room.users.push(user);
    }
    return this.roomEntityRepository.save(room);
  }

  async delRoomUser(room: RoomEntity, user: UserEntity) {
    room.users = room.users.filter((roomUser) => roomUser.id !== user.id);
    return this.roomEntityRepository.save(room);
  }

  async updateRoomTitle(room: RoomEntity) {
    const users = room.users.map((user) => user.nickname);
    room.title = Array.from(new Set(users)).join(', ');
    return this.roomEntityRepository.save(room);
  }
}
