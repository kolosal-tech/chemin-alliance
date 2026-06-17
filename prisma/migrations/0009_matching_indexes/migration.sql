-- Index du vivier de matching : la requête getSuggestions filtre sur
-- season + isVerified + gender + deletedAt. Sans index, Postgres fait un
-- full scan de "User" qui se dégrade dès quelques milliers de profils.
CREATE INDEX "User_season_isVerified_gender_deletedAt_idx"
  ON "User"("season", "isVerified", "gender", "deletedAt");
