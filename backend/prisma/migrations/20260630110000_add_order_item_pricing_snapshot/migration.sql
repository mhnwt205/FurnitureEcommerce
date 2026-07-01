BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[OrderItem] ADD [originalPrice] FLOAT(53);
ALTER TABLE [dbo].[OrderItem] ADD [discountAmount] FLOAT(53) CONSTRAINT [OrderItem_discountAmount_df] DEFAULT 0;
ALTER TABLE [dbo].[OrderItem] ADD [finalPrice] FLOAT(53);
ALTER TABLE [dbo].[OrderItem] ADD [promotionId] INT;
ALTER TABLE [dbo].[OrderItem] ADD [promotionName] NVARCHAR(255);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH