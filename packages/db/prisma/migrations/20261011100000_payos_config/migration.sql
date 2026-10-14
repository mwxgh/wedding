-- CreateTable
CREATE TABLE `PayosConfig` (
    `side` ENUM('BRIDE', 'GROOM', 'BOTH') NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `apiKeyEnc` TEXT NOT NULL,
    `checksumKeyEnc` TEXT NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`side`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

