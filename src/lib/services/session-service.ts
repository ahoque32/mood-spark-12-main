import { SessionQueries } from '@/lib/queries/session-queries';

export class SessionService {
  static async createSession(userId: string, refreshToken: string) {
    return SessionQueries.create(userId, refreshToken);
  }

  static async getSessionByToken(refreshToken: string) {
    return SessionQueries.findByToken(refreshToken);
  }

  static async invalidateSession(refreshToken: string) {
    return SessionQueries.delete(refreshToken);
  }

  static async invalidateAllUserSessions(userId: string) {
    return SessionQueries.deleteAllByUser(userId);
  }

  static async cleanExpiredSessions() {
    return SessionQueries.deleteExpired();
  }

  static async isTokenValid(refreshToken: string) {
    return SessionQueries.isValid(refreshToken);
  }
}