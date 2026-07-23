import { hash, verify } from "@node-rs/argon2";

// Argon2id - paramètres OWASP (m=19 MiB, t=2, p=1).
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

// Hash Argon2id valide d'une valeur factice qui n'est jamais un mot de passe
// utilisateur. Il impose le même coût de vérification quand l'email est inconnu
// et évite un oracle temporel trivial sur la route de connexion.
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$hmzT8lrFLobp0Yl+u8fRtQ$OGH3fs86faSsYy8oaZP5IZsmGK7pQnJHn/JrUiai67A";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export async function verifyPasswordOrDummy(
  passwordHash: string | null | undefined,
  password: string,
): Promise<boolean> {
  const valid = await verifyPassword(
    passwordHash ?? DUMMY_PASSWORD_HASH,
    password,
  );
  return passwordHash != null && valid;
}
