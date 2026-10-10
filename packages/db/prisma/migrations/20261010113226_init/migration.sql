-- CreateTable
CREATE TABLE `WeddingInfo` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `brideName` VARCHAR(191) NOT NULL,
    `groomName` VARCHAR(191) NOT NULL,
    `brideParents` VARCHAR(191) NULL,
    `groomParents` VARCHAR(191) NULL,
    `weddingDate` DATETIME(3) NOT NULL,
    `story` TEXT NULL,
    `coverPhotoKey` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `side` ENUM('BRIDE', 'GROOM', 'BOTH') NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NULL,
    `venueName` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `mapUrl` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invitation` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(16) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `side` ENUM('BRIDE', 'GROOM', 'BOTH') NOT NULL,
    `relation` ENUM('FAMILY', 'RELATIVE', 'FRIEND', 'COLLEAGUE', 'NEIGHBOR', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `maxGuests` INTEGER NOT NULL DEFAULT 1,
    `phone` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `openedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Invitation_code_key`(`code`),
    INDEX `Invitation_side_idx`(`side`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Guest` (
    `id` CHAR(36) NOT NULL,
    `invitationId` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isChild` BOOLEAN NOT NULL DEFAULT false,
    `dietaryNote` VARCHAR(191) NULL,

    INDEX `Guest_invitationId_idx`(`invitationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvitationEvent` (
    `invitationId` CHAR(36) NOT NULL,
    `eventId` CHAR(36) NOT NULL,
    `status` ENUM('PENDING', 'ATTENDING', 'DECLINED', 'MAYBE') NOT NULL DEFAULT 'PENDING',
    `attendingCount` INTEGER NOT NULL DEFAULT 0,
    `message` TEXT NULL,
    `respondedAt` DATETIME(3) NULL,
    `tableId` CHAR(36) NULL,

    INDEX `InvitationEvent_eventId_status_idx`(`eventId`, `status`),
    INDEX `InvitationEvent_tableId_idx`(`tableId`),
    PRIMARY KEY (`invitationId`, `eventId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Table` (
    `id` CHAR(36) NOT NULL,
    `eventId` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `capacity` INTEGER NOT NULL DEFAULT 10,

    UNIQUE INDEX `Table_eventId_name_key`(`eventId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Album` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `isGuest` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Photo` (
    `id` CHAR(36) NOT NULL,
    `albumId` CHAR(36) NULL,
    `objectKey` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `caption` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'HIDDEN') NOT NULL DEFAULT 'PENDING',
    `invitationId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Photo_objectKey_key`(`objectKey`),
    INDEX `Photo_albumId_status_idx`(`albumId`, `status`),
    INDEX `Photo_invitationId_idx`(`invitationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuestbookEntry` (
    `id` CHAR(36) NOT NULL,
    `invitationId` CHAR(36) NULL,
    `authorName` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'HIDDEN') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GuestbookEntry_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `GuestbookEntry_invitationId_idx`(`invitationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Gift` (
    `id` CHAR(36) NOT NULL,
    `invitationId` CHAR(36) NULL,
    `eventId` CHAR(36) NULL,
    `giverName` VARCHAR(191) NOT NULL,
    `method` ENUM('CASH', 'BANK_TRANSFER', 'GOLD', 'OTHER') NOT NULL,
    `amount` BIGINT NULL,
    `description` VARCHAR(191) NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Gift_invitationId_idx`(`invitationId`),
    INDEX `Gift_eventId_idx`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankAccount` (
    `id` CHAR(36) NOT NULL,
    `side` ENUM('BRIDE', 'GROOM', 'BOTH') NOT NULL,
    `bankBin` VARCHAR(8) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdminUser` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdminUser_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Guest` ADD CONSTRAINT `Guest_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvitationEvent` ADD CONSTRAINT `InvitationEvent_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvitationEvent` ADD CONSTRAINT `InvitationEvent_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvitationEvent` ADD CONSTRAINT `InvitationEvent_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `Table`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Table` ADD CONSTRAINT `Table_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Photo` ADD CONSTRAINT `Photo_albumId_fkey` FOREIGN KEY (`albumId`) REFERENCES `Album`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Photo` ADD CONSTRAINT `Photo_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuestbookEntry` ADD CONSTRAINT `GuestbookEntry_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Gift` ADD CONSTRAINT `Gift_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Gift` ADD CONSTRAINT `Gift_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
