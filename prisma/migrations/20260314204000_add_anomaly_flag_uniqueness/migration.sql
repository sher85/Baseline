WITH ranked_flags AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "userId", day, type
      ORDER BY "createdAt" ASC, id ASC
    ) AS row_number
  FROM "AnomalyFlag"
)
DELETE FROM "AnomalyFlag" AS anomaly_flag
USING ranked_flags
WHERE anomaly_flag.id = ranked_flags.id
  AND ranked_flags.row_number > 1;

CREATE UNIQUE INDEX "AnomalyFlag_userId_day_type_key"
ON "AnomalyFlag"("userId", day, type);
