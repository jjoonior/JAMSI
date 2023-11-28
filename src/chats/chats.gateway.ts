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

@WebSocketGateway({
  namespace: 'chats',
})
export class ChatsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Namespace;

  inChatUserMap = {};
  userSocketMap = {};

  constructor(
    private readonly authService: AuthService,
    private readonly chatsService: ChatsService,
  ) {}

  async handleConnection(socket): Promise<any> {
    try {
      const { cookie } = socket.handshake.headers;
      if (!cookie) {
        throw new WsException('토근이 존재하지 않습니다.');
      }

      const accessToken = cookie.split(';')[0].trim().split('=')[1];
      const payload = this.authService.verifyToken(accessToken);
      socket.user = await this.authService.getUserByPayload(payload);

      await this.chatsService.addUserSocket(
        this.userSocketMap,
        socket.user.id,
        socket.id,
      );
    } catch (e) {
      socket.emit('disconnected', '유효하지 않은 토큰입니다.');
      socket.disconnect();
    }
  }

  /**
   * 채팅방 생성 시 현재 소켓은 채팅방에 접속 유저로 설정
   * 유저의 모든 소켓(다른 기기)은 새로 만든 채팅방을 join
   * 모든 소켓에게 채팅방 생성을 알림
   */
  @SubscribeMessage('create_room')
  async createRoom(@ConnectedSocket() socket) {
    const newRoom = await this.chatsService.createRoom(socket.user);

    await this.chatsService.addInChatUser(
      this.inChatUserMap,
      socket,
      newRoom.id,
    );

    const userSockets = this.userSocketMap[socket.user.id];
    userSockets.forEach((socketId) => {
      const s = this.server.sockets.get(socketId);
      s.join(newRoom.id.toString());
      s.emit('create_room', '새로운 채팅방이 생성되었습니다.');
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
  @SubscribeMessage('join')
  async joinRoom(
    @MessageBody() dto: { roomId: number },
    @ConnectedSocket() socket,
  ) {
    const room = await this.chatsService.getRoomById(dto.roomId);
    if (!room) {
      throw new WsException('존재하지 않는 채팅방입니다.');
    }

    await this.chatsService.addRoomUser(room, socket.user);

    await this.chatsService.addInChatUser(this.inChatUserMap, socket, room.id);

    // todo 이전 채팅 내역 조회
    const messages = [];

    // todo 마지막에 한번만 save하면 트랜잭션 처리로 볼 수 있곘는데
    await this.chatsService.updateRoomTitle(room);

    const userSockets = this.userSocketMap[socket.user.id];
    userSockets.forEach((socketId) => {
      const s = this.server.sockets.get(socketId);
      s.join(room.id.toString());
    });

    // todo 채팅방의 다른 유저들에게도 입장을 알려야함 (유저 수 변동)
    const data = {
      info: `${socket.user.nickname}님이 들어왔습니다.`,
      id: room.id,
      title: room.title,
      users: room.users.map((user) => ({
        id: user.id,
        nickname: user.nickname,
      })),
      messages,
    };
    this.server.in(room.id.toString()).emit('join', data);
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
  @SubscribeMessage('leave')
  async leaveRoom(
    @MessageBody() dto: { roomId: number },
    @ConnectedSocket() socket,
  ) {
    const room = await this.chatsService.getRoomById(dto.roomId);
    if (!room) {
      throw new WsException('존재하지 않는 채팅방입니다.');
    }

    await this.chatsService.delRoomUser(room, socket.user);

    await this.chatsService.delInChatUser(this.inChatUserMap, socket, room.id);

    // todo 마지막에 한번만 save하면 트랜잭션 처리로 볼 수 있곘는데
    await this.chatsService.updateRoomTitle(room);

    const data = {
      info: `${socket.user.nickname}님이 나갔습니다.`,
      id: room.id,
      title: room.title,
      users: room.users.map((user) => ({
        id: user.id,
        nickname: user.nickname,
      })),
    };
    this.server.in(room.id.toString()).emit('leave', data);

    const userSockets = this.userSocketMap[socket.user.id];
    userSockets.forEach((socketId) => {
      const s = this.server.sockets.get(socketId);
      s.leave(room.id.toString());
    });
  }

  /**
   * 채팅방 입장 처리 (inChatUser 등록)
   * 채팅방 정보와 이전 채팅 내역 emit
   */
  @SubscribeMessage('on')
  async onChat(
    @MessageBody() dto: { roomId: number },
    @ConnectedSocket() socket,
  ) {
    const room = await this.chatsService.getRoomById(dto.roomId);
    if (!room) {
      throw new WsException('존재하지 않는 채팅방입니다.');
    }

    const exist = await this.chatsService.isExistRoomUser(room, socket.user);
    if (!exist) {
      throw new WsException('채팅방을 찾을 수 없습니다.');
    }

    await this.chatsService.addInChatUser(this.inChatUserMap, socket, room.id);

    // todo 이전 채팅 내역 조회
    const messages = [];

    const data = {
      id: room.id,
      title: room.title,
      users: room.users.map((user) => ({
        id: user.id,
        nickname: user.nickname,
      })),
      messages,
    };
    socket.emit('on', data);
  }

  /**
   * 채팅방 off 처리 (inChatUser 삭제)
   * 따로 emit할 정보 없음
   */
  @SubscribeMessage('off')
  async offChat(
    @MessageBody() dto: { roomId: number },
    @ConnectedSocket() socket,
  ) {
    const room = await this.chatsService.getRoomById(dto.roomId);
    if (!room) {
      throw new WsException('존재하지 않는 채팅방입니다.');
    }

    const exist = await this.chatsService.isExistRoomUser(room, socket.user);
    if (!exist) {
      throw new WsException('채팅방을 찾을 수 없습니다.');
    }

    await this.chatsService.delInChatUser(this.inChatUserMap, socket, room.id);

    // const data = {};
    // socket.emit('off', data);
  }

  /**
   * 유저가 참여중인 채팅방 리스트 조회
   * 조회시 채팅방마다 참여중인 유저 리스트와 마지막 메시지 내용 및 시간을 가져옴
   * 해당 room에 join 안된 소켓은 join
   * 채팅방 개수와 채팅방 리스트 emit
   */
  @SubscribeMessage('rooms')
  async getRoomList(@ConnectedSocket() socket: Socket) {
    // todo 채팅방마다 마지막 메시지 내용과 시간도 같이 조회
    const [roomList, roomCount] = await this.chatsService.getRoomListByUserId(
      socket['user'].id,
    );

    roomList.forEach((room: any) => {
      if (!socket.rooms.has(room.id.toString())) {
        socket.join(room.id.toString());
      }
    });

    const data = { roomCount, roomList };
    socket.emit('rooms', data);
  }
}
