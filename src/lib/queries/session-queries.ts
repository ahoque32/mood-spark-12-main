import supabase from '../db/client';
import { addDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: string;
  createdAt: string;
}

export class SessionQueries {
  static async create(userId: string, refreshToken: string): Promise<Session> {
    const expiresAt = addDays(new Date(), 7);
    
    const { data, error } = await supabase
      .from('Session')
      .insert({
        id: uuidv4(),
        userId: userId,
        refreshToken: refreshToken,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async findByToken(refreshToken: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('Session')
      .select('*')
      .eq('refreshToken', refreshToken)
      .single();

    if (error) return null;
    return data;
  }

  static async delete(refreshToken: string): Promise<void> {
    await supabase
      .from('Session')
      .delete()
      .eq('refreshToken', refreshToken);
  }

  static async deleteAllByUser(userId: string): Promise<void> {
    await supabase
      .from('Session')
      .delete()
      .eq('userId', userId);
  }

  static async deleteExpired(): Promise<void> {
    await supabase
      .from('Session')
      .delete()
      .lt('expiresAt', new Date().toISOString());
  }

  static async isValid(refreshToken: string): Promise<boolean> {
    const session = await this.findByToken(refreshToken);
    if (!session) return false;
    
    if (new Date(session.expiresAt) < new Date()) {
      await this.delete(refreshToken);
      return false;
    }
    
    return true;
  }
}