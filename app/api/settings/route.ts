import { NextRequest, NextResponse } from "next/server";
import { AuthService } from '@/lib/auth';
import { UserService } from '@/lib/services/user-service';
import { settingsSchema } from '@/lib/validators/settings-validator';
import { handleDatabaseError } from '@/lib/db/errors';

export async function GET(request: NextRequest) {
  try {
    const payload = await AuthService.authenticateRequest(request);
    const user = await UserService.getUserById(payload.userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const settings = UserService.getSettingsData(user.settings);

    return NextResponse.json({ settings });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const dbError = handleDatabaseError(error);
    return NextResponse.json(
      { error: dbError.message },
      { status: dbError.statusCode }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = await AuthService.authenticateRequest(request);
    const body = await request.json();
    const validation = settingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid settings data', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const updatedSettings = await UserService.updateUserSettings(payload.userId, validation.data);
    const settings = UserService.getSettingsData(updatedSettings);

    return NextResponse.json({ settings });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const dbError = handleDatabaseError(error);
    return NextResponse.json(
      { error: dbError.message },
      { status: dbError.statusCode }
    );
  }
}