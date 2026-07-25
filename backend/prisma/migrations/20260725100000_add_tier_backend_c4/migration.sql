BEGIN TRY
    BEGIN TRANSACTION;

    CREATE TABLE [dbo].[UserTierAchievement] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [userId] INT NOT NULL,
        [tier] VARCHAR(50) NOT NULL,
        [achievedAt] DATETIME2 NOT NULL CONSTRAINT [UserTierAchievement_achievedAt_df] DEFAULT CURRENT_TIMESTAMP,
        [rewardUserVoucherId] INT,
        [rewardStatus] VARCHAR(50),
        CONSTRAINT [UserTierAchievement_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [UserTierAchievement_userId_tier_key] UNIQUE ([userId], [tier]),
        CONSTRAINT [UserTierAchievement_rewardUserVoucherId_key] UNIQUE ([rewardUserVoucherId]),
        CONSTRAINT [UserTierAchievement_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [UserTierAchievement_rewardUserVoucherId_fkey] FOREIGN KEY ([rewardUserVoucherId]) REFERENCES [dbo].[UserVoucher]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    CREATE INDEX [UserTierAchievement_userId_achievedAt_idx] ON [dbo].[UserTierAchievement]([userId], [achievedAt]);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
