import {
  withDurableExecution,
} from "@aws/durable-execution-sdk-js";

export const handler = withDurableExecution(
  async (event, context) => {
    const orderId = event.orderId || `order-${Date.now()}`;
    const items = event.items || [];
    
    console.log(`Starting order processing workflow for order ${orderId}`);
    
    try {
      // Step 1: Validate order
      const validationResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Validating order ${orderId}`);
        
        if (!items || items.length === 0) {
          throw new Error("Order must contain at least one item");
        }
        
        // Validate each item
        for (const item of items) {
          if (!item.productId || !item.quantity || !item.price) {
            throw new Error(`Invalid item: ${JSON.stringify(item)}`);
          }
          if (item.quantity <= 0) {
            throw new Error(`Invalid quantity for product ${item.productId}`);
          }
          if (item.price <= 0) {
            throw new Error(`Invalid price for product ${item.productId}`);
          }
        }
        
        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        
        return { 
          orderId, 
          status: "validated", 
          itemCount: items.length,
          totalAmount: totalAmount.toFixed(2),
          validatedAt: new Date().toISOString()
        };
      });
      
      console.log(`Order validation completed:`, validationResult);
      
      // Step 2: Check inventory
      const inventoryResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Checking inventory for order ${orderId}`);
        
        const inventoryChecks = [];
        
        for (const item of items) {
          // Simulate inventory check (95% success rate)
          const available = Math.random() > 0.05;
          const availableQuantity = available ? item.quantity + Math.floor(Math.random() * 10) : 0;
          
          inventoryChecks.push({
            productId: item.productId,
            requestedQuantity: item.quantity,
            availableQuantity,
            sufficient: available && availableQuantity >= item.quantity
          });
          
          if (!available || availableQuantity < item.quantity) {
            throw new Error(`Insufficient inventory for product ${item.productId}. Requested: ${item.quantity}, Available: ${availableQuantity}`);
          }
        }
        
        return {
          orderId,
          status: "inventory_checked",
          inventoryChecks,
          checkedAt: new Date().toISOString()
        };
      });
      
      console.log(`Inventory check completed:`, inventoryResult);
      
      // Step 3: Process payment
      const paymentResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Processing payment for order ${orderId}`);
        
        const totalAmount = parseFloat(validationResult.totalAmount);
        
        // Simulate payment processing (90% success rate)
        const paymentSuccessful = Math.random() > 0.1;
        
        if (!paymentSuccessful) {
          throw new Error("Payment processing failed");
        }
        
        const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        return {
          orderId,
          status: "payment_processed",
          transactionId,
          amount: totalAmount,
          currency: "USD",
          paymentMethod: "credit_card",
          processedAt: new Date().toISOString()
        };
      });
      
      console.log(`Payment processing completed:`, paymentResult);
      
      // Step 4: Reserve inventory
      const reservationResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Reserving inventory for order ${orderId}`);
        
        const reservations = items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          reservationId: `res-${Date.now()}-${item.productId}`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
        }));
        
        return {
          orderId,
          status: "inventory_reserved",
          reservations,
          reservedAt: new Date().toISOString()
        };
      });
      
      console.log(`Inventory reservation completed:`, reservationResult);
      
      // Step 5: Create fulfillment order
      const fulfillmentResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Creating fulfillment order for ${orderId}`);
        
        const estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
        
        return {
          orderId,
          status: "fulfillment_created",
          fulfillmentOrderId: `fulfill-${Date.now()}`,
          estimatedDelivery: estimatedDelivery.toISOString(),
          createdAt: new Date().toISOString()
        };
      });
      
      console.log(`Fulfillment order created:`, fulfillmentResult);
      
      // Step 6: Send confirmation notification
      const notificationResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Sending order confirmation for ${orderId}`);
        
        return {
          orderId,
          status: "notification_sent",
          notificationType: "email",
          recipient: event.customerEmail || "customer@example.com",
          message: `Your order ${orderId} has been confirmed and will be delivered by ${new Date(fulfillmentResult.estimatedDelivery).toLocaleDateString()}`,
          sentAt: new Date().toISOString()
        };
      });
      
      console.log(`Order confirmation sent:`, notificationResult);
      
      // Return final result
      const finalResult = {
        orderId: orderId,
        status: "completed",
        completedAt: new Date().toISOString(),
        steps: {
          validation: validationResult,
          inventory: inventoryResult,
          payment: paymentResult,
          reservation: reservationResult,
          fulfillment: fulfillmentResult,
          notification: notificationResult
        },
        summary: {
          totalAmount: validationResult.totalAmount,
          itemCount: validationResult.itemCount,
          transactionId: paymentResult.transactionId,
          fulfillmentOrderId: fulfillmentResult.fulfillmentOrderId,
          estimatedDelivery: fulfillmentResult.estimatedDelivery
        }
      };
      
      console.log(`Order processing workflow completed successfully:`, finalResult);
      return finalResult;
      
    } catch (error) {
      console.error(`Error in order processing workflow:`, error);
      
      // Step: Handle error and initiate rollback
      const errorResult = await context.step(async (stepContext) => {
        stepContext.logger.error(`Handling order error for ${orderId}: ${error.message}`);
        
        // Simulate rollback actions (release inventory, refund payment, etc.)
        return {
          orderId,
          status: "failed_with_rollback",
          error: error.message,
          rollbackActions: [
            "inventory_released",
            "payment_refunded",
            "customer_notified"
          ],
          failedAt: new Date().toISOString()
        };
      });
      
      throw new Error(`Order processing failed: ${error.message}`);
    }
  }
);
