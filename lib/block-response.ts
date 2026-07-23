/**
 * Le client ne considère le blocage acquis que si le serveur confirme à la
 * fois le statut HTTP et l'état métier. Toute réponse vide, malformée ou
 * contradictoire échoue fermée.
 */
export async function isConfirmedBlockResponse(
  response: Response,
): Promise<boolean> {
  if (!response.ok) return false;

  try {
    const body = (await response.json()) as {
      ok?: unknown;
      blocked?: unknown;
    };
    return body.ok === true && body.blocked === true;
  } catch {
    return false;
  }
}
