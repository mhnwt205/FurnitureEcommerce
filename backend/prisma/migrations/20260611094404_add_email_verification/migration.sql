BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[User] ADD [emailVerificationExpires] DATETIME2,
[emailVerificationToken] VARCHAR(255),
[emailVerified] BIT NOT NULL CONSTRAINT [User_emailVerified_df] DEFAULT 0;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
