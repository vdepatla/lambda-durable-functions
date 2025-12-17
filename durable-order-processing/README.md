# Order Processing Durable Function

This project demonstrates AWS Lambda Durable Functions for order processing workflows. You can test either **locally** with mock services or **deploy to AWS** for production testing.

## Prerequisites

- **Node.js** >= 18.0.0
- **Docker** (for mock services)
- **AWS SAM CLI** >= 1.150.1 (for durable functions): `brew install aws-sam-cli`
- **AWS CLI** (for AWS deployment): `brew install awscli`

> **Note**: Durable Functions support requires AWS SAM CLI version 1.150.1 or greater. Check your version with `sam --version`
> 
> **To upgrade SAM CLI to a specific version:**
> - **First upgrade pip**: `python3 -m pip install --upgrade pip`
> - **Install specific SAM CLI version**: `pip3 install aws-sam-cli==1.150.1`
> - **If you have Homebrew version conflicts**: `brew uninstall aws-sam-cli` first
> - **If "command not found"**: Add to PATH or use `python3 -m samcli --version`
> - **Alternative PATH fix**: `export PATH=$PATH:$(python3 -m site --user-base)/bin`
> - **Verify installation**: `sam --version` or `python3 -m samcli --version`
> - **Alternative: Direct download**: [GitHub releases](https://github.com/aws/aws-sam-cli/releases)

## Quick Start

Choose your testing approach:

### 🏠 Local Testing (Recommended for Development)
Fast iteration with full durable execution support - no AWS deployment needed.

### ☁️ AWS Deployment (Production Environment)
Production testing with AWS Lambda Durable Functions and monitoring.

---

## Local Testing Setup

### 1. Start Mock Services

```bash
# Navigate to the durable-order-processing directory
cd durable-order-processing

# Start the mock server
docker-compose up -d

# Verify it's running
curl http://localhost:8080/health
```

### 2. Test with SAM Local

```bash
# Build the application
sam build

# Test durable function locally
sam local invoke OrderProcessingFunction \
  --event test-event.json \
  --docker-network host

# Test error scenarios
sam local invoke OrderProcessingFunction \
  --event test-event-payment-error.json \
  --docker-network host

# Track execution state (use ARN from execution output)
sam local execution get <EXECUTION_ARN>
sam local execution history <EXECUTION_ARN>
```

**Benefits:**
- ✅ Full durable execution support locally (SAM CLI 1.150.1+)
- ✅ Complete workflow testing with mock services
- ✅ Execution tracking and state management
- ✅ Fast iteration without AWS deployment

---

## AWS Deployment

### 1. Deploy to AWS

```bash
# From project root
npm run deploy
```

### 2. Test in AWS

```bash
aws lambda invoke \
  --function-name durable-order-processing-dev \
  --payload file://test-event.json \
  response.json && cat response.json
```

**Benefits:**
- ✅ Production-like environment
- ✅ Real AWS Lambda durable execution
- ✅ CloudWatch logs and monitoring

---

## Available Test Events

| File | Scenario |
|------|----------|
| `test-event.json` | Normal order processing |
| `test-event-payment-error.json` | Payment failure scenario |
| `test-event-inventory-error.json` | Inventory shortage scenario |
| `test-event-timeout-error.json` | Service timeout scenario |

---

## Cleanup

```bash
# Stop mock services
docker-compose down

# Destroy AWS resources (if deployed)
npm run destroy
```
