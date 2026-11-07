-- AlterTable
ALTER TABLE `Invitation` ADD COLUMN `groupName` VARCHAR(64) NULL;

-- CreateIndex
CREATE INDEX `Invitation_groupName_idx` ON `Invitation`(`groupName`);

