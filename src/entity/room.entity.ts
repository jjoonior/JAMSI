import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { MessageEntity } from './message.entity';

@Entity('room')
export class RoomEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToMany(() => UserEntity, (user) => user.rooms)
  @JoinTable()
  users: UserEntity[];

  @OneToMany(() => MessageEntity, (message) => message.room)
  messages: MessageEntity[];

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    default: '참여자 없음',
  })
  title: string;

  @Column({
    type: 'int',
    nullable: true,
    default: 100,
  })
  capacity: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
