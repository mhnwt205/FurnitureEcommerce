BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[RefreshSession] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [tokenHash] VARCHAR(255) NOT NULL,
    [familyId] VARCHAR(255) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [revokedAt] DATETIME2,
    [replacedByTokenId] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RefreshSession_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [lastUsedAt] DATETIME2,
    [userAgent] NVARCHAR(512),
    [ipAddressHash] VARCHAR(255),
    CONSTRAINT [RefreshSession_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RefreshSession_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshSession_userId_idx] ON [dbo].[RefreshSession]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshSession_familyId_idx] ON [dbo].[RefreshSession]([familyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshSession_expiresAt_idx] ON [dbo].[RefreshSession]([expiresAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshSession_revokedAt_idx] ON [dbo].[RefreshSession]([revokedAt]);

-- AddForeignKey
ALTER TABLE [dbo].[RefreshSession] ADD CONSTRAINT [RefreshSession_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
