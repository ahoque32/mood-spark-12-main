import { Mood } from "@/lib/models";

export class MoodService {
  static async createMood(userId: string, mood: Mood, note: string) {
    throw new Error("Not implemented");
  }

  static async getMoodById(id: string) {
    throw new Error("Not implemented");
  }

  static async getMoodsByUser(userId: string, limit?: number) {
    throw new Error("Not implemented");
  }

  static async updateMood(id: string, mood: Mood, note: string) {
    throw new Error("Not implemented");
  }

  static async deleteMood(id: string) {
    throw new Error("Not implemented");
  }

  static async getMoodsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    throw new Error("Not implemented");
  }
}
