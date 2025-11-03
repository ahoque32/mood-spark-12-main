import { Session } from '@prisma/client';
import prisma from '../db/client';
import { addDays } from 'date-fns';

export class SessionQueries {
  static async create(userId: string, refreshToken: string): Promise<Session> {
    const expiresAt = addDays(new Date(), 7);
    
    return prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt
      }
    });
  }

  static async findByToken(refreshToken: string): Promise<Session | null> {
    return prisma.session.findUnique({
      where: { refreshToken }
    });
  }

  static async delete(refreshToken: string): Promise<void> {
    await prisma.session.delete({
      where: { refreshToken }
    }).catch(() => {});
  }

  static async deleteAllByUser(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId }
    });
  }

  static async deleteExpired(): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  }

  static async isValid(refreshToken: string): Promise<boolean> {
    const session = await this.findByToken(refreshToken);
    if (!session) return false;
    
    if (session.expiresAt < new Date()) {
      await this.delete(refreshToken);
      return false;
    }
    
    return true;
  }
}