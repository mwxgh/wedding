-- AlterTable
ALTER TABLE `Event` ADD COLUMN `dayOffset` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `endTime` CHAR(5) NULL,
    ADD COLUMN `startTime` CHAR(5) NOT NULL DEFAULT '00:00';

-- Backfill: keep each event's Vietnam wall-clock time and its distance in
-- days from the wedding day, so nothing moves when this runs.
UPDATE `Event`
SET `startTime` = DATE_FORMAT(CONVERT_TZ(`startAt`, '+00:00', '+07:00'), '%H:%i'),
    `endTime` = IF(`endAt` IS NULL, NULL,
      DATE_FORMAT(CONVERT_TZ(`endAt`, '+00:00', '+07:00'), '%H:%i'));

UPDATE `Event` e JOIN `WeddingInfo` w ON w.`id` = 1
SET e.`dayOffset` = DATEDIFF(
  DATE(CONVERT_TZ(e.`startAt`, '+00:00', '+07:00')),
  DATE(CONVERT_TZ(w.`weddingDate`, '+00:00', '+07:00')));

-- The wedding date is a calendar day: store it as 00:00 Vietnam time.
UPDATE `WeddingInfo`
SET `weddingDate` = CONVERT_TZ(
  TIMESTAMP(DATE(CONVERT_TZ(`weddingDate`, '+00:00', '+07:00'))),
  '+07:00', '+00:00');
