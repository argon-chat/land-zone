import { handleInviteRequest } from '../../functions-lib/invite.js';

// /v/{code} — a voice-room invite, minted by CreateVoiceInviteCode. Same code space and same card as
// /i; only the shell differs, because the copy before the card resolves talks about a room.
export const onRequest = (context) => handleInviteRequest(context, '/v');
