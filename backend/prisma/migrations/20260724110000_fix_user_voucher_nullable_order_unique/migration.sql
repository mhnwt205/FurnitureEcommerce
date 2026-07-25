ALTER TABLE [dbo].[UserVoucher]
DROP CONSTRAINT [UserVoucher_currentUsedOrderId_key];

CREATE UNIQUE INDEX [UserVoucher_currentUsedOrderId_unique]
ON [dbo].[UserVoucher]([currentUsedOrderId])
WHERE [currentUsedOrderId] IS NOT NULL;
