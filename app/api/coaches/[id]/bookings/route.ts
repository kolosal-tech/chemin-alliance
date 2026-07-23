import { jsonError, withErrors } from "@/lib/api-helpers";
import { requireUser } from "@/lib/security/session";

export const POST = withErrors(
  async (_req: Request, _context: { params: Promise<{ id: string }> }) => {
    void _req;
    void _context;
    await requireUser();

    // Aucun créneau n'est accepté tant que le serveur ne possède pas une
    // source de disponibilité réelle. Cela empêche aussi qu'un client forge
    // directement un slotStart non publié.
    return jsonError(503, "BOOKING_UNAVAILABLE");
  },
);
