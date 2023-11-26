import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomEntity } from '../entity/room.entity';
import { AuthModule } from '../auth/auth.module';
import { ChatsGateway } from './chats.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([RoomEntity]), AuthModule],
  controllers: [ChatsController],
  providers: [ChatsGateway, ChatsService],
})
export class ChatsModule {}
