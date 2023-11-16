import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('room')
export class RoomEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;

  @Column({
    type: 'int',
  })
  capacity: number;

  @Column({
    type: 'varchar',
    length: 36,
  })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
