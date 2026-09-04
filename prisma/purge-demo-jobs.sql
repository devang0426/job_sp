-- One-time cleanup: remove the 10 demo/seed jobs that carry placeholder
-- apply URLs (job ids job_seed_01 … job_seed_10, hosts like
-- startup.example.com / jsearch.api / adzuna.in/details/404).
--
-- Real scanned postings are untouched. Safe to run more than once.
--
--   npx dotenv -e .env.local -- npx prisma db execute \
--     --file prisma/purge-demo-jobs.sql --schema prisma/schema.prisma

DELETE FROM "ApplicationEvent"
WHERE "applicationId" IN (
  SELECT a."id" FROM "Application" a
  JOIN "Job" j ON j."id" = a."jobId"
  WHERE j."id" LIKE 'job_seed_%'
);

DELETE FROM "Application"
WHERE "jobId" IN (SELECT "id" FROM "Job" WHERE "id" LIKE 'job_seed_%');

DELETE FROM "Match"
WHERE "jobId" IN (SELECT "id" FROM "Job" WHERE "id" LIKE 'job_seed_%');

DELETE FROM "Job" WHERE "id" LIKE 'job_seed_%';
