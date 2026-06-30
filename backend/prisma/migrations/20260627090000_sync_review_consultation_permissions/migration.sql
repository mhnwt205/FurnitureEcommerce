IF NOT EXISTS (SELECT 1 FROM [dbo].[Permission] WHERE [key] = 'review.view')
BEGIN
    INSERT INTO [dbo].[Permission] ([key], [name], [group], [description], [createdAt], [updatedAt])
    VALUES ('review.view', N'Xem đánh giá', 'Reviews', N'Cho phép xem danh sách đánh giá sản phẩm', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[Permission] WHERE [key] = 'review.update')
BEGIN
    INSERT INTO [dbo].[Permission] ([key], [name], [group], [description], [createdAt], [updatedAt])
    VALUES ('review.update', N'Duyệt đánh giá', 'Reviews', N'Cho phép ẩn/hiện đánh giá sản phẩm', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[Permission] WHERE [key] = 'consultation.view')
BEGIN
    INSERT INTO [dbo].[Permission] ([key], [name], [group], [description], [createdAt], [updatedAt])
    VALUES ('consultation.view', N'Xem yêu cầu tư vấn', 'Consultations', N'Cho phép xem danh sách và chi tiết yêu cầu tư vấn', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END

IF NOT EXISTS (SELECT 1 FROM [dbo].[Permission] WHERE [key] = 'consultation.update')
BEGIN
    INSERT INTO [dbo].[Permission] ([key], [name], [group], [description], [createdAt], [updatedAt])
    VALUES ('consultation.update', N'Cập nhật yêu cầu tư vấn', 'Consultations', N'Cho phép phân công, ghi chú và cập nhật trạng thái yêu cầu tư vấn', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
END