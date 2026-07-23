import { jsonError, withErrors } from "@/lib/api-helpers";

export const GET = withErrors(
  async (_req: Request, _context: { params: Promise<{ id: string }> }) => {
    void _req;
    void _context;
    return jsonError(503, "COACH_MARKETPLACE_UNAVAILABLE");
  },
);
