BEGIN TRY
    BEGIN TRANSACTION;

    ALTER TABLE [dbo].[PaymentRefund]
    ADD [processedByUserId] INT,
        [processedByName] NVARCHAR(255),
        [adminNote] NVARCHAR(1000),
        [processingStartedAt] DATETIME2;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
