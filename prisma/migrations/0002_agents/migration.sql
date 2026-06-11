-- AlterEnum
ALTER TYPE "ConsentType" ADD VALUE 'AGENT_PROFILING';

-- CreateTable
CREATE TABLE "AgentInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "matchId" TEXT,
    "agentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dataJson" JSONB NOT NULL,
    "visibility" "VisibilityLevel" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AgentInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentInsight_userId_agentId_idx" ON "AgentInsight"("userId", "agentId");

-- CreateIndex
CREATE INDEX "AgentInsight_matchId_agentId_idx" ON "AgentInsight"("matchId", "agentId");

-- AddForeignKey
ALTER TABLE "AgentInsight" ADD CONSTRAINT "AgentInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentInsight" ADD CONSTRAINT "AgentInsight_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

