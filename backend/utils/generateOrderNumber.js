/**
 * Generate unique order number
 * Format: DF-YYYYMMDD-XXXXX (e.g., DF-20240115-00001)
 */
const generateOrderNumber = async (prisma) => {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `DF-${dateStr}-`;

    // Get the last order number for today
    const lastOrder = await prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        orderNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastOrder && lastOrder.orderNumber) {
      const parts = lastOrder.orderNumber.split('-');
      if (parts.length >= 3) {
        const lastSequence = parseInt(parts[2], 10);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
    }

    const sequenceStr = sequence.toString().padStart(5, '0');
    const orderNumber = `${prefix}${sequenceStr}`;
    // Order number generated
    return orderNumber;
  } catch (error) {
    console.error('Error generating order number:', error);
    // Fallback to timestamp-based number
    const timestamp = Date.now();
    return `DF-${timestamp}`;
  }
};

module.exports = generateOrderNumber;

