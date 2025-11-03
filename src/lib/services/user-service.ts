import { User, UserSettings } from '@prisma/client';
import { UserQueries, UserWithSettings, CreateUserData } from '../queries/user-queries';
import { RegisterInput } from '../validators/auth-validator';
import { SettingsInput } from '../validators/settings-validator';

export class UserService {
  static async createUser(input: RegisterInput): Promise<User> {
    const existingUser = await UserQueries.findByEmail(input.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const data: CreateUserData = {
      email: input.email,
      password: input.password,
      name: input.name
    };

    return UserQueries.create(data);
  }

  static async getUserByEmail(email: string): Promise<UserWithSettings | null> {
    return UserQueries.findByEmail(email);
  }

  static async getUserById(id: string): Promise<UserWithSettings | null> {
    return UserQueries.findById(id);
  }

  static async updateUserSettings(userId: string, input: SettingsInput): Promise<UserSettings> {
    return UserQueries.updateSettings(userId, input);
  }

  static async changePassword(userId: string, newPassword: string): Promise<User> {
    return UserQueries.updatePassword(userId, newPassword);
  }

  static async incrementTokenVersion(userId: string): Promise<User> {
    return UserQueries.updateTokenVersion(userId);
  }

  static async deleteUser(userId: string): Promise<void> {
    return UserQueries.delete(userId);
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return UserQueries.verifyPassword(user, password);
  }

  static async getUserSettings(userId: string): Promise<UserSettings | null> {
    return UserQueries.findSettingsByUserId(userId);
  }

  static getSettingsData(settings: UserSettings | null) {
    if (!settings) {
      return {
        analyzeTone: false,
        correlateSocial: false,
        shareWithTherapist: false
      };
    }
    
    return {
      analyzeTone: settings.analyzeTone,
      correlateSocial: settings.correlateSocial,
      shareWithTherapist: settings.shareWithTherapist
    };
  }
}