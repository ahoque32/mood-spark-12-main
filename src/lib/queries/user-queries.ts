import { User, UserSettings } from '@prisma/client';
import prisma from '../db/client';
import bcrypt from 'bcryptjs';

export type UserWithSettings = User & {
  settings: UserSettings | null;
};

export interface CreateUserData {
  email: string;
  password: string;
  name?: string;
}

export class UserQueries {
  static async findByEmail(email: string): Promise<UserWithSettings | null> {
    return prisma.user.findUnique({
      where: { email },
      include: { settings: true }
    });
  }

  static async findById(id: string): Promise<UserWithSettings | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { settings: true }
    });
  }

  static async create(data: CreateUserData): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          name: data.name,
        }
      });

      await tx.userSettings.create({
        data: {
          userId: user.id,
          analyzeTone: false,
          correlateSocial: false,
          shareWithTherapist: false,
        }
      });

      return user;
    });
  }

  static async updateSettings(userId: string, settings: { analyzeTone?: boolean; correlateSocial?: boolean; shareWithTherapist?: boolean; }): Promise<UserSettings> {
    return prisma.userSettings.upsert({
      where: { userId },
      update: settings,
      create: {
        userId,
        analyzeTone: settings.analyzeTone ?? false,
        correlateSocial: settings.correlateSocial ?? false,
        shareWithTherapist: settings.shareWithTherapist ?? false,
      }
    });
  }

  static async findSettingsByUserId(userId: string): Promise<UserSettings | null> {
    return prisma.userSettings.findUnique({
      where: { userId }
    });
  }

  static async updatePassword(userId: string, newPassword: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword }
    });
  }

  static async updateTokenVersion(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } }
    });
  }

  static async delete(userId: string): Promise<void> {
    await prisma.user.delete({
      where: { id: userId }
    });
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }
}