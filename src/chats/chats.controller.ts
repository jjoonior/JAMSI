import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { AuthGuard } from '../auth/guard/auth.guard';

@Controller('rooms')
@UseGuards(AuthGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  async getRoomList(@Req() { user }) {
    const [roomList, roomCount] = await this.chatsService.getRoomListByUserId(
      user.id,
    );
    return { roomList, roomCount };
  }
}
