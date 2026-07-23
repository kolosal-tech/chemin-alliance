# Chiffrement des réponses Alliance

La migration `0022_alliance_answer_encryption` ajoute
`AllianceAnswer.answerEncrypted` sans modifier le contenu des anciennes
réponses. Elle garde temporairement l'ancienne colonne SQL `answer`, toujours
`NOT NULL`, sous le nom Prisma explicite `answerLegacy`.

Cette transition est volontaire : PostgreSQL ne reçoit jamais
`ENCRYPTION_KEY`, donc une migration SQL ne peut pas produire honnêtement des
ciphertexts AES-256-GCM compatibles avec l'application.

## Déploiement et backfill

1. Sauvegarder la base et appliquer les migrations :

   ```sh
   pnpm prisma migrate deploy
   ```

2. Déployer la version applicative qui place le contenu uniquement dans
   `answerEncrypted` et une chaîne vide non sensible dans la colonne
   historique. La lecture reste compatible avec les anciennes lignes et les
   anciennes instances ne reçoivent jamais un `null` inattendu.

3. Attendre l'arrêt de toutes les anciennes instances, puis, avec les mêmes
   `DATABASE_URL` et `ENCRYPTION_KEY` que l'application, exécuter :

   ```sh
   pnpm tsx scripts/backfill-alliance-answers.ts
   ```

   Le script est idempotent. Chaque mise à jour chiffre une réponse puis met
   son ancien clair à la chaîne vide dans la même requête conditionnelle. Les
   journaux ne contiennent que des compteurs.

4. Vérifier que le script termine avec :

   ```text
   legacyRemaining=0 missingAnswer=0
   ```

5. Après vérification en production et expiration de toute ancienne instance,
   une migration ultérieure pourra supprimer la colonne SQL `answer`, rendre
   `answerEncrypted` obligatoire et remplacer la contrainte transitoire par
   une contrainte stricte.

Ne supprimez pas la colonne historique avant la réussite du backfill : ce
serait une perte irréversible des réponses antérieures.
