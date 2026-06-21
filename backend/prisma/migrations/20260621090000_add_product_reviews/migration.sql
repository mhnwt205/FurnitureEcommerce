BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Review] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productId] INT NOT NULL,
    [userId] INT NOT NULL,
    [orderId] INT NOT NULL,
    [orderItemId] INT,
    [rating] INT NOT NULL,
    [comment] NVARCHAR(max),
    [images] NVARCHAR(max),
    [isApproved] BIT NOT NULL CONSTRAINT [Review_isApproved_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Review_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Review_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Review_userId_productId_key] UNIQUE NONCLUSTERED ([userId],[productId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Review_productId_isApproved_idx] ON [dbo].[Review]([productId], [isApproved]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Review_userId_idx] ON [dbo].[Review]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Review_orderId_idx] ON [dbo].[Review]([orderId]);

-- AddForeignKey
ALTER TABLE [dbo].[Review] ADD CONSTRAINT [Review_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Review] ADD CONSTRAINT [Review_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Review] ADD CONSTRAINT [Review_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Review] ADD CONSTRAINT [Review_orderItemId_fkey] FOREIGN KEY ([orderItemId]) REFERENCES [dbo].[OrderItem]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
