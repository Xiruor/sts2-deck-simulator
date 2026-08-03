-- AlterTable
-- 先以可空方式新增列，回填存量数据后再收紧为 NOT NULL
ALTER TABLE `Card`
  ADD COLUMN `slug` VARCHAR(191) NULL,
  ADD COLUMN `nameEn` VARCHAR(191) NULL,
  ADD COLUMN `imageNormal` VARCHAR(191) NULL,
  ADD COLUMN `imageUpgraded` VARCHAR(191) NULL,
  ADD COLUMN `upgradedDescription` TEXT NULL;

-- 存量种子数据没有 slug，用占位 slug 回填（后续由 Wiki 导入脚本删除并重建）
UPDATE `Card`
SET `slug` = CONCAT('legacy-', `id`),
    `nameEn` = `name`
WHERE `slug` IS NULL;

-- 收紧 NOT NULL
ALTER TABLE `Card`
  MODIFY `slug` VARCHAR(191) NOT NULL,
  MODIFY `nameEn` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Card_slug_key` ON `Card`(`slug`);

-- AlterTable: 扩展枚举值（新增 QUEST / ANCIENT / EVENT / CURSE / QUEST）
ALTER TABLE `Card`
  MODIFY `type` ENUM('ATTACK', 'SKILL', 'POWER', 'STATUS', 'CURSE', 'QUEST') NOT NULL,
  MODIFY `rarity` ENUM('BASIC', 'COMMON', 'UNCOMMON', 'RARE', 'SPECIAL', 'ANCIENT', 'EVENT', 'CURSE', 'QUEST') NOT NULL;
