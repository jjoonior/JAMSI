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
import { UserEntity } from './user.entity';
import { RoomEntity } from './room.entity';

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
