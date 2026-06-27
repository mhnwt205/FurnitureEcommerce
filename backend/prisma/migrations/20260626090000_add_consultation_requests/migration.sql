BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ConsultationRequest] (
    [id] INT NOT NULL IDENTITY(1,1),
    [requestCode] VARCHAR(50) NOT NULL,
    [customerId] INT,
    [assignedStaffId] INT,
    [fullName] NVARCHAR(255) NOT NULL,
    [phone] VARCHAR(20) NOT NULL,
    [email] VARCHAR(255),
    [projectType] NVARCHAR(100),
    [roomType] NVARCHAR(100),
    [budgetRange] NVARCHAR(100),
    [preferredContact] NVARCHAR(100),
    [message] NVARCHAR(max),
    [source] VARCHAR(100),
    [status] VARCHAR(50) NOT NULL CONSTRAINT [ConsultationRequest_status_df] DEFAULT 'new',
    [internalNote] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ConsultationRequest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [ConsultationRequest_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ConsultationRequest_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ConsultationRequest_requestCode_key] UNIQUE NONCLUSTERED ([requestCode])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ConsultationRequest_status_idx] ON [dbo].[ConsultationRequest]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ConsultationRequest_createdAt_idx] ON [dbo].[ConsultationRequest]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ConsultationRequest_phone_idx] ON [dbo].[ConsultationRequest]([phone]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ConsultationRequest_email_idx] ON [dbo].[ConsultationRequest]([email]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ConsultationRequest_customerId_idx] ON [dbo].[ConsultationRequest]([customerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ConsultationRequest_assignedStaffId_idx] ON [dbo].[ConsultationRequest]([assignedStaffId]);

-- AddForeignKey
ALTER TABLE [dbo].[ConsultationRequest] ADD CONSTRAINT [ConsultationRequest_customerId_fkey] FOREIGN KEY ([customerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ConsultationRequest] ADD CONSTRAINT [ConsultationRequest_assignedStaffId_fkey] FOREIGN KEY ([assignedStaffId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH