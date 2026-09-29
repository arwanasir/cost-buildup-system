import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.db.query.users.findFirst({
      where: eq(schema.users.email, createUserDto.email),
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(
      createUserDto.temporaryPassword || 'defaultPassword123',
      10,
    );

    const [user] = await this.db
      .insert(schema.users)
      .values({
        email: createUserDto.email,
        fullName: createUserDto.fullName,
        role: createUserDto.role as (typeof schema.users.$inferInsert)['role'],
        department: createUserDto.department,
        preferredLanguage: (createUserDto.preferredLanguage ||
          'en') as (typeof schema.users.$inferInsert)['preferredLanguage'],
        passwordHash,
        isActive: true,
      })
      .returning();

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async findAll() {
    const users = await this.db.query.users.findMany();
    return users.map((u) => {
      const { passwordHash: _, ...rest } = u;
      return rest;
    });
  }

  async findOne(id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);

    const updateData: Partial<typeof schema.users.$inferInsert> = {};
    if (updateUserDto.fullName) updateData.fullName = updateUserDto.fullName;
    if (updateUserDto.role)
      updateData.role =
        updateUserDto.role as (typeof schema.users.$inferInsert)['role'];
    if (updateUserDto.department !== undefined)
      updateData.department = updateUserDto.department;
    if (updateUserDto.preferredLanguage)
      updateData.preferredLanguage =
        updateUserDto.preferredLanguage as (typeof schema.users.$inferInsert)['preferredLanguage'];

    if (Object.keys(updateData).length === 0) {
      return user;
    }

    const [updatedUser] = await this.db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, id))
      .returning();

    const { passwordHash: _, ...result } = updatedUser;
    return result;
  }

  async deactivate(id: string) {
    await this.findOne(id);

    const [deactivatedUser] = await this.db
      .update(schema.users)
      .set({ isActive: false })
      .where(eq(schema.users.id, id))
      .returning();

    const { passwordHash: _, ...result } = deactivatedUser;
    return result;
  }

  async resetPassword(id: string, newPassword: string) {
    await this.findOne(id); // ensure exists

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.db
      .update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.id, id));

    // Revoke all refresh tokens for this user so they have to log in again
    await this.db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(schema.refreshTokens.userId, id));

    return { message: 'Password reset successfully and sessions revoked' };
  }
}
