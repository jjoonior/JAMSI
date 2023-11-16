import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomEntity } from './room.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([RoomEntity]), AuthModule],
  controllers: [ChatsController],
  providers: [ChatsService],
})
export class ChatsModule {}
