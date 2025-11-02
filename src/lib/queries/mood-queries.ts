import { db } from "@/lib/db";

export const moodQueries = {
  async findById(id: string) {
    throw new Error("Not implemented");
  },

  async findByUserId(userId: string, options?: { limit?: number; offset?: number }) {
    throw new Error("Not implemented");
  },

  async findByDateRange(userId: string, startDate: Date, endDate: Date) {
    throw new Error("Not implemented");
  },

  async create(data: { userId: string; mood: string; note: string; createdAt: Date }) {
    throw new Error("Not implemented");
  },

  async update(id: string, data: { mood?: string; note?: string }) {
    throw new Error("Not implemented");
  },

  async delete(id: string) {
    throw new Error("Not implemented");
  },

  async countByUserId(userId: string) {
    throw new Error("Not implemented");
  },
};
