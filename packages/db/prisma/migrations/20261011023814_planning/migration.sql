-- AlterTable
ALTER TABLE `WeddingInfo` ADD COLUMN `budget` BIGINT NULL;

-- CreateTable
CREATE TABLE `Expense` (
    `id` CHAR(36) NOT NULL,
    `category` ENUM('VENUE', 'FOOD', 'ATTIRE', 'PHOTO', 'DECOR', 'CEREMONY', 'INVITATION', 'RINGS', 'BEAUTY', 'ENTERTAINMENT', 'TRANSPORT', 'GIFTS', 'PAPERWORK', 'HONEYMOON', 'OTHER') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `vendor` VARCHAR(191) NULL,
    `estimated` BIGINT NOT NULL DEFAULT 0,
    `side` ENUM('BRIDE', 'GROOM', 'BOTH') NOT NULL DEFAULT 'BOTH',
    `dueDate` DATETIME(3) NULL,
    `note` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Expense_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExpensePayment` (
    `id` CHAR(36) NOT NULL,
    `expenseId` CHAR(36) NOT NULL,
    `amount` BIGINT NOT NULL,
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `note` VARCHAR(191) NULL,

    INDEX `ExpensePayment_expenseId_idx`(`expenseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Task` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `category` ENUM('VENUE', 'FOOD', 'ATTIRE', 'PHOTO', 'DECOR', 'CEREMONY', 'INVITATION', 'RINGS', 'BEAUTY', 'ENTERTAINMENT', 'TRANSPORT', 'GIFTS', 'PAPERWORK', 'HONEYMOON', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `dueDate` DATETIME(3) NULL,
    `doneAt` DATETIME(3) NULL,
    `assignee` ENUM('BRIDE', 'GROOM', 'BOTH') NULL,
    `note` TEXT NULL,
    `expenseId` CHAR(36) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Task_dueDate_idx`(`dueDate`),
    INDEX `Task_expenseId_idx`(`expenseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExpensePayment` ADD CONSTRAINT `ExpensePayment_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `Expense`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `Expense`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
