#!/bin/bash
set -e

REGION="${AWS_REGION:-us-east-1}"
FUNCTION_NAME="${1:-curtaincall-staging-api}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building shared..."
npm run build:shared --prefix "$PROJECT_ROOT"

echo "Building API..."
npm run build:api --prefix "$PROJECT_ROOT"

echo "Packaging..."
rm -f /tmp/api-lambda.zip
zip -j /tmp/api-lambda.zip "$PROJECT_ROOT/apps/api/dist/index.js"

echo "Deploying to $FUNCTION_NAME..."
aws lambda update-function-code \
  --region "$REGION" \
  --function-name "$FUNCTION_NAME" \
  --zip-file fileb:///tmp/api-lambda.zip \
  --query 'FunctionName' --output text

echo "Done."
