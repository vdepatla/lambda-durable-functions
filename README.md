# AWS Lambda Durable Functions Examples with CDK

This project provides comprehensive examples of AWS Lambda Durable Functions using Node.js with AWS CDK for infrastructure deployment. These examples demonstrate different workflow patterns and use cases to help you understand and implement durable functions in your own projects.

## 📋 Prerequisites

- Node.js >= 18.0.0
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (`npm install -g aws-cdk`)
- An AWS account with permissions to create Lambda functions, IAM roles, and CloudWatch resources

## 🚀 Quick Start

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd lambda-durable-functions
   npm install
   ```

2. **Install CDK Dependencies**
   ```bash
   cd cdk
   npm install
   cd ..
   ```

3. **Deploy Infrastructure**

   **Deploy Default Function (Approval Workflow):**
   ```bash
   npm run deploy
   ```

   **Deploy Specific Function(s):**
   ```bash
   # Deploy only the order processing workflow
   npx cdk deploy --context functions=order-processing

   # Deploy multiple specific workflows
   npx cdk deploy --context functions="approval-workflow,order-processing"

   # Deploy all available workflows
   npx cdk deploy --context functions=all
   ```

   **Available Functions:**
   - `approval-workflow` (default)
   - `order-processing`
   - `batch-processor`
   - `all` (deploys all functions)

4. **Test the Example Functions**
   Use the AWS Console or AWS CLI to invoke the deployed functions with the provided test events to see the durable workflows in action.

## 📁 Project Structure

```
lambda-durable-functions/
├── README.md
├── package.json
├── DEPLOYMENT.md
├── cdk/                              # CDK Infrastructure
│   ├── package.json
│   ├── tsconfig.json
│   ├── bin/
│   │   └── app.ts                   # CDK App entry point
│   └── lib/
│       ├── lambda-durable-functions-stack.ts
│       └── constructs/
│           └── nodejs-durable-function.ts
├── durable-approval-workflow/        # Example: Multi-step approval process
├── durable-order-processing/         # Example: E-commerce order workflow
└── durable-batch-processor/          # Example: Batch data processing
```

## 🔧 Example Durable Function Workflows

The following examples demonstrate different patterns and use cases for AWS Lambda Durable Functions. Each example is designed to showcase specific features and best practices that you can adapt for your own use cases.

### 1. Durable Approval Workflow Example (`durable-approval-workflow`)
**Use Case**: Human-in-the-loop processes
**Demonstrates**: Wait operations, timeouts, and conditional branching

This example shows a multi-step approval process featuring:
- Request submission
- Automatic approval for small amounts
- Human approval for large amounts
- Timeout handling
- Final processing

**Test Event:**
```json
{
  "requestId": "req-123",
  "amount": 5000,
  "requestType": "expense",
  "submitter": "john.doe@company.com"
}
```

### 2. Durable Order Processing Example (`durable-order-processing`)
**Use Case**: E-commerce order processing
**Demonstrates**: Multi-step workflow with validation, external API calls, and state management

This example shows a complete e-commerce order processing workflow that includes:
- Order validation
- Inventory checking
- Payment processing
- Inventory reservation
- Order confirmation

**Test Event:**
```json
{
  "orderId": "order-123",
  "customerEmail": "customer@example.com",
  "items": [
    { "productId": "prod-001", "quantity": 2, "price": 29.99, "name": "Wireless Headphones" },
    { "productId": "prod-002", "quantity": 1, "price": 149.99, "name": "Bluetooth Speaker" }
  ]
}
```

### 3. Durable Batch Processor Example (`durable-batch-processor`)
**Use Case**: Large-scale data processing
**Demonstrates**: Iterative processing, progress tracking, and summarization

This example shows a batch data processing workflow that includes:
- Data validation
- File-by-file processing
- Summary report generation
- Notification sending

**Test Event:**
```json
{
  "batchId": "batch-20241207-001",
  "dataFiles": [
    { "fileName": "customers.csv", "size": 1024000, "format": "csv" },
    { "fileName": "transactions.json", "size": 2048000, "format": "json" }
  ]
}
```

## 💡 Using These Examples

These examples are designed for learning and adaptation:

- **Study the patterns**: Each example demonstrates different durable function patterns you can apply to your use cases
- **Adapt for your needs**: Use these as templates and modify them for your specific requirements  
- **Production considerations**: Review the security, monitoring, and performance sections before deploying to production
- **Cost optimization**: The examples include reasonable defaults, but you may want to adjust memory, timeout, and concurrency settings for your workloads

## 🏗️ CDK Infrastructure

The included CDK stack (`LambdaDurableFunctionsStack`) provides flexible deployment options allowing you to deploy specific functions based on your needs. The stack creates:

- **IAM Role**: Execution role with durable execution permissions
- **Lambda Functions**: Selected functions based on deployment configuration
- **CloudWatch Log Groups**: For structured logging and monitoring
- **Outputs**: Function ARNs for easy reference

### Dynamic Function Deployment

The CDK stack supports deploying specific functions through the `functions` context parameter:

```bash
# Deploy only approval workflow (default)
npx cdk deploy

# Deploy specific functions
npx cdk deploy --context functions=order-processing
npx cdk deploy --context functions="approval-workflow,batch-processor"

# Deploy all functions
npx cdk deploy --context functions=all

# Deploy with custom stage and region
npx cdk deploy --context stage=prod --context region=us-west-2 --context functions=all
```

### Environment Configuration

You can customize the deployment through context variables:

- `stage`: Environment stage (default: `dev`)
- `region`: AWS region (default: `us-east-2`)
- `functions`: Functions to deploy (default: `approval-workflow`)

### Key CDK Features:

- **Durable Execution**: Enabled for all Lambda functions
- **Error Handling**: Built-in retry and checkpoint capabilities
- **Monitoring**: CloudWatch integration for observability
- **Scalable**: Configurable memory, timeout, and environment variables

## 📊 Monitoring and Debugging

### CloudWatch Logs
Each deployed function logs to its dedicated CloudWatch log group:
- `/aws/lambda/durable-approval-workflow-{stage}`
- `/aws/lambda/durable-order-processing-{stage}` (if deployed)
- `/aws/lambda/durable-batch-processor-{stage}` (if deployed)

**Note**: Log groups are only created for functions that are actually deployed.

### Durable Execution State
Monitor execution state and checkpoints through:
- AWS Lambda Console
- CloudWatch Logs
- AWS X-Ray tracing (enabled by default)

## 🛠️ Development

### Available Scripts

```bash
# Build all components
npm run build

# Deploy infrastructure (default: approval workflow only)
npm run deploy

# Deploy specific functions
npx cdk deploy --context functions=order-processing
npx cdk deploy --context functions="approval-workflow,batch-processor"
npx cdk deploy --context functions=all

# Deploy to specific environments with custom functions
npx cdk deploy --context stage=dev --context functions=approval-workflow
npx cdk deploy --context stage=prod --context region=us-west-2 --context functions=all

# Destroy infrastructure
npm run destroy

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format

# Generate CDK diff
npx cdk diff --context functions=all

# Synthesize CDK templates
npx cdk synth --context functions=order-processing
```

### Local Testing

Each example includes a `test-event.json` file for testing. You can test locally by:

1. Installing dependencies for a specific example:
   ```bash
   cd durable-order-processing
   npm install
   ```

2. Running the function locally (requires local Lambda environment setup)