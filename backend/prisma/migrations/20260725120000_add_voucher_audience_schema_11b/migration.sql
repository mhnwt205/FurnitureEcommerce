BEGIN TRY
    BEGIN TRANSACTION;

    ALTER TABLE [dbo].[VoucherDefinition]
        ADD [audienceType] VARCHAR(50) NULL,
            [minimumTier] VARCHAR(50) NULL;

    CREATE TABLE [dbo].[TierVoucherClaim] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [userId] INT NOT NULL,
        [voucherDefinitionId] INT NOT NULL,
        [userVoucherId] INT NULL,
        [tierAtClaim] VARCHAR(50) NOT NULL,
        [claimedAt] DATETIME2 NOT NULL CONSTRAINT [TierVoucherClaim_claimedAt_df] DEFAULT CURRENT_TIMESTAMP,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [TierVoucherClaim_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [TierVoucherClaim_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [TierVoucherClaim_userId_voucherDefinitionId_key] UNIQUE ([userId], [voucherDefinitionId]),
        CONSTRAINT [TierVoucherClaim_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [TierVoucherClaim_voucherDefinitionId_fkey] FOREIGN KEY ([voucherDefinitionId]) REFERENCES [dbo].[VoucherDefinition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [TierVoucherClaim_userVoucherId_fkey] FOREIGN KEY ([userVoucherId]) REFERENCES [dbo].[UserVoucher]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    CREATE INDEX [TierVoucherClaim_userId_idx] ON [dbo].[TierVoucherClaim]([userId]);
    CREATE INDEX [TierVoucherClaim_voucherDefinitionId_idx] ON [dbo].[TierVoucherClaim]([voucherDefinitionId]);
    CREATE UNIQUE INDEX [TierVoucherClaim_userVoucherId_unique]
        ON [dbo].[TierVoucherClaim]([userVoucherId])
        WHERE [userVoucherId] IS NOT NULL;

    EXEC sp_executesql N'
        ALTER TABLE [dbo].[VoucherDefinition]
            ADD CONSTRAINT [VoucherDefinition_audienceType_ck]
                CHECK ([audienceType] IS NULL OR [audienceType] IN (''PUBLIC'', ''MINIMUM_TIER'', ''POINT_REDEMPTION'', ''ADMIN_ASSIGNMENT'')),
                CONSTRAINT [VoucherDefinition_audienceMinimumTier_ck]
                CHECK (
                    ([audienceType] IS NULL AND [minimumTier] IS NULL)
                    OR ([audienceType] = ''MINIMUM_TIER'' AND [minimumTier] IN (''BRONZE'', ''SILVER'', ''GOLD'', ''DIAMOND''))
                    OR ([audienceType] IN (''PUBLIC'', ''POINT_REDEMPTION'', ''ADMIN_ASSIGNMENT'') AND [minimumTier] IS NULL)
                );';

    EXEC sp_executesql N'
        UPDATE [dbo].[VoucherDefinition]
        SET [audienceType] = ''POINT_REDEMPTION''
        WHERE EXISTS (
            SELECT 1 FROM [dbo].[RewardCatalogItem]
            WHERE [RewardCatalogItem].[voucherDefinitionId] = [VoucherDefinition].[id]
        );';

    EXEC sp_executesql N'
        UPDATE [dbo].[VoucherDefinition]
        SET [audienceType] = ''PUBLIC''
        WHERE [publicClaimEnabled] = 1
          AND NOT EXISTS (
            SELECT 1 FROM [dbo].[RewardCatalogItem]
            WHERE [RewardCatalogItem].[voucherDefinitionId] = [VoucherDefinition].[id]
        );';

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- Read-only validation/report queries after migration:
-- SELECT [id] FROM [dbo].[VoucherDefinition] WHERE [audienceType] IS NULL;
-- SELECT [id] FROM [dbo].[VoucherDefinition] WHERE [publicClaimEnabled] = 1 AND EXISTS (SELECT 1 FROM [dbo].[RewardCatalogItem] WHERE [voucherDefinitionId] = [VoucherDefinition].[id]);
-- SELECT [id] FROM [dbo].[VoucherDefinition] WHERE [audienceType] = 'PUBLIC' AND [minimumTier] IS NOT NULL;
-- SELECT [id] FROM [dbo].[VoucherDefinition] WHERE [audienceType] = 'MINIMUM_TIER' AND [minimumTier] IS NULL;
-- SELECT [id] FROM [dbo].[VoucherDefinition] WHERE [audienceType] = 'PUBLIC' AND [publicClaimEnabled] = 0;
