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
        
        // Call validation service
        const validationResponse = await callExternalService(SERVICE_URLS.VALIDATION_SERVICE_URL, {
          orderId,
          items,
          customerEmail: event.customerEmail || "customer@example.com"
        });
        
        console.log('Validation service response:', validationResponse);
        
        if (!validationResponse || !validationResponse.valid) {
          throw new Error(validationResponse?.error || "Order validation failed");
        }
        
        return { 
          orderId, 
          status: "validated", 
          itemCount: items.length,
          totalAmount: validationResponse.totalAmount || "0.00",
          validatedAt: new Date().toISOString(),
          source: "validation_service"
        };
      });
      
      console.log(`Order validation completed:`, validationResult);
      
      // Step 2: Check inventory
      const inventoryResult = await context.step(async (stepContext) => {
        stepContext.logger.info(`Checking inventory for order ${orderId}`);
        
        // Call inventory service
        const inventoryResponse = await callExternalService(SERVICE_URLS.INVENTORY_SERVICE_URL, {
          orderId,
          items: items.map(item => ({
            productId: item.productId,
            requestedQuantity: item.quantity
          }))
        });
        
        console.log('Inventory service response:', inventoryResponse);
        
        if (!inventoryResponse || !inventoryResponse.inventoryChecks) {
          throw new Error('Invalid inventory service response');
        }
        
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
          } else {
            throw new Error("Invalid payment service response");
          }
        } catch (error) {
          console.error('Payment service failed:', error.message);
          throw new Error(`Payment processing failed: ${error.message}`);
        }
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
          } else {
            throw new Error("Invalid inventory reservation service response");
          }
        } catch (error) {
          console.error('Inventory reservation service failed:', error.message);
          throw new Error(`Inventory reservation failed: ${error.message}`);
        }
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
          } else {
            throw new Error("Invalid fulfillment service response");
          }
        } catch (error) {
          console.error('Fulfillment service failed:', error.message);
          throw new Error(`Fulfillment order creation failed: ${error.message}`);
        }
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
          } else {
            throw new Error("Invalid notification service response");
          }
        } catch (error) {
          console.error('Notification service failed:', error.message);
          throw new Error(`Notification sending failed: ${error.message}`);
        }
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
