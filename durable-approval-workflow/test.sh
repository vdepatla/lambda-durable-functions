#!/bin/bash

# Test the Durable Approval Workflow using AWS CLI

FUNCTION_NAME="durable-approval-workflow-dev"  # Change to your deployed function name
EVENT_FILE="test-event.json"

echo "Testing Durable Approval Workflow..."
echo "Function: $FUNCTION_NAME"
echo "Event file: $EVENT_FILE"
echo ""

# Invoke the function
aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload file://$EVENT_FILE \
    --cli-binary-format raw-in-base64-out \
    response.json

# Check if invocation was successful
if [ $? -eq 0 ]; then
    echo "✅ Function invoked successfully!"
    echo ""
    echo "Response:"
    cat response.json | jq '.'
    echo ""
    
    # Show recent CloudWatch logs
    echo "Recent CloudWatch logs:"
    aws logs tail /aws/lambda/$FUNCTION_NAME --follow --since 1m
else
    echo "❌ Function invocation failed!"
fi
