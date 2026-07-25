BEGIN TRY
    BEGIN TRANSACTION;

    ALTER TABLE [dbo].[RewardCatalogItem]
        ADD CONSTRAINT [RewardCatalogItem_pointCost_ck] CHECK ([pointCost] > 0),
            CONSTRAINT [RewardCatalogItem_inventoryLimit_ck] CHECK ([inventoryLimit] IS NULL OR [inventoryLimit] >= 0),
            CONSTRAINT [RewardCatalogItem_redeemedCount_ck] CHECK ([redeemedCount] >= 0),
            CONSTRAINT [RewardCatalogItem_inventoryAvailable_ck] CHECK ([inventoryLimit] IS NULL OR [redeemedCount] <= [inventoryLimit]),
            CONSTRAINT [RewardCatalogItem_validityDays_ck] CHECK ([validityDays] IS NULL OR [validityDays] > 0);

    ALTER TABLE [dbo].[RewardRedemption]
        ADD CONSTRAINT [RewardRedemption_pointCost_ck] CHECK ([pointCost] > 0);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
