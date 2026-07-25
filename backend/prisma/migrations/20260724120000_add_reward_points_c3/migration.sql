BEGIN TRY
    BEGIN TRANSACTION;

    CREATE TABLE [dbo].[LoyaltyAccount] (
        [userId] INT NOT NULL,
        [pointBalance] INT NOT NULL CONSTRAINT [LoyaltyAccount_pointBalance_df] DEFAULT 0,
        [lifetimePoints] INT NOT NULL CONSTRAINT [LoyaltyAccount_lifetimePoints_df] DEFAULT 0,
        [currentTier] VARCHAR(50),
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [LoyaltyAccount_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [LoyaltyAccount_pkey] PRIMARY KEY CLUSTERED ([userId]),
        CONSTRAINT [LoyaltyAccount_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    CREATE TABLE [dbo].[PointLedger] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [userId] INT NOT NULL,
        [orderId] INT,
        [entryType] VARCHAR(50) NOT NULL,
        [sourceType] VARCHAR(50) NOT NULL,
        [sourceId] INT NOT NULL,
        [pointsDelta] INT NOT NULL,
        [reason] NVARCHAR(1000),
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [PointLedger_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [PointLedger_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [PointLedger_sourceType_sourceId_entryType_key] UNIQUE ([sourceType], [sourceId], [entryType]),
        CONSTRAINT [PointLedger_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [PointLedger_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    CREATE TABLE [dbo].[LoyaltyOrderProcessing] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [orderId] INT NOT NULL,
        [userId] INT NOT NULL,
        [earnedLedgerId] INT,
        [reversedLedgerId] INT,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [LoyaltyOrderProcessing_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [LoyaltyOrderProcessing_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [LoyaltyOrderProcessing_orderId_key] UNIQUE ([orderId]),
        CONSTRAINT [LoyaltyOrderProcessing_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [LoyaltyOrderProcessing_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [LoyaltyOrderProcessing_earnedLedgerId_fkey] FOREIGN KEY ([earnedLedgerId]) REFERENCES [dbo].[PointLedger]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [LoyaltyOrderProcessing_reversedLedgerId_fkey] FOREIGN KEY ([reversedLedgerId]) REFERENCES [dbo].[PointLedger]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    CREATE INDEX [PointLedger_userId_createdAt_idx] ON [dbo].[PointLedger]([userId], [createdAt]);
    CREATE INDEX [PointLedger_userId_entryType_createdAt_idx] ON [dbo].[PointLedger]([userId], [entryType], [createdAt]);
    CREATE INDEX [PointLedger_orderId_idx] ON [dbo].[PointLedger]([orderId]);
    CREATE UNIQUE INDEX [LoyaltyOrderProcessing_earnedLedgerId_unique]
        ON [dbo].[LoyaltyOrderProcessing]([earnedLedgerId])
        WHERE [earnedLedgerId] IS NOT NULL;
    CREATE UNIQUE INDEX [LoyaltyOrderProcessing_reversedLedgerId_unique]
        ON [dbo].[LoyaltyOrderProcessing]([reversedLedgerId])
        WHERE [reversedLedgerId] IS NOT NULL;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
