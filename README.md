# AWS Lambda Durable Functions Examples

Examples of AWS Lambda Durable Functions using Node.js with CDK for infrastructure deployment.

## Prerequisites

- Node.js >= 18.0.0
- AWS CLI configured
- AWS CDK CLI (`npm install -g aws-cdk`)

## Quick Start

```bash
# Install dependencies
npm install
cd cdk && npm install && cd ..

# Deploy default function (approval workflow)
npm run deploy

# Deploy specific functions
npx cdk deploy --context functions=order-processing
npx cdk deploy --context functions="approval-workflow,batch-processor"
npx cdk deploy --context functions=all
```

**Available Functions:**
- `approval-workflow` - Human-in-the-loop approval process
- `order-processing` - E-commerce order workflow
- `batch-processor` - Batch data processing

## Examples

### 1. Approval Workflow (`durable-approval-workflow`)
Multi-step approval process with timeouts and conditional branching.

**Test Event:**
```json
{
  "requestId": "req-123",
  "amount": 5000,
  "requestType": "expense",
  "submitter": "john.doe@company.com"
}
```

### 2. Order Processing (`durable-order-processing`)
E-commerce workflow with validation, payment processing, and inventory management.

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

### 3. Batch Processor (`durable-batch-processor`)
Large-scale data processing with progress tracking.

**Test Event:**
```json
{
  "batchId": "batch-20241207-001",
  "dataFiles": [
    { "fileName": "customers.csv", "size": 1024000, "format": "csv" }
  ]
}
```

## Development

### Key Scripts
```bash
# Build and deploy
npm run build
npm run deploy

# Deploy specific functions
npx cdk deploy --context functions=order-processing
npx cdk deploy --context functions=all

# Environment deployment
npx cdk deploy --context stage=prod --context region=us-west-2 --context functions=all

# Cleanup
npm run destroy
```

### Configuration
- `stage`: Environment stage (default: `dev`)
- `region`: AWS region (default: `us-east-2`) 
- `functions`: Functions to deploy (default: `approval-workflow`)

## Monitoring

**CloudWatch Logs:**
- `/aws/lambda/durable-approval-workflow-{stage}`
- `/aws/lambda/durable-order-processing-{stage}`
- `/aws/lambda/durable-batch-processor-{stage}`

**Features:**
- Durable execution with checkpoints
- X-Ray tracing enabled
- Built-in error handling and retries