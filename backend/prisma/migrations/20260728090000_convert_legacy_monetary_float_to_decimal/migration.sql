-- Preserve the legacy monetary columns' numeric values while replacing binary
-- floating-point storage with exact decimal storage. Existing API boundaries
-- continue to serialize these values as numbers.
ALTER TABLE [dbo].[Product] ALTER COLUMN [price] DECIMAL(18, 2) NOT NULL;

ALTER TABLE [dbo].[Order] ALTER COLUMN [totalAmount] DECIMAL(18, 2) NOT NULL;

ALTER TABLE [dbo].[OrderItem] ALTER COLUMN [price] DECIMAL(18, 2) NOT NULL;
ALTER TABLE [dbo].[OrderItem] ALTER COLUMN [originalPrice] DECIMAL(18, 2) NULL;

DECLARE @discountAmountDefaultConstraint sysname;
SELECT @discountAmountDefaultConstraint = [dc].[name]
FROM [sys].[default_constraints] AS [dc]
INNER JOIN [sys].[columns] AS [c]
  ON [c].[default_object_id] = [dc].[object_id]
INNER JOIN [sys].[tables] AS [t]
  ON [t].[object_id] = [c].[object_id]
INNER JOIN [sys].[schemas] AS [s]
  ON [s].[schema_id] = [t].[schema_id]
WHERE [s].[name] = N'dbo'
  AND [t].[name] = N'OrderItem'
  AND [c].[name] = N'discountAmount';

IF @discountAmountDefaultConstraint IS NOT NULL
BEGIN
  DECLARE @dropDiscountAmountDefaultConstraintSql nvarchar(max);
  SET @dropDiscountAmountDefaultConstraintSql = N'ALTER TABLE [dbo].[OrderItem] DROP CONSTRAINT [' + REPLACE(@discountAmountDefaultConstraint, N']', N']]') + N']';
  EXEC sp_executesql @dropDiscountAmountDefaultConstraintSql;
END;

ALTER TABLE [dbo].[OrderItem] ALTER COLUMN [discountAmount] DECIMAL(18, 2) NULL;
ALTER TABLE [dbo].[OrderItem] ADD CONSTRAINT [OrderItem_discountAmount_df] DEFAULT (0) FOR [discountAmount];
ALTER TABLE [dbo].[OrderItem] ALTER COLUMN [finalPrice] DECIMAL(18, 2) NULL;
ALTER TABLE [dbo].[OrderItem] ALTER COLUMN [subtotal] DECIMAL(18, 2) NOT NULL;

ALTER TABLE [dbo].[Promotion] ALTER COLUMN [discountValue] DECIMAL(18, 2) NOT NULL;
