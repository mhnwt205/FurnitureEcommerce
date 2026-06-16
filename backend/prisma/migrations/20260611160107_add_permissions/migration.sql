BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Permission] (
    [id] INT NOT NULL IDENTITY(1,1),
    [key] VARCHAR(255) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [group] VARCHAR(100) NOT NULL,
    [description] NVARCHAR(max),
    CONSTRAINT [Permission_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Permission_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[UserPermission] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [permissionId] INT NOT NULL,
    CONSTRAINT [UserPermission_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserPermission_userId_permissionId_key] UNIQUE NONCLUSTERED ([userId],[permissionId])
);

-- AddForeignKey
ALTER TABLE [dbo].[UserPermission] ADD CONSTRAINT [UserPermission_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserPermission] ADD CONSTRAINT [UserPermission_permissionId_fkey] FOREIGN KEY ([permissionId]) REFERENCES [dbo].[Permission]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
