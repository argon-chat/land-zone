import { handleInviteRequest } from '../../functions-lib/invite.js';

// /i/{code} — a space invite. The shell is the statically built /i page; everything that depends on
// the code is written in by handleInviteRequest.
export const onRequest = (context) => handleInviteRequest(context, '/i');
