import supabase from '../db/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  analyzeTone: boolean;
  correlateSocial: boolean;
  shareWithTherapist: boolean;
  createdAt: string;
  updatedAt: string;
}

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
    const { data: user, error } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) return null;

    const { data: settings } = await supabase
      .from('UserSettings')
      .select('*')
      .eq('userId', user.id)
      .single();

    return { ...user, settings };
  }

  static async findById(id: string): Promise<UserWithSettings | null> {
    const { data: user, error } = await supabase
      .from('User')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) return null;

    const { data: settings } = await supabase
      .from('UserSettings')
      .select('*')
      .eq('userId', user.id)
      .single();

    return { ...user, settings };
  }

  static async create(data: CreateUserData): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    // Create user
    const userId = uuidv4();
    const { data: user, error: userError } = await supabase
      .from('User')
      .insert({
        id: userId,
        email: data.email,
        passwordHash: hashedPassword,
        name: data.name,
        tokenVersion: 0
      })
      .select()
      .single();

    if (userError || !user) {
      throw new Error(userError?.message || 'Failed to create user');
    }

    // Create user settings
    const { error: settingsError } = await supabase
      .from('UserSettings')
      .insert({
        id: uuidv4(),
        userId: user.id,
        analyzeTone: false,
        correlateSocial: false,
        shareWithTherapist: false
      });

    if (settingsError) {
      // Rollback user creation on settings error
      await supabase.from('User').delete().eq('id', user.id);
      throw new Error(settingsError.message);
    }

    return user;
  }

  static async updateSettings(
    userId: string, 
    settings: { 
      analyzeTone?: boolean; 
      correlateSocial?: boolean; 
      shareWithTherapist?: boolean; 
    }
  ): Promise<UserSettings> {
    // First try to update existing settings
    const { data: existingSettings } = await supabase
      .from('UserSettings')
      .select('*')
      .eq('userId', userId)
      .single();

    if (existingSettings) {
      const { data, error } = await supabase
        .from('UserSettings')
        .update(settings)
        .eq('userId', userId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    } else {
      // Create new settings if they don't exist
      const { data, error } = await supabase
        .from('UserSettings')
        .insert({
          id: uuidv4(),
          userId: userId,
          analyzeTone: settings.analyzeTone ?? false,
          correlateSocial: settings.correlateSocial ?? false,
          shareWithTherapist: settings.shareWithTherapist ?? false
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }
  }

  static async findSettingsByUserId(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from('UserSettings')
      .select('*')
      .eq('userId', userId)
      .single();

    if (error) return null;
    return data;
  }

  static async updatePassword(userId: string, newPassword: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const { data, error } = await supabase
      .from('User')
      .update({ 
        passwordHash: hashedPassword
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async updateTokenVersion(userId: string): Promise<User> {
    const { data: currentUser } = await supabase
      .from('User')
      .select('tokenVersion')
      .eq('id', userId)
      .single();

    const newVersion = (currentUser?.tokenVersion || 0) + 1;

    const { data, error } = await supabase
      .from('User')
      .update({ 
        tokenVersion: newVersion
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async delete(userId: string): Promise<void> {
    const { error } = await supabase
      .from('User')
      .delete()
      .eq('id', userId);

    if (error) throw new Error(error.message);
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }
}