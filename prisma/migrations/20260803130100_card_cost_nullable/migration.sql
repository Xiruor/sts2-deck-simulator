-- AlterTable: 费用允许为空（诅咒/任务等不可打出牌无费用）
ALTER TABLE `Card` MODIFY `cost` INT NULL;
