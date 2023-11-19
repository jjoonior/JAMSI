import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Entity('room')
export class RoomEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToMany(() => UserEntity, (user) => user.rooms)
  @JoinTable()
  users: UserEntity[];

  @Column({
    type: 'varchar',
    length: 255,
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
