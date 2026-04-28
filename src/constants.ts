import { Type } from "@google/genai";

export const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    orderNumber: { type: Type.STRING, description: "Order number or ID" },
    customerName: { type: Type.STRING, description: "Customer full name" },
    customerPhone: { type: Type.STRING, description: "Customer phone number" },
    deliveryLocation: { type: Type.STRING, description: "Delivery address or location" },
    isPaid: { type: Type.BOOLEAN, description: "True if the order is paid, false otherwise" },
    paymentMethod: { type: Type.STRING, description: "EXTREMELY IMPORTANT: Detect if the payment was 'Cash', 'Visa' (Credit Card), or 'InstaPay'. Look for bank names, card icons, or InstaPay logos/mentions." },
    total: { type: Type.NUMBER, description: "Total amount of the order" },
    shippingCost: { type: Type.NUMBER, description: "Shipping cost if available" },
    discount: { type: Type.NUMBER, description: "Discount amount if available" },
    paidAmount: { type: Type.NUMBER, description: "Amount already paid by the customer" },
    notes: { type: Type.STRING, description: "Any additional notes or instructions found in the invoice" },
    productDetails: { 
      type: Type.ARRAY, 
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Product name or code" },
          unitPrice: { type: Type.NUMBER, description: "Unit price of the product" },
          price: { type: Type.NUMBER, description: "Total price for this item (unitPrice * quantity)" },
          quantity: { type: Type.NUMBER, description: "Product quantity" },
          imageBox: { 
            type: Type.ARRAY, 
            items: { type: Type.NUMBER },
            description: "Bounding box of the product image in the invoice [ymin, xmin, ymax, xmax] normalized 0-1000. ONLY if a clear product image is visible."
          }
        }
      }
    }
  }
};
