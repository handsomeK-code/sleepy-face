export type FailureLogEntryOwner = {
  profile_id: string;
};

export type PushTokenRow = {
  profile_id: string;
  token: string;
};

// Deliberately has NO top-level title/body: Expo's push API includes an Android
// `notification` payload block whenever a message has top-level title/body, and Android
// auto-displays notification-type FCM messages via its own system channel while the app
// is backgrounded -- bypassing AlarmActivationMessagingService.onMessageReceived()
// entirely, so the native ring logic never runs. Keeping this a pure data message (title/
// body nested inside `data` instead) guarantees delivery always reaches our own handler.
export type PushMessage = {
  to: string;
  data: {
    type: 'alarm-activation';
    title: string;
    body: string;
  };
};

export type ActivateAlarmDeps = {
  // Atomically marks the entry activated (activated_at/activated_by set) only if it is
  // not already activated, returning its owner. Returns null when the entry is already
  // activated or does not exist -- this single conditional update is what makes two
  // near-simultaneous calls on the same entry unable to both succeed.
  markActivated(
    entryId: string,
    activatedBy: string,
  ): Promise<FailureLogEntryOwner | null>;
  listPushTokens(profileId: string): Promise<PushTokenRow[]>;
  sendPush(messages: PushMessage[]): Promise<void>;
};

export type ActivateAlarmOutcome =
  | { status: 'activated'; messages: PushMessage[] }
  | { status: 'already-activated-or-not-found' };

const ACTIVATION_PUSH_TITLE = 'Wake up!';
const ACTIVATION_PUSH_BODY = 'A friend is activating your alarm 📣';

export function buildActivationPushMessages(tokens: string[]): PushMessage[] {
  return tokens.map((token) => ({
    data: {
      body: ACTIVATION_PUSH_BODY,
      title: ACTIVATION_PUSH_TITLE,
      type: 'alarm-activation',
    },
    to: token,
  }));
}

// Given a Failure Log Entry id and the activating Friend's profile id, consumes the
// entry (see markActivated) and pushes an activation-payload message to every device
// registered to the entry's owner. Sends nothing when the entry was already consumed,
// doesn't exist, or the owner has no registered devices.
export async function activateAlarm(
  entryId: string,
  activatedByProfileId: string,
  deps: ActivateAlarmDeps,
): Promise<ActivateAlarmOutcome> {
  const owner = await deps.markActivated(entryId, activatedByProfileId);

  if (!owner) {
    return { status: 'already-activated-or-not-found' };
  }

  const tokenRows = await deps.listPushTokens(owner.profile_id);
  const messages = buildActivationPushMessages(
    tokenRows.map((row) => row.token),
  );

  if (messages.length > 0) {
    await deps.sendPush(messages);
  }

  return { messages, status: 'activated' };
}
