BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[OrderStatusHistory] (
    [id] INT NOT NULL IDENTITY(1,1),
    [orderId] INT NOT NULL,
    [fromStatus] VARCHAR(50),
    [toStatus] VARCHAR(50) NOT NULL,
    [note] NVARCHAR(max),
    [cancelReason] NVARCHAR(max),
    [changedById] INT,
    [changedByName] NVARCHAR(255),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OrderStatusHistory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [OrderStatusHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[OrderStatusHistory] ADD CONSTRAINT [OrderStatusHistory_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
