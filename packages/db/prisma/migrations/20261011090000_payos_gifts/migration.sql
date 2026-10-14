-- AlterTable
ALTER TABLE `Gift` ADD COLUMN `message` TEXT NULL,
    ADD COLUMN `side` ENUM('BRIDE', 'GROOM', 'BOTH') NULL,
    ADD COLUMN `source` ENUM('MANUAL', 'PAYOS') NOT NULL DEFAULT 'MANUAL';

-- DropTable
DROP TABLE `BankAccount`;

-- CreateTable
CREATE TABLE `PayosPayment` (
    `id` CHAR(36) NOT NULL,
    `orderCode` BIGINT NOT NULL,
    `side` ENUM('BRIDE', 'GROOM', 'BOTH') NOT NULL,
    `amount` BIGINT NOT NULL,
    `giverName` VARCHAR(191) NOT NULL,
    `message` TEXT NULL,
    `invitationId` CHAR(36) NULL,
    `status` ENUM('PENDING', 'PAID', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `paymentLinkId` VARCHAR(191) NOT NULL,
    `qrCode` TEXT NOT NULL,
    `checkoutUrl` TEXT NOT NULL,
    `bin` VARCHAR(8) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `checkedAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `reference` VARCHAR(191) NULL,
    `counterAccountName` VARCHAR(191) NULL,
    `giftId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PayosPayment_orderCode_key`(`orderCode`),
    UNIQUE INDEX `PayosPayment_paymentLinkId_key`(`paymentLinkId`),
    UNIQUE INDEX `PayosPayment_giftId_key`(`giftId`),
    INDEX `PayosPayment_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `PayosPayment_invitationId_idx`(`invitationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PayosPayment` ADD CONSTRAINT `PayosPayment_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayosPayment` ADD CONSTRAINT `PayosPayment_giftId_fkey` FOREIGN KEY (`giftId`) REFERENCES `Gift`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

