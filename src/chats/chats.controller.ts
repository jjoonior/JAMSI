import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { AuthGuard } from '../auth/guard/auth.guard';

@Controller('rooms')
@UseGuards(AuthGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  async getRoomList(@Req() req) {
    console.log(req.user);
    return await this.chatsService.getRoomList();
  }
}
