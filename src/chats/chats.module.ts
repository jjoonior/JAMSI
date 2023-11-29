import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomEntity } from '../entity/room.entity';
import { AuthModule } from '../auth/auth.module';
import { ChatsGateway } from './chats.gateway';
import { MessageEntity } from '../entity/message.entity';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoomEntity, MessageEntity]),
    AuthModule,
    TranslationModule,
  ],
  controllers: [ChatsController],
  providers: [ChatsGateway, ChatsService],
})
export class ChatsModule {}
