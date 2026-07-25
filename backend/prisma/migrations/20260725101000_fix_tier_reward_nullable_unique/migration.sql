BEGIN TRY
    BEGIN TRANSACTION;

    ALTER TABLE [dbo].[UserTierAchievement]
        DROP CONSTRAINT [UserTierAchievement_rewardUserVoucherId_key];

    CREATE UNIQUE INDEX [UserTierAchievement_rewardUserVoucherId_unique]
        ON [dbo].[UserTierAchievement]([rewardUserVoucherId])
        WHERE [rewardUserVoucherId] IS NOT NULL;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
