BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Order] DROP CONSTRAINT [Order_userId_fkey];

-- Make Order.userId nullable for guest orders while preserving the existing FK semantics.
ALTER TABLE [dbo].[Order] ALTER COLUMN [userId] INT NULL;

-- Add guest order, cancellation, email idempotency, inventory audit, and lifecycle fields.
ALTER TABLE [dbo].[Order] ADD
    [customerEmail] VARCHAR(255) NULL,
    [cancelledAt] DATETIME2,
    [cancelledBy] VARCHAR(50),
    [cancellationReasonCode] VARCHAR(100),
    [cancellationReasonText] NVARCHAR(1000),
    [confirmationEmailSentAt] DATETIME2,
    [cancellationEmailSentAt] DATETIME2,
    [managementTokenHash] VARCHAR(255),
    [managementTokenExpiresAt] DATETIME2,
    [managementTokenRevokedAt] DATETIME2,
    [inventoryRestoredAt] DATETIME2,
    [deliveredAt] DATETIME2;

-- Backfill historical authenticated orders from the related User email snapshot source.
EXEC sys.sp_executesql N'
    UPDATE [o]
    SET [o].[customerEmail] = [u].[email]
    FROM [dbo].[Order] AS [o]
    INNER JOIN [dbo].[User] AS [u] ON [u].[id] = [o].[userId]
    WHERE [o].[customerEmail] IS NULL;
';

EXEC sys.sp_executesql N'
    IF EXISTS (
        SELECT 1
        FROM [dbo].[Order]
        WHERE [customerEmail] IS NULL OR LTRIM(RTRIM([customerEmail])) = ''''
    )
    BEGIN
        THROW 50001, ''Unable to backfill Order.customerEmail safely.'', 1;
    END;
';

EXEC sys.sp_executesql N'
    ALTER TABLE [dbo].[Order] ALTER COLUMN [customerEmail] VARCHAR(255) NOT NULL;
';

-- CreateTable
CREATE TABLE [dbo].[PaymentRefund] (
    [id] INT NOT NULL IDENTITY(1,1),
    [orderId] INT NOT NULL,
    [requestId] VARCHAR(255) NOT NULL,
    [provider] VARCHAR(50) NOT NULL,
    [environment] VARCHAR(50) NOT NULL,
    [amount] DECIMAL(18,2) NOT NULL,
    [status] VARCHAR(50) NOT NULL,
    [providerTransactionId] VARCHAR(255),
    [failureCode] VARCHAR(100),
    [requestedAt] DATETIME2 NOT NULL CONSTRAINT [PaymentRefund_requestedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [processedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PaymentRefund_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PaymentRefund_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PaymentRefund_requestId_key] UNIQUE NONCLUSTERED ([requestId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Order_phone_idx] ON [dbo].[Order]([phone]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Order_paymentStatus_idx] ON [dbo].[Order]([paymentStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Order_managementTokenHash_idx] ON [dbo].[Order]([managementTokenHash]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PaymentRefund_orderId_idx] ON [dbo].[PaymentRefund]([orderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PaymentRefund_status_idx] ON [dbo].[PaymentRefund]([status]);

-- AddForeignKey
ALTER TABLE [dbo].[Order] ADD CONSTRAINT [Order_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PaymentRefund] ADD CONSTRAINT [PaymentRefund_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH
