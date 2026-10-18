-- CreateTable
CREATE TABLE `auto_reply_logs` (
    `id` VARCHAR(191) NOT NULL,
    `senderKey` VARCHAR(64) NOT NULL,
    `senderJid` VARCHAR(190) NOT NULL,
    `pushName` VARCHAR(120) NULL,
    `dayKey` CHAR(10) NOT NULL,
    `messageSnapshot` TEXT NOT NULL,
    `providerMessageId` VARCHAR(128) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auto_reply_logs_dayKey_idx`(`dayKey`),
    INDEX `auto_reply_logs_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `auto_reply_logs_senderKey_dayKey_key`(`senderKey`, `dayKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
