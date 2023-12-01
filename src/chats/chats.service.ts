import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoomEntity } from '../entity/room.entity';
import { Repository } from 'typeorm';
import { UserEntity } from '../entity/user.entity';
import { MessageEntity } from '../entity/message.entity';
import { Language } from '../entity/enum/language.enum';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly roomEntityRepository: Repository<RoomEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageEntityRepository: Repository<MessageEntity>,
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
  async addUserSocket(userSocketMap: object, userId: string, socketId: string) {
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
  async addInChatUser(inChatUserMap: object, socket, roomId: number) {
    if (!(roomId in inChatUserMap)) {
      inChatUserMap[roomId] = {};
    }

    if (!(socket.user.id in inChatUserMap[roomId])) {
      inChatUserMap[roomId][socket.user.id] = new Set();
    }

    inChatUserMap[roomId][socket.user.id].add(socket.id);
  }

  async delInChatUser(inChatUserMap: object, socket, roomId: number) {
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

  // todo 언어 컬럼 추가 / 번역본 저장 테이블 OneToMany
  async createMessage(
    user: UserEntity,
    room: RoomEntity,
    content: string,
    language: Language,
  ) {
    return this.messageEntityRepository
      .create({
        user,
        room,
        content,
        language,
      })
      .save();
  }

  async getMessageHistory(
    roomId: number,
    language: Language,
    messageId: number,
    limit: number,
  ) {
    const query = this.messageEntityRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'u')
      .leftJoinAndSelect(
        'm.translatedMessages',
        'tm',
        'tm.language= :language',
        {
          language,
        },
      )
      .where('m.roomId = :roomId', { roomId })
      .orderBy('m.createdAt', 'DESC')
      .limit(limit);

    if (messageId) {
      query.andWhere('m.id < :messageId', { messageId });
    }

    const messages = await query.getMany();

    return messages.map((message) => ({
      userId: message.user.id,
      userNickname: message.user.nickname,
      messageId: message.id,
      message: {
        languages: message.language,
        content: message.content,
      },
      translatedMessage: {
        language: message.translatedMessages[0]?.language || null,
        content: message.translatedMessages[0]?.content || null,
      },
      createdAt: message.createdAt,
    }));
  }
}
