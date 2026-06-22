ALTER TABLE [dbo].[Product] ADD [color] NVARCHAR(100),
    [material] NVARCHAR(255),
    [widthCm] FLOAT(53),
    [heightCm] FLOAT(53),
    [depthCm] FLOAT(53),
    [dimensions] NVARCHAR(255),
    [roomType] NVARCHAR(100),
    [style] NVARCHAR(100);

CREATE NONCLUSTERED INDEX [Product_color_idx] ON [dbo].[Product]([color]);
CREATE NONCLUSTERED INDEX [Product_material_idx] ON [dbo].[Product]([material]);
CREATE NONCLUSTERED INDEX [Product_roomType_idx] ON [dbo].[Product]([roomType]);
CREATE NONCLUSTERED INDEX [Product_style_idx] ON [dbo].[Product]([style]);