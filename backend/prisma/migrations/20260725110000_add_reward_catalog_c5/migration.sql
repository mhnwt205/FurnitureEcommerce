BEGIN TRY
    BEGIN TRANSACTION;

    CREATE TABLE [dbo].[RewardCatalogItem] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [voucherDefinitionId] INT NOT NULL,
        [pointCost] INT NOT NULL,
        [inventoryLimit] INT,
        [redeemedCount] INT NOT NULL CONSTRAINT [RewardCatalogItem_redeemedCount_df] DEFAULT 0,
        [isActive] BIT NOT NULL CONSTRAINT [RewardCatalogItem_isActive_df] DEFAULT 1,
        [validityDays] INT,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [RewardCatalogItem_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [RewardCatalogItem_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [RewardCatalogItem_voucherDefinitionId_key] UNIQUE ([voucherDefinitionId]),
        CONSTRAINT [RewardCatalogItem_voucherDefinitionId_fkey] FOREIGN KEY ([voucherDefinitionId]) REFERENCES [dbo].[VoucherDefinition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    CREATE TABLE [dbo].[RewardRedemption] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [userId] INT NOT NULL,
        [rewardCatalogItemId] INT NOT NULL,
        [pointCost] INT NOT NULL,
        [pointLedgerId] INT,
        [userVoucherId] INT,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [RewardRedemption_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [RewardRedemption_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [RewardRedemption_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [RewardRedemption_rewardCatalogItemId_fkey] FOREIGN KEY ([rewardCatalogItemId]) REFERENCES [dbo].[RewardCatalogItem]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [RewardRedemption_pointLedgerId_fkey] FOREIGN KEY ([pointLedgerId]) REFERENCES [dbo].[PointLedger]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [RewardRedemption_userVoucherId_fkey] FOREIGN KEY ([userVoucherId]) REFERENCES [dbo].[UserVoucher]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    CREATE INDEX [RewardCatalogItem_isActive_idx] ON [dbo].[RewardCatalogItem]([isActive]);
    CREATE INDEX [RewardRedemption_userId_createdAt_idx] ON [dbo].[RewardRedemption]([userId], [createdAt]);
    CREATE INDEX [RewardRedemption_rewardCatalogItemId_createdAt_idx] ON [dbo].[RewardRedemption]([rewardCatalogItemId], [createdAt]);
    CREATE UNIQUE INDEX [RewardRedemption_pointLedgerId_unique] ON [dbo].[RewardRedemption]([pointLedgerId]) WHERE [pointLedgerId] IS NOT NULL;
    CREATE UNIQUE INDEX [RewardRedemption_userVoucherId_unique] ON [dbo].[RewardRedemption]([userVoucherId]) WHERE [userVoucherId] IS NOT NULL;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
