import { Injectable } from '@nestjs/common';
import { Language } from '../entity/enum/language.enum';
import axios from 'axios';
import { RoomEntity } from '../entity/room.entity';
import { MessageEntity } from '../entity/message.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { TranslatedMessageEntity } from '../entity/translatedMessage.entity';
import { Repository } from 'typeorm';
import { UserEntity } from '../entity/user.entity';

@Injectable()
export class TranslationService {
  constructor(
    @InjectRepository(TranslatedMessageEntity)
    private readonly translatedMessageEntityRepository: Repository<TranslatedMessageEntity>,
  ) {}

  // todo 번역 api 교체 용이하도록 리팩토링 필요
  async translate(source: Language, target: Language, text: string) {
    // 파파고
    const url = 'https://openapi.naver.com/v1/papago/n2mt';

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Naver-Client-Id': process.env.NAVER_ID,
      'X-Naver-Client-Secret': process.env.NAVER_SECRET,
    };

    const data = new URLSearchParams();
    data.append('source', source);
    data.append('target', target);
    data.append('text', text);

    try {
      const response = await axios.post(url, data, { headers });
      return response.data.message.result.translatedText;
    } catch (error) {
      console.error(error.stack);
      throw new Error(error);
    }
  }

  async getRoomUserLanguage(room: RoomEntity) {
    return new Set(room.users.map((user: UserEntity) => user.language));
  }

  async createTranslatedMessage(
    message: MessageEntity,
    language: Language,
    translatedText: string,
  ) {
    return await this.translatedMessageEntityRepository
      .create({
        message,
        language,
        content: translatedText,
      })
      .save();
  }

  async getTranslatedMessage(message: MessageEntity, languages: Set<Language>) {
    const translatedTextMap = new Map();
    const promises = [];

    languages.forEach((language: Language) => {
      const source: Language = message.language;
      const target: Language = language;
      const text: string = message.content;

      if (source !== target) {
        const translatedText = this.translate(source, target, text);
        promises.push(translatedText);
        translatedTextMap.set(target, translatedText);
      }
    });
    await Promise.all(promises);

    // todo translatedMessage 생성도 비동기로 돌리자
    // todo translatedMessage가 아닌 translatedTextMap를 보내도 되는데 객체 생성은 비동기로 하고
    const translatedMessageMap = new Map();
    for (const [target, translatedText] of translatedTextMap) {
      const translatedMessage: TranslatedMessageEntity =
        await this.createTranslatedMessage(
          message,
          target,
          await translatedText,
        );
      translatedMessageMap.set(target, translatedMessage);
    }

    return translatedMessageMap;
  }
}
