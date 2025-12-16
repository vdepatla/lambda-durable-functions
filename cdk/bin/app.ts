#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LambdaDurableFunctionsStack } from '../lib/lambda-durable-functions-stack';

const app = new cdk.App();

const stage = app.node.tryGetContext('stage') || 'dev';
const region = app.node.tryGetContext('region') || 'us-east-2';

// Get functions to deploy from context
// Can be a comma-separated string or an array
const functionsContext = app.node.tryGetContext('functions');
let functionsToDeploy: string[] = ['order-processing']; // Default

if (functionsContext) {
  if (typeof functionsContext === 'string') {
    // Handle comma-separated string
    functionsToDeploy = functionsContext.split(',').map(f => f.trim()).filter(f => f.length > 0);
  } else if (Array.isArray(functionsContext)) {
    // Handle array
    functionsToDeploy = functionsContext;
  }
}

// Special case: if 'all' is specified, deploy all available functions
if (functionsToDeploy.includes('all')) {
  functionsToDeploy = ['order-processing'];
}

console.log(`Deploying functions: ${functionsToDeploy.join(', ')}`);

new LambdaDurableFunctionsStack(app, `LambdaDurableFunctionsStack-${stage}`, {
  env: {
    region: region,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  stage: stage,
  functionsToDeploy: functionsToDeploy,
});

// Add tags to all resources
cdk.Tags.of(app).add('Project', 'lambda-durable-functions');
cdk.Tags.of(app).add('Stage', stage);
cdk.Tags.of(app).add('Functions', functionsToDeploy.join(','));
