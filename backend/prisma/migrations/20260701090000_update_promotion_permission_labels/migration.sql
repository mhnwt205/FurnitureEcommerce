UPDATE [dbo].[Permission]
SET [name] = N'Xem khuyến mãi',
    [group] = N'Khuyến mãi',
    [description] = N'Cho phép xem danh sách và chi tiết khuyến mãi',
    [updatedAt] = CURRENT_TIMESTAMP
WHERE [key] = 'promotion.view';

UPDATE [dbo].[Permission]
SET [name] = N'Thêm khuyến mãi',
    [group] = N'Khuyến mãi',
    [description] = N'Cho phép tạo khuyến mãi mới',
    [updatedAt] = CURRENT_TIMESTAMP
WHERE [key] = 'promotion.create';

UPDATE [dbo].[Permission]
SET [name] = N'Sửa khuyến mãi',
    [group] = N'Khuyến mãi',
    [description] = N'Cho phép cập nhật thông tin khuyến mãi',
    [updatedAt] = CURRENT_TIMESTAMP
WHERE [key] = 'promotion.update';

UPDATE [dbo].[Permission]
SET [name] = N'Xóa khuyến mãi',
    [group] = N'Khuyến mãi',
    [description] = N'Cho phép xóa hoặc vô hiệu hóa khuyến mãi',
    [updatedAt] = CURRENT_TIMESTAMP
WHERE [key] = 'promotion.delete';