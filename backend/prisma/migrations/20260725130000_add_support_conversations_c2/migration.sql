BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[Conversation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [customerId] INT NOT NULL,
    [assignedStaffId] INT,
    [status] VARCHAR(20) NOT NULL,
    [lastMessageAt] DATETIME2,
    [lastMessagePreview] NVARCHAR(200),
    [lastSenderRole] VARCHAR(20),
    [customerLastReadAt] DATETIME2,
    [customerLastReadMessageId] INT,
    [staffLastReadAt] DATETIME2,
    [staffLastReadMessageId] INT,
    [closedAt] DATETIME2,
    [closedById] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Conversation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Conversation_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[ConversationMessage] (
    [id] INT NOT NULL IDENTITY(1,1),
    [conversationId] INT NOT NULL,
    [senderId] INT NOT NULL,
    [senderRole] VARCHAR(20) NOT NULL,
    [messageType] VARCHAR(20) NOT NULL CONSTRAINT [ConversationMessage_messageType_df] DEFAULT 'TEXT',
    [content] NVARCHAR(2000) NOT NULL,
    [clientMessageId] VARCHAR(64) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ConversationMessage_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ConversationMessage_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ConversationMessage_conversationId_senderId_clientMessageId_key] UNIQUE NONCLUSTERED ([conversationId], [senderId], [clientMessageId])
);

CREATE NONCLUSTERED INDEX [Conversation_customerId_status_lastMessageAt_id_idx]
ON [dbo].[Conversation]([customerId], [status], [lastMessageAt], [id]);

CREATE NONCLUSTERED INDEX [Conversation_status_assignedStaffId_lastMessageAt_id_idx]
ON [dbo].[Conversation]([status], [assignedStaffId], [lastMessageAt], [id]);

CREATE NONCLUSTERED INDEX [Conversation_assignedStaffId_status_lastMessageAt_id_idx]
ON [dbo].[Conversation]([assignedStaffId], [status], [lastMessageAt], [id]);

CREATE NONCLUSTERED INDEX [Conversation_lastMessageAt_id_idx]
ON [dbo].[Conversation]([lastMessageAt], [id]);

CREATE UNIQUE NONCLUSTERED INDEX [Conversation_customerId_open_unique]
ON [dbo].[Conversation]([customerId])
WHERE [status] IN ('WAITING', 'ACTIVE');

CREATE NONCLUSTERED INDEX [ConversationMessage_conversationId_createdAt_id_idx]
ON [dbo].[ConversationMessage]([conversationId], [createdAt], [id]);

ALTER TABLE [dbo].[Conversation] ADD CONSTRAINT [Conversation_customerId_fkey]
FOREIGN KEY ([customerId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[Conversation] ADD CONSTRAINT [Conversation_assignedStaffId_fkey]
FOREIGN KEY ([assignedStaffId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[Conversation] ADD CONSTRAINT [Conversation_closedById_fkey]
FOREIGN KEY ([closedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[ConversationMessage] ADD CONSTRAINT [ConversationMessage_conversationId_fkey]
FOREIGN KEY ([conversationId]) REFERENCES [dbo].[Conversation]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[ConversationMessage] ADD CONSTRAINT [ConversationMessage_senderId_fkey]
FOREIGN KEY ([senderId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH
