BEGIN TRY
    BEGIN TRANSACTION;

    ALTER TABLE [dbo].[Order] ADD
        [merchandiseOriginalSubtotalVnd] DECIMAL(18,0),
        [promotionDiscountTotalVnd] DECIMAL(18,0),
        [merchandiseAfterPromotionVnd] DECIMAL(18,0),
        [voucherDiscountVnd] DECIMAL(18,0),
        [merchandiseAfterVoucherVnd] DECIMAL(18,0),
        [shippingAmountVnd] DECIMAL(18,0),
        [payableAmountVnd] DECIMAL(18,0);

    CREATE TABLE [dbo].[VoucherDefinition] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [normalizedCode] VARCHAR(100) NOT NULL,
        [name] NVARCHAR(255) NOT NULL,
        [description] NVARCHAR(MAX),
        [discountType] VARCHAR(50) NOT NULL,
        [discountValue] DECIMAL(18,0) NOT NULL,
        [maximumDiscountVnd] DECIMAL(18,0),
        [minimumOrderVnd] DECIMAL(18,0),
        [claimStartsAt] DATETIME2,
        [claimEndsAt] DATETIME2,
        [fixedExpiresAt] DATETIME2,
        [validityDays] INT,
        [publicClaimEnabled] BIT NOT NULL CONSTRAINT [VoucherDefinition_publicClaimEnabled_df] DEFAULT 0,
        [isActive] BIT NOT NULL CONSTRAINT [VoucherDefinition_isActive_df] DEFAULT 1,
        [disabledAt] DATETIME2,
        [disabledReason] NVARCHAR(1000),
        [createdById] INT,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [VoucherDefinition_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [VoucherDefinition_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [VoucherDefinition_normalizedCode_key] UNIQUE ([normalizedCode]),
        CONSTRAINT [VoucherDefinition_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    CREATE TABLE [dbo].[UserVoucher] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [userId] INT NOT NULL,
        [voucherDefinitionId] INT NOT NULL,
        [source] VARCHAR(50) NOT NULL,
        [status] VARCHAR(50) NOT NULL CONSTRAINT [UserVoucher_status_df] DEFAULT 'AVAILABLE',
        [issuedCode] VARCHAR(100) NOT NULL,
        [issuedName] NVARCHAR(255) NOT NULL,
        [issuedDiscountType] VARCHAR(50) NOT NULL,
        [issuedDiscountValue] DECIMAL(18,0) NOT NULL,
        [issuedMaximumDiscountVnd] DECIMAL(18,0),
        [issuedMinimumOrderVnd] DECIMAL(18,0),
        [issuedAt] DATETIME2 NOT NULL CONSTRAINT [UserVoucher_issuedAt_df] DEFAULT CURRENT_TIMESTAMP,
        [expiresAt] DATETIME2 NOT NULL,
        [usedAt] DATETIME2,
        [lastRestoredAt] DATETIME2,
        [currentUsedOrderId] INT,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserVoucher_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [UserVoucher_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [UserVoucher_currentUsedOrderId_key] UNIQUE ([currentUsedOrderId]),
        CONSTRAINT [UserVoucher_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [UserVoucher_voucherDefinitionId_fkey] FOREIGN KEY ([voucherDefinitionId]) REFERENCES [dbo].[VoucherDefinition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [UserVoucher_currentUsedOrderId_fkey] FOREIGN KEY ([currentUsedOrderId]) REFERENCES [dbo].[Order]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    CREATE TABLE [dbo].[PublicVoucherClaim] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [userId] INT NOT NULL,
        [voucherDefinitionId] INT NOT NULL,
        [userVoucherId] INT NOT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [PublicVoucherClaim_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [PublicVoucherClaim_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [PublicVoucherClaim_userVoucherId_key] UNIQUE ([userVoucherId]),
        CONSTRAINT [PublicVoucherClaim_userId_voucherDefinitionId_key] UNIQUE ([userId], [voucherDefinitionId]),
        CONSTRAINT [PublicVoucherClaim_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [PublicVoucherClaim_voucherDefinitionId_fkey] FOREIGN KEY ([voucherDefinitionId]) REFERENCES [dbo].[VoucherDefinition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [PublicVoucherClaim_userVoucherId_fkey] FOREIGN KEY ([userVoucherId]) REFERENCES [dbo].[UserVoucher]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    CREATE TABLE [dbo].[VoucherAssignment] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [actorId] INT NOT NULL,
        [voucherDefinitionId] INT NOT NULL,
        [requestKey] VARCHAR(128) NOT NULL,
        [payloadHash] VARCHAR(128) NOT NULL,
        [reason] NVARCHAR(1000),
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [VoucherAssignment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [VoucherAssignment_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [VoucherAssignment_actorId_requestKey_key] UNIQUE ([actorId], [requestKey]),
        CONSTRAINT [VoucherAssignment_actorId_fkey] FOREIGN KEY ([actorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [VoucherAssignment_voucherDefinitionId_fkey] FOREIGN KEY ([voucherDefinitionId]) REFERENCES [dbo].[VoucherDefinition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    CREATE TABLE [dbo].[VoucherAssignmentRecipient] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [voucherAssignmentId] INT NOT NULL,
        [userId] INT NOT NULL,
        [userVoucherId] INT NOT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [VoucherAssignmentRecipient_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [VoucherAssignmentRecipient_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [VoucherAssignmentRecipient_userVoucherId_key] UNIQUE ([userVoucherId]),
        CONSTRAINT [VoucherAssignmentRecipient_voucherAssignmentId_userId_key] UNIQUE ([voucherAssignmentId], [userId]),
        CONSTRAINT [VoucherAssignmentRecipient_assignment_fkey] FOREIGN KEY ([voucherAssignmentId]) REFERENCES [dbo].[VoucherAssignment]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [VoucherAssignmentRecipient_user_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [VoucherAssignmentRecipient_voucher_fkey] FOREIGN KEY ([userVoucherId]) REFERENCES [dbo].[UserVoucher]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    CREATE TABLE [dbo].[VoucherApplication] (
        [id] INT IDENTITY(1,1) NOT NULL,
        [orderId] INT NOT NULL,
        [userVoucherId] INT NOT NULL,
        [userId] INT NOT NULL,
        [voucherDefinitionId] INT NOT NULL,
        [appliedCode] VARCHAR(100) NOT NULL,
        [appliedName] NVARCHAR(255) NOT NULL,
        [appliedDiscountType] VARCHAR(50) NOT NULL,
        [appliedDiscountValue] DECIMAL(18,0) NOT NULL,
        [appliedMaximumDiscountVnd] DECIMAL(18,0),
        [appliedMinimumOrderVnd] DECIMAL(18,0),
        [subtotalAfterPromotionVnd] DECIMAL(18,0) NOT NULL,
        [voucherDiscountVnd] DECIMAL(18,0) NOT NULL,
        [merchandiseAfterVoucherVnd] DECIMAL(18,0) NOT NULL,
        [appliedAt] DATETIME2 NOT NULL CONSTRAINT [VoucherApplication_appliedAt_df] DEFAULT CURRENT_TIMESTAMP,
        [restoredAt] DATETIME2,
        [restoreTrigger] VARCHAR(50),
        CONSTRAINT [VoucherApplication_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [VoucherApplication_orderId_key] UNIQUE ([orderId]),
        CONSTRAINT [VoucherApplication_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [VoucherApplication_userVoucherId_fkey] FOREIGN KEY ([userVoucherId]) REFERENCES [dbo].[UserVoucher]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [VoucherApplication_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [VoucherApplication_definition_fkey] FOREIGN KEY ([voucherDefinitionId]) REFERENCES [dbo].[VoucherDefinition]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    CREATE INDEX [VoucherDefinition_isActive_publicClaimEnabled_claimStartsAt_claimEndsAt_idx] ON [dbo].[VoucherDefinition]([isActive], [publicClaimEnabled], [claimStartsAt], [claimEndsAt]);
    CREATE INDEX [UserVoucher_userId_status_expiresAt_idx] ON [dbo].[UserVoucher]([userId], [status], [expiresAt]);
    CREATE INDEX [UserVoucher_userId_status_usedAt_idx] ON [dbo].[UserVoucher]([userId], [status], [usedAt]);
    CREATE INDEX [PublicVoucherClaim_voucherDefinitionId_idx] ON [dbo].[PublicVoucherClaim]([voucherDefinitionId]);
    CREATE INDEX [VoucherAssignment_actorId_createdAt_idx] ON [dbo].[VoucherAssignment]([actorId], [createdAt]);
    CREATE INDEX [VoucherAssignmentRecipient_userId_createdAt_idx] ON [dbo].[VoucherAssignmentRecipient]([userId], [createdAt]);
    CREATE INDEX [VoucherApplication_userVoucherId_appliedAt_idx] ON [dbo].[VoucherApplication]([userVoucherId], [appliedAt]);
    CREATE INDEX [VoucherApplication_userId_appliedAt_idx] ON [dbo].[VoucherApplication]([userId], [appliedAt]);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
