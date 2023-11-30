import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MessageEntity } from './message.entity';
import { Language } from './enum/language.enum';

@Entity('translated_message')
export class TranslatedMessageEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MessageEntity, (message) => message.translatedMessages)
  @JoinColumn()
  message: MessageEntity;

  @Column({
    type: 'enum',
    enum: Language,
    default: Language.KO,
  })
  language: Language;

  @Column({
    type: 'varchar',
    length: 255,
  })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
