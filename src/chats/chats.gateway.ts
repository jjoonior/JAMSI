import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatsService } from './chats.service';
import { AuthService } from '../auth/auth.service';

@WebSocketGateway({
  namespace: 'chats',
})
export class ChatsGateway implements OnGatewayConnection {
  constructor(
    private readonly authService: AuthService,
    private readonly chatsService: ChatsService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(socket): Promise<any> {
    try {
      const { cookie } = socket.handshake.headers;

      if (!cookie) {
        throw new WsException('토근이 존재하지 않습니다.');
      }

      const accessToken = cookie.split(';')[0].trim().split('=')[1];
      const payload = this.authService.verifyToken(accessToken);
      socket.user = await this.authService.getUserByPayload(payload);

      await this.chatsService.addUserSocket(socket.user.id, socket.id);
    } catch (e) {
      socket.emit('disconnected', '유효하지 않은 토큰입니다.');
      socket.disconnect();
    }
  }
}
