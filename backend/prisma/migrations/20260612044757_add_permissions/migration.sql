/*
  Warnings:

  - You are about to alter the column `key` on the `Permission` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(100)`.
  - You are about to alter the column `group` on the `Permission` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(50)`.
  - Added the required column `updatedAt` to the `Permission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UserPermission` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- DropIndex
ALTER TABLE [dbo].[Permission] DROP CONSTRAINT [Permission_key_key];

-- AlterTable
ALTER TABLE [dbo].[Permission] ALTER COLUMN [key] VARCHAR(100) NOT NULL;
ALTER TABLE [dbo].[Permission] ALTER COLUMN [group] VARCHAR(50) NOT NULL;
ALTER TABLE [dbo].[Permission] ADD [createdAt] DATETIME2 NOT NULL CONSTRAINT [Permission_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
[updatedAt] DATETIME2 NOT NULL;

-- AlterTable
ALTER TABLE [dbo].[UserPermission] ADD [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserPermission_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
[updatedAt] DATETIME2 NOT NULL;

-- CreateIndex
ALTER TABLE [dbo].[Permission] ADD CONSTRAINT [Permission_key_key] UNIQUE NONCLUSTERED ([key]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
