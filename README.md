# AWS Lambda Durable Functions - Order Processing

A complete example of AWS Lambda Durable Functions for e-commerce order processing, with support for both **local development** with mock services and **AWS deployment**.

## Prerequisites

- **Node.js** >= 18.0.0
- **Docker** (for mock services)
- **AWS SAM CLI** >= 1.150.1 (for durable functions): `brew install aws-sam-cli`
- **AWS CLI** (for AWS deployment): `brew install awscli`
- **AWS CDK CLI**: `npm install -g aws-cdk`

> **Note**: Durable Functions support requires AWS SAM CLI version 1.150.1 or greater. Check your version with `sam --version`
> 
> **To upgrade SAM CLI:**
> - **Homebrew (macOS)**: `brew upgrade aws-sam-cli`
> - **If Homebrew doesn't have latest version, use pip**: `pip install --upgrade aws-sam-cli`
> - **Or download directly**: [AWS SAM CLI GitHub releases](https://github.com/aws/aws-sam-cli/releases)
> - **Other methods**: See [AWS SAM installation guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

## Features

- **Order Processing Workflow**: Validation → Inventory Check → Payment → Order Confirmation
- **Durable Execution**: Checkpointing, state persistence, and automatic retries
- **Error Simulation**: Test failure scenarios and replay functionality
- **AWS Deployment**: Full CDK infrastructure with durable execution and monitoring
- **Local Testing**: Available when SAM CLI >= 1.150.1 supports durable functions

## Quick Start

### ☁️ AWS Deployment (Recommended for Durable Functions Demo)

```bash
# Install dependencies
npm install
cd cdk && npm install && cd ..

# Deploy to AWS
npm run deploy

# Test durable execution in AWS
cd durable-order-processing
aws lambda invoke --function-name durable-order-processing-dev --payload file://test-event.json response.json && cat response.json
```

### 🏠 Local Development (Function Logic Testing)

```bash
# Install dependencies
npm install

# Navigate to order processing directory
cd durable-order-processing

# Start mock services
docker-compose up -d

# Build and test durable function directly
sam build
sam local invoke OrderProcessingFunction --event test-event.json --docker-network host
```

## Project Structure

```
durable-order-processing/    # Order processing workflow
├── index.mjs               # Lambda function code
├── scenarios.yaml          # Mock service scenarios
├── docker-compose.yml      # Local mock services
└── test-event*.json        # Test events & error scenarios

cdk/                        # AWS CDK infrastructure
├── lib/                    # Stack definitions
└── bin/                    # CDK app entry point
```

## Available Commands

```bash
npm run build     # Build CDK
npm run deploy    # Deploy to AWS
npm run destroy   # Clean up AWS resources
```

For detailed testing instructions, see [`durable-order-processing/README.md`](./durable-order-processing/README.md).