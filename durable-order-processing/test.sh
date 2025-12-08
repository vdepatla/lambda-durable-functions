#!/bin/bash

# Test script for durable order processing function
echo "Testing durable order processing function locally..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Running order processing test with sample event..."
echo "Event data:"
cat test-event.json
echo ""
echo "This is a simulation - actual testing requires AWS Lambda environment"
echo "Use AWS CLI or AWS Console to test the deployed function"
echo ""
echo "AWS CLI test command:"
echo "aws lambda invoke --function-name durable-order-processing-dev --payload file://test-event.json response.json"
