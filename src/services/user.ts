import { supabase } from '@/lib/supabase';

export const PROFILE_ICON_IDS = [
  'human',
  'man',
  'man2',
  'woman',
  'boy',
  'child',
  'old-man',
  'grandmother',
] as const;

export type ProfileIconId = (typeof PROFILE_ICON_IDS)[number];

export const DEFAULT_PROFILE_ICON_ID: ProfileIconId = 'human';

export function isProfileIconId(value: string): value is ProfileIconId {
  return (PROFILE_ICON_IDS as readonly string[]).includes(value);
}

export function toProfileIconId(
  value: string | null | undefined,
): ProfileIconId {
  return value != null && isProfileIconId(value)
    ? value
    : DEFAULT_PROFILE_ICON_ID;
}

export type Profile = {
  id: string;
  userId: string;
  displayName: string;
  iconId: ProfileIconId;
  createdAt: string;
};

export type CreateProfileInput = {
  publicUserId: string;
  displayName: string;
};

export type ProfileCreationInput = CreateProfileInput & {
  iconId: ProfileIconId;
};

export type InitialSetupValidationErrorCode =
  'public_user_id_invalid' | 'display_name_required' | 'display_name_too_long';

export type InitialSetupValidationResult =
  | {
      isValid: true;
      value: CreateProfileInput;
    }
  | {
      isValid: false;
      code: InitialSetupValidationErrorCode;
    };

export type UserServiceErrorCode =
  | 'user_id_already_taken'
  | 'profile_already_created'
  | 'invalid_profile_input'
  | 'not_authenticated'
  | 'unexpected_error';

type ProfileRow = {
  id: string;
  user_id: string;
  display_name: string;
  icon_url: string | null;
  created_at: string;
};

type CreateProfileRpcData = {
  profile_id: string;
  user_id: string;
  display_name: string;
  icon_url: string | null;
  created_at: string;
};

type AppRpcResponse =
  | {
      status: 'ok';
      data?: CreateProfileRpcData;
    }
  | {
      status: 'error';
      error: string;
      code?: string;
    };

const PUBLIC_USER_ID_PATTERN = /^[a-z0-9_-]{3,20}$/;
const DISPLAY_NAME_MAX_LENGTH = 30;

export class UserServiceError extends Error {
  constructor(
    public readonly code: UserServiceErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'UserServiceError';
  }
}

export function normalizePublicUserId(publicUserId: string): string {
  return publicUserId.trim().toLowerCase();
}

export function validateInitialSetupInput({
  displayName,
  publicUserId,
}: CreateProfileInput): InitialSetupValidationResult {
  const normalizedPublicUserId = normalizePublicUserId(publicUserId);
  const trimmedDisplayName = displayName.trim();

  if (!PUBLIC_USER_ID_PATTERN.test(normalizedPublicUserId)) {
    return {
      code: 'public_user_id_invalid',
      isValid: false,
    };
  }

  if (trimmedDisplayName.length === 0) {
    return {
      code: 'display_name_required',
      isValid: false,
    };
  }

  if (Array.from(trimmedDisplayName).length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      code: 'display_name_too_long',
      isValid: false,
    };
  }

  return {
    isValid: true,
    value: {
      displayName: trimmedDisplayName,
      publicUserId: normalizedPublicUserId,
    },
  };
}

function mapProfile(row: ProfileRow): Profile {
  return {
    createdAt: row.created_at,
    displayName: row.display_name,
    iconId: toProfileIconId(row.icon_url),
    id: row.id,
    userId: row.user_id,
  };
}

function mapCreatedProfile(row: CreateProfileRpcData): Profile {
  return {
    createdAt: row.created_at,
    displayName: row.display_name,
    iconId: toProfileIconId(row.icon_url),
    id: row.profile_id,
    userId: row.user_id,
  };
}

function mapUserServiceErrorCode(
  code: string | undefined,
): UserServiceErrorCode {
  switch (code) {
    case 'user_id_already_taken':
    case 'profile_already_created':
    case 'not_authenticated':
      return code;
    case 'invalid_profile_input':
      return 'invalid_profile_input';
    default:
      return 'unexpected_error';
  }
}

function isAppRpcResponse(data: unknown): data is AppRpcResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'status' in data &&
    ((data as { status: unknown }).status === 'ok' ||
      (data as { status: unknown }).status === 'error')
  );
}

function profileFromRpcData(data: unknown): Profile {
  if (!isAppRpcResponse(data)) {
    throw new UserServiceError(
      'unexpected_error',
      'Profile creation returned an invalid response.',
      data,
    );
  }

  if (data.status === 'error') {
    const code = mapUserServiceErrorCode(data.code);

    throw new UserServiceError(code, data.error, data);
  }

  if (!data.data) {
    throw new UserServiceError(
      'unexpected_error',
      'Profile creation returned an empty response.',
      data,
    );
  }

  return mapCreatedProfile(data.data);
}

export async function getMyProfile(): Promise<Profile | null> {
  const userResult = await supabase.auth.getUser();

  if (userResult.error || !userResult.data.user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, display_name, icon_url, created_at')
    .eq('id', userResult.data.user.id)
    .maybeSingle();

  if (error) {
    throw new UserServiceError(
      'unexpected_error',
      'Could not fetch the current Profile.',
      error,
    );
  }

  if (!data) {
    return null;
  }

  return mapProfile(data);
}

export async function createProfile({
  displayName,
  iconId,
  publicUserId,
}: ProfileCreationInput): Promise<Profile> {
  const { data, error } = await supabase.rpc('create_profile', {
    display_name: displayName,
    icon_id: iconId,
    user_id: publicUserId,
  });

  if (error) {
    throw new UserServiceError(
      'unexpected_error',
      'Could not create Profile.',
      error,
    );
  }

  try {
    return profileFromRpcData(data);
  } catch (error) {
    if (error instanceof UserServiceError) {
      throw error;
    }

    throw new UserServiceError(
      'unexpected_error',
      'Profile creation returned an invalid response.',
      error,
    );
  }
}
