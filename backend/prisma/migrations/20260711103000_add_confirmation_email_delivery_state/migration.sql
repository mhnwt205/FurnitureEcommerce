BEGIN TRY

BEGIN TRAN;

-- Add order confirmation email delivery state for atomic claim/retry handling.
ALTER TABLE [dbo].[Order] ADD
    [confirmationEmailStatus] VARCHAR(50),
    [confirmationEmailClaimedAt] DATETIME2,
    [confirmationEmailAttemptCount] INT NOT NULL CONSTRAINT [Order_confirmationEmailAttemptCount_df] DEFAULT 0,
    [confirmationEmailLastErrorAt] DATETIME2,
    [confirmationEmailLastErrorCode] VARCHAR(100);

-- Supports retry scans and stale sending-claim recovery.
CREATE NONCLUSTERED INDEX [Order_confirmationEmailStatus_confirmationEmailClaimedAt_idx]
ON [dbo].[Order]([confirmationEmailStatus], [confirmationEmailClaimedAt]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH
