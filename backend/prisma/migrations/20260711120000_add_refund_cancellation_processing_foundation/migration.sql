BEGIN TRY
    BEGIN TRANSACTION;

    ALTER TABLE [dbo].[Order]
    ADD [cancellationProcessingAt] DATETIME2,
        [activeRefundRequestId] INT;

    ALTER TABLE [dbo].[PaymentRefund]
    ADD [actorType] VARCHAR(50) NOT NULL,
        [actorUserId] INT,
        [reasonCode] VARCHAR(100) NOT NULL,
        [reasonText] NVARCHAR(1000),
        [originalOrderStatus] VARCHAR(50) NOT NULL,
        [claimedAt] DATETIME2 NOT NULL,
        [providerResponseCode] VARCHAR(100),
        [lastAttemptAt] DATETIME2,
        [attemptCount] INT NOT NULL CONSTRAINT [PaymentRefund_attemptCount_df] DEFAULT 0;

    CREATE NONCLUSTERED INDEX [Order_activeRefundRequestId_idx]
        ON [dbo].[Order]([activeRefundRequestId]);

    CREATE NONCLUSTERED INDEX [PaymentRefund_orderId_status_idx]
        ON [dbo].[PaymentRefund]([orderId], [status]);

    ALTER TABLE [dbo].[Order]
    ADD CONSTRAINT [Order_activeRefundRequestId_fkey]
        FOREIGN KEY ([activeRefundRequestId])
        REFERENCES [dbo].[PaymentRefund]([id])
        ON DELETE NO ACTION
        ON UPDATE NO ACTION;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
