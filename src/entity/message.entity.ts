import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { RoomEntity } from './room.entity';
import { TranslatedMessageEntity } from './translatedMessage.entity';
import { Language } from './enum/language.enum';

@Entity('message')
export class MessageEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, (user) => user.messages)
  @JoinColumn()
  user: UserEntity;

  @ManyToOne(() => RoomEntity, (room) => room.messages)
  @JoinColumn()
  room: RoomEntity;

  @OneToMany(
    () => TranslatedMessageEntity,
    (translatedMessage) => translatedMessage.message,
  )
  translatedMessages: TranslatedMessageEntity[];

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
