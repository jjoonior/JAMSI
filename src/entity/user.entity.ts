import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoomEntity } from './room.entity';
import { MessageEntity } from './message.entity';
import { Language } from './enum/language.enum';

@Entity('user')
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  password: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  nickname: string;

  @Column({
    type: 'enum',
    enum: Language,
    default: Language.KO,
  })
  language: Language;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => RoomEntity, (room) => room.users)
  rooms: RoomEntity[];

  @OneToMany(() => MessageEntity, (message) => message.user)
  messages: MessageEntity[];
}
