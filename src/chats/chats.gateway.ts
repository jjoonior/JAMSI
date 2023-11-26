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
}
