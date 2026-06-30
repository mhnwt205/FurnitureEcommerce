CREATE TABLE [dbo].[Notification] (
    [id] INT NOT NULL IDENTITY(1,1),
    [recipientId] INT NOT NULL,
    [actorId] INT,
    [type] VARCHAR(100) NOT NULL,
    [module] VARCHAR(100) NOT NULL,
    [entityType] VARCHAR(100),
    [entityId] INT,
    [title] NVARCHAR(255) NOT NULL,
    [message] NVARCHAR(MAX) NOT NULL,
    [metadataJson] NVARCHAR(MAX),
    [readAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Notification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Notification_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [Notification_recipientId_readAt_idx] ON [dbo].[Notification]([recipientId], [readAt]);
CREATE NONCLUSTERED INDEX [Notification_recipientId_createdAt_idx] ON [dbo].[Notification]([recipientId], [createdAt]);
CREATE NONCLUSTERED INDEX [Notification_module_idx] ON [dbo].[Notification]([module]);
CREATE NONCLUSTERED INDEX [Notification_entityType_entityId_idx] ON [dbo].[Notification]([entityType], [entityId]);

ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_recipientId_fkey] FOREIGN KEY ([recipientId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_actorId_fkey] FOREIGN KEY ([actorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;