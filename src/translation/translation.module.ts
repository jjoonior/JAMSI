import { Module } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { TranslationController } from './translation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranslatedMessageEntity } from '../entity/translatedMessage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TranslatedMessageEntity])],
  controllers: [TranslationController],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}
