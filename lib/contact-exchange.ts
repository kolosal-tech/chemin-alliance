import type { ContactExchangeStatus, MatchStatus } from "@prisma/client";

export const CONTACT_REQUESTABLE_STATUSES = [
  "NOT_ALLOWED",
  "AVAILABLE",
  "DECLINED",
  "REVOKED",
] as const satisfies readonly ContactExchangeStatus[];

export function canRespondToContactExchange(
  state: {
    status: MatchStatus;
    contactExchange: ContactExchangeStatus;
    contactExchangeRequestedBy: string | null;
    userAId: string;
    userBId: string;
  },
  userId: string,
): boolean {
  return (
    state.status === "ACTIVE" &&
    state.contactExchange === "REQUESTED" &&
    state.contactExchangeRequestedBy !== null &&
    state.contactExchangeRequestedBy !== userId &&
    (state.userAId === userId || state.userBId === userId)
  );
}
