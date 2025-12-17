import {
  withDurableExecution,
} from "@aws/durable-execution-sdk-js";

// Service URLs configuration - can be overridden via environment variables
const SERVICE_URLS = {
  VALIDATION_SERVICE_URL: process.env.VALIDATION_SERVICE_URL || 'http://localhost:8080/api/v1/validate',
  INVENTORY_SERVICE_URL: process.env.INVENTORY_SERVICE_URL || 'http://localhost:8080/api/v1/inventory',
  PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL || 'http://localhost:8080/api/v1/payment',
  FULFILLMENT_SERVICE_URL: process.env.FULFILLMENT_SERVICE_URL || 'http://localhost:8080/api/v1/fulfillment',
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8080/api/v1/notification'
};

// Helper function to make HTTP requests to external services
async function callExternalService(serviceUrl, payload = {}, options = {}) {
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(payload)
  };

  console.log(`Making request to external service: ${serviceUrl}`, JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(serviceUrl, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`External service error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`External service response from ${serviceUrl}:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(`Failed to call external service ${serviceUrl}:`, error.message);
    throw error;
  }
}

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
        
        try {
          // Call validation service
          const validationResponse = await callExternalService(SERVICE_URLS.VALIDATION_SERVICE_URL, {
            orderId,
            items,
            customerEmail: event.customerEmail || "customer@example.com"
          });
          
          console.log('Validation service response:', validationResponse);
          
          if (validationResponse && !validationResponse.valid) {
            throw new Error(validationResponse.error || "Order validation failed");
          }
        } catch (error) {
          console.warn('Validation service unavailable, using fallback validation:', error.message);
        }
        
        // Validate each item locally as backup
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
        
        try {
          // Call inventory service
          const inventoryResponse = await callExternalService(SERVICE_URLS.INVENTORY_SERVICE_URL, {
            orderId,
            items: items.map(item => ({
              productId: item.productId,
              requestedQuantity: item.quantity
            }))
          });
          
          console.log('Inventory service response:', inventoryResponse);
          
          // Use service response if available
          if (inventoryResponse && inventoryResponse.inventoryChecks) {
            // Check if any items are insufficient
            const insufficientItems = inventoryResponse.inventoryChecks.filter(check => !check.sufficient);
            if (insufficientItems.length > 0) {
              throw new Error(`Insufficient inventory for products: ${insufficientItems.map(item => item.productId).join(', ')}`);
            }
            
            return {
              orderId,
              status: "inventory_checked",
              inventoryChecks: inventoryResponse.inventoryChecks,
              checkedAt: new Date().toISOString(),
              source: "inventory_service"
            };
          }
        } catch (error) {
          console.warn('Inventory service unavailable, using fallback inventory check:', error.message);
        }
        
        // Fallback inventory simulation
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
          checkedAt: new Date().toISOString(),
          source: "fallback_simulation"
        };
      });
      
      console.log(`Inventory check completed:`, inventoryResult);
      
      // Step 3: Process payment
      const paymentResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Processing payment for order ${orderId}`);
        
        const totalAmount = parseFloat(validationResult.totalAmount);
        
        try {
          // Call payment service
          const paymentResponse = await callExternalService(SERVICE_URLS.PAYMENT_SERVICE_URL, {
            orderId,
            amount: totalAmount,
            currency: "USD",
            paymentMethod: "credit_card",
            customerEmail: event.customerEmail || "customer@example.com"
          });
          
          console.log('Payment service response:', paymentResponse);
          
          // Use service response if available and successful
          if (paymentResponse && paymentResponse.success) {
            return {
              orderId,
              status: "payment_processed",
              transactionId: paymentResponse.transactionId || `txn-${Date.now()}`,
              amount: totalAmount,
              currency: "USD",
              paymentMethod: "credit_card",
              processedAt: new Date().toISOString(),
              source: "payment_service"
            };
          } else if (paymentResponse && !paymentResponse.success) {
            throw new Error(paymentResponse.error || "Payment processing failed");
          }
        } catch (error) {
          console.warn('Payment service unavailable, using fallback payment processing:', error.message);
        }
        
        // Fallback payment simulation (90% success rate)
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
          processedAt: new Date().toISOString(),
          source: "fallback_simulation"
        };
      });
      
      console.log(`Payment processing completed:`, paymentResult);
      
      // Step 4: Reserve inventory
      const reservationResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Reserving inventory for order ${orderId}`);
        
        try {
          // Call inventory reservation service  
          const reservationResponse = await callExternalService(SERVICE_URLS.INVENTORY_SERVICE_URL + '/reserve', {
            orderId,
            items: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity
            }))
          });
          
          console.log('Inventory reservation service response:', reservationResponse);
          
          if (reservationResponse && reservationResponse.reservations) {
            return {
              orderId,
              status: "inventory_reserved",
              reservations: reservationResponse.reservations,
              reservedAt: new Date().toISOString(),
              source: "inventory_service"
            };
          }
        } catch (error) {
          console.warn('Inventory reservation service unavailable, using fallback reservation:', error.message);
        }
        
        // Fallback reservation simulation
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
          reservedAt: new Date().toISOString(),
          source: "fallback_simulation"
        };
      });
      
      console.log(`Inventory reservation completed:`, reservationResult);
      
      // Step 5: Create fulfillment order
      const fulfillmentResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Creating fulfillment order for ${orderId}`);
        
        try {
          // Call fulfillment service
          const fulfillmentResponse = await callExternalService(SERVICE_URLS.FULFILLMENT_SERVICE_URL, {
            orderId,
            items,
            reservations: reservationResult.reservations
          });
          
          console.log('Fulfillment service response:', fulfillmentResponse);
          
          if (fulfillmentResponse && fulfillmentResponse.fulfillmentOrderId) {
            return {
              orderId,
              status: "fulfillment_created",
              fulfillmentOrderId: fulfillmentResponse.fulfillmentOrderId,
              estimatedDelivery: fulfillmentResponse.estimatedDelivery,
              createdAt: new Date().toISOString(),
              source: "fulfillment_service"
            };
          }
        } catch (error) {
          console.warn('Fulfillment service unavailable, using fallback fulfillment:', error.message);
        }
        
        // Fallback fulfillment simulation
        const estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
        
        return {
          orderId,
          status: "fulfillment_created",
          fulfillmentOrderId: `fulfill-${Date.now()}`,
          estimatedDelivery: estimatedDelivery.toISOString(),
          createdAt: new Date().toISOString(),
          source: "fallback_simulation"
        };
      });
      
      console.log(`Fulfillment order created:`, fulfillmentResult);
      
      // Step 6: Send confirmation notification
      const notificationResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Sending order confirmation for ${orderId}`);
        
        try {
          // Call notification service
          const notificationResponse = await callExternalService(SERVICE_URLS.NOTIFICATION_SERVICE_URL, {
            orderId,
            recipient: event.customerEmail || "customer@example.com",
            notificationType: "email",
            message: `Your order ${orderId} has been confirmed and will be delivered by ${new Date(fulfillmentResult.estimatedDelivery).toLocaleDateString()}`,
            orderDetails: {
              totalAmount: validationResult.totalAmount,
              itemCount: validationResult.itemCount,
              fulfillmentOrderId: fulfillmentResult.fulfillmentOrderId
            }
          });
          
          console.log('Notification service response:', notificationResponse);
          
          if (notificationResponse && notificationResponse.notificationId) {
            return {
              orderId,
              status: "notification_sent",
              notificationId: notificationResponse.notificationId,
              notificationType: "email",
              recipient: event.customerEmail || "customer@example.com",
              sentAt: new Date().toISOString(),
              source: "notification_service"
            };
          }
        } catch (error) {
          console.warn('Notification service unavailable, using fallback notification:', error.message);
        }
        
        // Fallback notification
        return {
          orderId,
          status: "notification_sent",
          notificationType: "email",
          recipient: event.customerEmail || "customer@example.com",
          message: `Your order ${orderId} has been confirmed and will be delivered by ${new Date(fulfillmentResult.estimatedDelivery).toLocaleDateString()}`,
          sentAt: new Date().toISOString(),
          source: "fallback_simulation"
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
