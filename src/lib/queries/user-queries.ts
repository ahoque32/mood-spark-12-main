import { db } from "@/lib/db";

export const userQueries = {
  async findById(id: string) {
    throw new Error("Not implemented");
  },

  async findByEmail(email: string) {
    throw new Error("Not implemented");
  },

  async create(data: { email: string; name?: string }) {
    throw new Error("Not implemented");
  },

  async update(id: string, data: any) {
    throw new Error("Not implemented");
  },

  async getSettings(userId: string) {
    throw new Error("Not implemented");
  },

  async updateSettings(userId: string, settings: any) {
    throw new Error("Not implemented");
  },
};
