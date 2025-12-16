# AWS Lambda Durable Functions Example

Example of AWS Lambda Durable Functions using Node.js with CDK for infrastructure deployment.

## Prerequisites

- Node.js >= 18.0.0
- AWS CLI configured
- AWS CDK CLI (`npm install -g aws-cdk`)

## Quick Start

```bash
# Install dependencies
npm install
cd cdk && npm install && cd ..

# Deploy the order processing workflow
npm run deploy
```

## Order Processing Workflow

This example demonstrates an e-commerce order processing workflow with validation, payment processing, and inventory management.

**Features:**
- Order validation
- Inventory checking
- Payment processing
- Inventory reservation
- Order confirmation
- Error simulation for testing checkpointing and replays

**Test Event:**
```json
{
  "orderId": "order-123",
  "customerEmail": "customer@example.com",
  "items": [
    { "productId": "prod-001", "quantity": 2, "price": 29.99, "name": "Wireless Headphones" }
  ]
}
```

**Error Simulation:**
To test checkpointing and replay functionality, use the error simulation test events:
- `test-event-payment-error.json` - Simulates payment failure
- `test-event-inventory-error.json` - Simulates inventory shortage
- `test-event-timeout-error.json` - Simulates timeout errors

## Development

### Key Scripts
```bash
# Build and deploy
npm run build
npm run deploy

# Cleanup
npm run destroy
```

### Configuration
- `stage`: Environment stage (default: `dev`)

## Monitoring

**CloudWatch Logs:**
- `/aws/lambda/durable-order-processing-{stage}`

**Features:**
- Durable execution with checkpoints
- X-Ray tracing enabled
- Built-in error handling and retries