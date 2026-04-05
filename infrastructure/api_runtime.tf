# Lambda function for API
resource "aws_lambda_function" "api" {
  function_name = "${local.prefix}-api"
  role          = aws_iam_role.lambda.arn

  filename         = "${path.module}/api-placeholder.zip"
  handler          = "index.handler"
  architectures    = ["arm64"]
  runtime          = "nodejs20.x"
  source_code_hash = filebase64sha256("${path.module}/api-placeholder.zip")

  memory_size                    = var.lambda_memory_size
  timeout                        = var.lambda_timeout
  reserved_concurrent_executions = var.environment == "prod" ? 100 : -1

  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DB_HOST         = aws_db_instance.main.address
      DB_PORT         = tostring(aws_db_instance.main.port)
      DB_NAME         = aws_db_instance.main.db_name
      DB_USER         = aws_db_instance.main.username
      DB_SECRET_ARN   = aws_secretsmanager_secret.db_credentials.arn
      DB_SSL          = "true"
      ENVIRONMENT     = var.environment
      IMAGES_BUCKET   = aws_s3_bucket.images.bucket
      IMAGES_BASE_URL = "https://${aws_s3_bucket.images.bucket_regional_domain_name}/public"
    }
  }

  logging_config {
    log_format = "JSON"
  }

  tags = {
    Name = "${local.prefix}-api"
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

# Lambda Function URL (public HTTPS endpoint, no API Gateway)
resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"

  cors {
    allow_origins     = ["https://${var.domain_name}", "https://admin.${var.domain_name}", "http://localhost:3000"]
    allow_methods     = ["*"]
    allow_headers     = ["Content-Type", "Authorization", "Cookie"]
    expose_headers    = ["Set-Cookie"]
    allow_credentials = true
    max_age           = 3600
  }
}

# Allow public access to the Function URL
# Requires both InvokeFunctionUrl and InvokeFunction permissions.
# Accounts created after ~2024 have "Block public access for Lambda Function URLs"
# enabled by default, which blocks InvokeFunctionUrl alone.
resource "aws_lambda_permission" "function_url" {
  statement_id           = "FunctionURLAllowPublicAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.api.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "function_url_invoke" {
  statement_id  = "FunctionURLAllowPublicInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "*"
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${aws_lambda_function.api.function_name}"
  retention_in_days = var.environment == "prod" ? 90 : 14

  tags = {
    Name = "${local.prefix}-api-logs"
  }
}

# Session cleanup - EventBridge scheduled rule
resource "aws_cloudwatch_event_rule" "session_cleanup" {
  name                = "${local.prefix}-session-cleanup"
  schedule_expression = "rate(1 hour)"

  tags = {
    Name = "${local.prefix}-session-cleanup"
  }
}

resource "aws_cloudwatch_event_target" "session_cleanup" {
  rule = aws_cloudwatch_event_rule.session_cleanup.name
  arn  = aws_lambda_function.api.arn
  input = jsonencode({
    action = "cleanup-sessions"
  })
}

resource "aws_lambda_permission" "session_cleanup" {
  statement_id  = "AllowEventBridgeSessionCleanup"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.session_cleanup.arn
}
