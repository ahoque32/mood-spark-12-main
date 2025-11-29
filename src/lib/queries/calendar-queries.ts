import { supabase } from '../db/client';
import { v4 as uuidv4 } from 'uuid';

export interface CalendarToken {
  id: string;
  userId: string;
  provider: 'google' | 'outlook';
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  scope: string;
  createdAt: string;
  updatedAt: string;
}

export class CalendarQueries {
  static async storeTokens(
    userId: string,
    provider: 'google' | 'outlook',
    tokens: any
  ): Promise<CalendarToken> {
    const now = new Date().toISOString();
    
    // First check if tokens already exist for this user and provider
    const { data: existing } = await supabase
      .from('calendar_tokens')
      .select('*')
      .eq('userId', userId)
      .eq('provider', provider)
      .single();

    const tokenData = {
      userId,
      provider,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      scope: tokens.scope || '',
      updatedAt: now
    };

    if (existing) {
      // Update existing tokens
      const { data, error } = await supabase
        .from('calendar_tokens')
        .update(tokenData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } else {
      // Create new token record
      const { data, error } = await supabase
        .from('calendar_tokens')
        .insert({
          id: uuidv4(),
          ...tokenData,
          createdAt: now
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }
  }

  static async getTokens(
    userId: string,
    provider: 'google' | 'outlook'
  ): Promise<CalendarToken | null> {
    const { data, error } = await supabase
      .from('calendar_tokens')
      .select('*')
      .eq('userId', userId)
      .eq('provider', provider)
      .single();

    if (error) return null;
    return data;
  }

  static async deleteTokens(userId: string, provider: 'google' | 'outlook'): Promise<void> {
    const { error } = await supabase
      .from('calendar_tokens')
      .delete()
      .eq('userId', userId)
      .eq('provider', provider);

    if (error) throw new Error(error.message);
  }

  static async getAllUserTokens(userId: string): Promise<CalendarToken[]> {
    const { data, error } = await supabase
      .from('calendar_tokens')
      .select('*')
      .eq('userId', userId);

    if (error) throw new Error(error.message);
    return data || [];
  }
}