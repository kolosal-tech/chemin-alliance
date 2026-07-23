# Audit des opérations d’administration

Les lectures et mutations des surfaces de modération et de gestion des
accompagnateurs émettent une ligne JSON structurée côté serveur.

Le schéma est fermé :

- `admin.reports.read` : `list`, `page` ;
- `admin.report.mutate` : `request` (action inconnue avant authentification),
  `reviewing`, `resolved`, `dismissed`, `ban` ;
- `admin.coaches.read` : `list`, `page` ;
- `admin.coach.mutate` : `create`, `delete` ;
- résultat : `success`, `failure`, `denied` ou `not_found`.

`actorId` et `targetId` sont des pseudonymes HMAC stables. Le journal n’accepte
aucun champ libre et ne contient ni email, ni nom, ni motif de signalement, ni
extrait de message, ni jeton, ni secret.

## Limite de conservation

L’application écrit ces événements sur stdout. Elle ne peut donc pas garantir
seule leur collecte, leur immutabilité ou leur durée de conservation. Une
garantie opérationnelle exige un agrégateur externe configuré avec contrôle
d’accès, rétention, alertes d’interruption et stockage immuable selon la
politique de l’exploitant. Tant que cette configuration n’est pas vérifiée en
production, la conservation du journal reste **non garantie**.
