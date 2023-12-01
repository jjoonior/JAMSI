import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { ChatsService } from './chats.service';
import { AuthService } from '../auth/auth.service';
import { EventName } from '../entity/enum/eventName.enum';
import { TranslationService } from '../translation/translation.service';
import { RoomEntity } from '../entity/room.entity';
import { UserEntity } from '../entity/user.entity';
import { MessageEntity } from '../entity/message.entity';
import { Language } from '../entity/enum/language.enum';

@WebSocketGateway({
  namespace: 'chats',
})
export class ChatsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Namespace;

  userSocketMap = {};

  constructor(
    private readonly authService: AuthService,
    private readonly chatsService: ChatsService,
    private readonly translationService: TranslationService,
  ) {}

  async handleConnection(socket: Socket): Promise<any> {
    try {
      const { cookie } = socket.handshake.headers;
      if (!cookie) {
        throw new WsException('토큰이 존재하지 않습니다.');
      }

      const accessToken: string = cookie.split(';')[0].trim().split('=')[1];
      const payload = this.authService.verifyToken(accessToken);
      // todo Socket 타입을 지정하면서 체인 형태로 user 정보를 담으려면 socket.data에 저장해야함
      socket.data.user = await this.authService.getUserByPayload(payload);

      await this.chatsService.addUserSocket(
        this.userSocketMap,
        socket.data.user.id,
        socket.id,
      );
    } catch (e) {
      // todo 필터때문에 disconnected 이벤트 쓸 일 없을듯 - 쓸거면 enum으로
      // todo 연결 끊긴 경우 이벤트 관리 - inChatUser, userSocket 에서 삭제
      socket.emit('disconnected', '유효하지 않은 토큰입니다.');
      socket.disconnect();
    }
  }

  /**
   * 채팅방 생성 시 현재 소켓은 채팅방에 접속 유저로 설정
   * 유저의 모든 소켓(다른 기기)은 새로 만든 채팅방을 join
   * 모든 소켓에게 채팅방 생성을 알림
   */
  @SubscribeMessage(EventName.CREATE)
  async createRoom(@ConnectedSocket() socket: Socket) {
    const newRoom: RoomEntity = await this.chatsService.createRoom(
      socket.data.user,
    );

    const data = {
      info: `${socket.data.user.nickname}님이 채팅방을 생성했습니다.`,
      roomId: newRoom.id,
      title: newRoom.title,
      users: newRoom.users.map((user: UserEntity) => ({
        id: user.id,
        nickname: user.nickname,
      })),
    };

    const userSockets = this.userSocketMap[socket.data.user.id];
    userSockets.forEach((socketId: string) => {
      const s: Socket = this.server.sockets.get(socketId);
      s.join(newRoom.id.toString());
      s.emit(EventName.CREATE, data);
    });
  }

  /**
   * 채팅방 참여 유저에 현재 유저 추가
   * 채팅방 입장 처리
   * 최근 채팅 내역 조회
   *  참여 전 채팅에 대한 번역은 x, 유저 언어에 해당하는 번역본이 있을떄만 반환
   * 유저 이름을 추가하여 채팅방 유저 이름이 나열된 title로 수정
   * 채팅방 참여자 목록 반환
   * 유저 모든 소켓이 해당 방을 join
   * 현재 유저의 모든 소켓에 해당 방을 join했다고 위 반환 정보와 함꼐 알림
   * 채팅방의 다른 유저들에게도 입장을 알려야함 (유저 수 변동)
   */
  @SubscribeMessage(EventName.JOIN)
  async joinRoom(
    @MessageBody() dto: { roomId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const room: RoomEntity = await this.chatsService.getRoomById(dto.roomId);
    if (!room) {
      throw new WsException('존재하지 않는 채팅방입니다.');
    }

    await this.chatsService.addRoomUser(room, socket.data.user);

    const limit = 25;
    const messages = await this.chatsService.getMessageHistory(
      room.id,
      socket.data.user.language,
      limit,
    );

    // todo 마지막에 한번만 save하면 트랜잭션 처리로 볼 수 있곘는데
    await this.chatsService.updateRoomTitle(room);

    const userSockets = this.userSocketMap[socket.data.user.id];
    userSockets.forEach((socketId: string) => {
      const s: Socket = this.server.sockets.get(socketId);
      s.join(room.id.toString());
    });

    // todo 채팅방의 다른 유저들에게도 입장을 알려야함 (유저 수 변동)
    const data = {
      info: `${socket.data.user.nickname}님이 들어왔습니다.`,
      roomId: room.id,
      title: room.title,
      users: room.users.map((user: UserEntity) => ({
        id: user.id,
        nickname: user.nickname,
      })),
      hasMore: limit === messages.length,
      messages,
    };
    this.server.in(room.id.toString()).emit(EventName.JOIN, data);
  }

  /**
   * 채팅방 참여 유저에 현재 유저 삭제
   * 채팅방 퇴장 처리
   * 유저 이름이 삭제된 title로 수정
   * 채팅방 참여자 목록 반환
   * 유저 모든 소켓이 해당 방을 leave
   * 모든 소켓에 해당 방을 leave했다고 위 반환 정보와 함꼐 알림
   * 다른 유저들에게 유저 퇴장과 바뀐 참여자 수 알림
   */
  @SubscribeMessage(EventName.LEAVE)
  async leaveRoom(
    @MessageBody() dto: { roomId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const room: RoomEntity = await this.chatsService.getRoomById(dto.roomId);
    if (!room) {
      throw new WsException('존재하지 않는 채팅방입니다.');
    }

    await this.chatsService.delRoomUser(room, socket.data.user);

    // todo 마지막에 한번만 save하면 트랜잭션 처리로 볼 수 있곘는데
    await this.chatsService.updateRoomTitle(room);

    const data = {
      info: `${socket.data.user.nickname}님이 나갔습니다.`,
      roomId: room.id,
      title: room.title,
      users: room.users.map((user: UserEntity) => ({
        id: user.id,
        nickname: user.nickname,
      })),
    };
    this.server.in(room.id.toString()).emit(EventName.LEAVE, data);

    const userSockets = this.userSocketMap[socket.data.user.id];
    userSockets.forEach((socketId: string) => {
      const s: Socket = this.server.sockets.get(socketId);
      s.leave(room.id.toString());
    });
  }

  /**
   * 채팅방 입장 처리 (inChatUser 등록)
   * 채팅방 정보와 이전 채팅 내역 emit
   */
  @SubscribeMessage(EventName.ON)
  async onChat(
    @MessageBody() dto: { roomId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const room: RoomEntity = await this.chatsService.getRoomById(dto.roomId);
    if (!room) {
      throw new WsException('존재하지 않는 채팅방입니다.');
    }

    const exist: boolean = await this.chatsService.isExistRoomUser(
      room,
      socket.data.user,
    );
    if (!exist) {
      throw new WsException('채팅방을 찾을 수 없습니다.');
    }

    const limit = 25;
    const messages = await this.chatsService.getMessageHistory(
      room.id,
      socket.data.user.language,
      limit,
    );

    const data = {
      roomId: room.id,
      title: room.title,
      users: room.users.map((user: UserEntity) => ({
        id: user.id,
        nickname: user.nickname,
      })),
      hasMore: limit === messages.length,
      messages,
    };
    socket.emit(EventName.ON, data);
  }

  /**
   * 유저가 참여중인 채팅방 리스트 조회
   * 조회시 채팅방마다 참여중인 유저 리스트와 마지막 메시지 내용 및 시간을 가져옴
   * 해당 room에 join 안된 소켓은 join
   * 채팅방 개수와 채팅방 리스트 emit
   */
  @SubscribeMessage(EventName.ROOMS)
  async getRoomList(@ConnectedSocket() socket: Socket) {
    // todo 채팅방마다 마지막 메시지 내용과 시간도 같이 조회
    const [roomList, roomCount] = await this.chatsService.getRoomListByUserId(
      socket.data.user.id,
    );

    roomList.forEach((room: any) => {
      if (!socket.rooms.has(room.id.toString())) {
        socket.join(room.id.toString());
      }
      // todo 쿼리에서 컬럼명 변경해서 가져오자
      room.roomId = room.id;
      delete room.id;
    });

    const data = { roomCount, roomList };
    socket.emit(EventName.ROOMS, data);
  }

  /**
   * 원본 메시지 객체 생성
   * 채팅방 유저들의 언어별 번역본 저장
   * 유저마다 모든 소켓에 유저 언어에 맞는 번역 메시지 전송
   */
  @SubscribeMessage(EventName.MESSAGE)
  async onMessage(
    @MessageBody() dto: { roomId: number; content: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const room: RoomEntity = await this.chatsService.getRoomById(dto.roomId);
    if (!room) {
      throw new WsException('존재하지 않는 채팅방입니다.');
    }

    const exist: boolean = await this.chatsService.isExistRoomUser(
      room,
      socket.data.user,
    );
    if (!exist) {
      throw new WsException('채팅방을 찾을 수 없습니다.');
    }

    const message: MessageEntity = await this.chatsService.createMessage(
      socket.data.user,
      room,
      dto.content,
      socket.data.user.language,
    );

    const languages: Set<Language> =
      await this.translationService.getRoomUserLanguage(room);
    const translatedMessageMap =
      await this.translationService.getTranslatedMessage(message, languages);

    room.users.forEach((user: UserEntity) => {
      const data = {
        roomId: room.id,
        userId: socket.data.user.id,
        userNickname: socket.data.user.nickname,
        messageId: message.id,
        message: {
          languages: message.language,
          content: message.content,
        },
        translatedMessage: {
          language: user.language,
          content:
            translatedMessageMap.get(user.language)?.content || message.content,
        },
        createdAt: message.createdAt,
      };

      const userSockets = this.userSocketMap[user.id] || [];
      userSockets.forEach((socketId: string) => {
        const s: Socket = this.server.sockets.get(socketId);
        s.emit(EventName.MESSAGE, data);
      });
    });
  }

  @SubscribeMessage(EventName.HISTORY)
  async getMessageHistory(
    @MessageBody() dto: { roomId: number; messageId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const room: RoomEntity = await this.chatsService.getRoomById(dto.roomId);
    if (!room) {
      throw new WsException('존재하지 않는 채팅방입니다.');
    }

    const exist: boolean = await this.chatsService.isExistRoomUser(
      room,
      socket.data.user,
    );
    if (!exist) {
      throw new WsException('채팅방을 찾을 수 없습니다.');
    }

    const limit = 25;
    const messages = await this.chatsService.getMessageHistory(
      room.id,
      socket.data.user.language,
      limit,
      dto.messageId,
    );

    const data = {
      roomId: room.id,
      hasMore: limit === messages.length,
      messages,
    };
    socket.emit(EventName.HISTORY, data);
  }
}
