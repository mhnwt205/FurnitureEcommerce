UPDATE [dbo].[Permission]
SET [group] = 'Promotions',
    [updatedAt] = CURRENT_TIMESTAMP
WHERE [key] IN ('promotion.view', 'promotion.create', 'promotion.update', 'promotion.delete');