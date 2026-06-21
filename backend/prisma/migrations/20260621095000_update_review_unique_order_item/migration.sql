BEGIN TRY

BEGIN TRAN;

-- Drop old unique constraint that allowed only one review per user/product.
ALTER TABLE [dbo].[Review] DROP CONSTRAINT [Review_userId_productId_key];

-- Add new unique constraint that allows one review per order item.
ALTER TABLE [dbo].[Review] ADD CONSTRAINT [Review_userId_orderItemId_key] UNIQUE NONCLUSTERED ([userId], [orderItemId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH