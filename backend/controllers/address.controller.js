import prisma from '../prismaClient.js';

export const getAddresses = async (req, res) => {
  try {
    const addresses = await prisma.customerAddress.findMany({
      where: { userId: req.user.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    res.status(200).json(addresses);
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addAddress = async (req, res) => {
  try {
    const { fullName, phone, province, district, ward, addressLine, isDefault } = req.body;
    const userId = req.user.id;

    if (isDefault) {
      await prisma.customerAddress.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }

    const newAddress = await prisma.customerAddress.create({
      data: {
        userId,
        fullName,
        phone,
        province,
        district,
        ward,
        addressLine,
        isDefault: isDefault || false
      }
    });

    res.status(201).json(newAddress);
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, province, district, ward, addressLine, isDefault } = req.body;
    const userId = req.user.id;

    const existing = await prisma.customerAddress.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ message: 'Address not found' });
    }

    if (isDefault) {
      await prisma.customerAddress.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }

    const updatedAddress = await prisma.customerAddress.update({
      where: { id: parseInt(id) },
      data: {
        fullName,
        phone,
        province,
        district,
        ward,
        addressLine,
        isDefault
      }
    });

    res.status(200).json(updatedAddress);
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.customerAddress.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ message: 'Address not found' });
    }

    await prisma.customerAddress.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({ message: 'Address deleted' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.customerAddress.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ message: 'Address not found' });
    }

    await prisma.customerAddress.updateMany({
      where: { userId },
      data: { isDefault: false }
    });

    const updated = await prisma.customerAddress.update({
      where: { id: parseInt(id) },
      data: { isDefault: true }
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
