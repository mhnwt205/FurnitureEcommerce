BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Promotion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max),
    [discountType] VARCHAR(50) NOT NULL,
    [discountValue] FLOAT(53) NOT NULL,
    [status] VARCHAR(50) NOT NULL CONSTRAINT [Promotion_status_df] DEFAULT 'draft',
    [priority] INT NOT NULL CONSTRAINT [Promotion_priority_df] DEFAULT 0,
    [startAt] DATETIME2 NOT NULL,
    [endAt] DATETIME2 NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Promotion_isActive_df] DEFAULT 1,
    [createdById] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Promotion_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Promotion_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PromotionProduct] (
    [promotionId] INT NOT NULL,
    [productId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PromotionProduct_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PromotionProduct_pkey] PRIMARY KEY CLUSTERED ([promotionId], [productId])
);

-- CreateTable
CREATE TABLE [dbo].[PromotionCategory] (
    [promotionId] INT NOT NULL,
    [categoryId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PromotionCategory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PromotionCategory_pkey] PRIMARY KEY CLUSTERED ([promotionId], [categoryId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Promotion_status_idx] ON [dbo].[Promotion]([status]);
CREATE NONCLUSTERED INDEX [Promotion_isActive_idx] ON [dbo].[Promotion]([isActive]);
CREATE NONCLUSTERED INDEX [Promotion_startAt_idx] ON [dbo].[Promotion]([startAt]);
CREATE NONCLUSTERED INDEX [Promotion_endAt_idx] ON [dbo].[Promotion]([endAt]);
CREATE NONCLUSTERED INDEX [Promotion_priority_idx] ON [dbo].[Promotion]([priority]);
CREATE NONCLUSTERED INDEX [Promotion_createdById_idx] ON [dbo].[Promotion]([createdById]);
CREATE NONCLUSTERED INDEX [PromotionProduct_promotionId_idx] ON [dbo].[PromotionProduct]([promotionId]);
CREATE NONCLUSTERED INDEX [PromotionProduct_productId_idx] ON [dbo].[PromotionProduct]([productId]);
CREATE NONCLUSTERED INDEX [PromotionCategory_promotionId_idx] ON [dbo].[PromotionCategory]([promotionId]);
CREATE NONCLUSTERED INDEX [PromotionCategory_categoryId_idx] ON [dbo].[PromotionCategory]([categoryId]);

-- AddForeignKey
ALTER TABLE [dbo].[Promotion] ADD CONSTRAINT [Promotion_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionProduct] ADD CONSTRAINT [PromotionProduct_promotionId_fkey] FOREIGN KEY ([promotionId]) REFERENCES [dbo].[Promotion]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionProduct] ADD CONSTRAINT [PromotionProduct_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionCategory] ADD CONSTRAINT [PromotionCategory_promotionId_fkey] FOREIGN KEY ([promotionId]) REFERENCES [dbo].[Promotion]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PromotionCategory] ADD CONSTRAINT [PromotionCategory_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

IF NOT EXISTS (SELECT 1 FROM [dbo].[Permission] WHERE [key] = 'promotion.view')
BEGIN
    INSERT INTO [dbo].[Permission] ([key], [name], [group], [description], [createdAt], [updatedAt])
    VALUES ('promotion.view', N'Xem khuyen mai', 'Promotions', N'Cho phep xem danh sach va chi tiet khuyen mai', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[Permission] WHERE [key] = 'promotion.create')
BEGIN
    INSERT INTO [dbo].[Permission] ([key], [name], [group], [description], [createdAt], [updatedAt])
    VALUES ('promotion.create', N'Them khuyen mai', 'Promotions', N'Cho phep tao khuyen mai moi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[Permission] WHERE [key] = 'promotion.update')
BEGIN
    INSERT INTO [dbo].[Permission] ([key], [name], [group], [description], [createdAt], [updatedAt])
    VALUES ('promotion.update', N'Sua khuyen mai', 'Promotions', N'Cho phep cap nhat thong tin khuyen mai', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[Permission] WHERE [key] = 'promotion.delete')
BEGIN
    INSERT INTO [dbo].[Permission] ([key], [name], [group], [description], [createdAt], [updatedAt])
    VALUES ('promotion.delete', N'Xoa khuyen mai', 'Promotions', N'Cho phep xoa hoac vo hieu hoa khuyen mai', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH