# CodeConnections connection for GitHub (replaces personal access token)
resource "aws_codeconnections_connection" "github" {
  name          = "${local.prefix}-github"
  provider_type = "GitHub"

  tags = {
    Name = "${local.prefix}-github"
  }
}

# Amplify app for admin web frontend
resource "aws_amplify_app" "admin" {
  name       = "${local.prefix}-admin"
  repository = "https://github.com/ammonlarson/curtaincall"

  iam_service_role_arn = aws_iam_role.amplify.arn

  build_spec = <<-EOT
    version: 1
    applications:
      - appRoot: apps/web
        frontend:
          phases:
            preBuild:
              commands:
                - cd ../..
                - npm ci
                - npm run build:shared
            build:
              commands:
                - cd apps/web
                - npm run build
          artifacts:
            baseDirectory: out
            files:
              - '**/*'
          cache:
            paths:
              - node_modules/**/*
  EOT

  environment_variables = {
    NEXT_PUBLIC_API_URL = trimsuffix(aws_lambda_function_url.api.function_url, "/")
    ENVIRONMENT         = var.environment
  }

  custom_rule {
    source = "/<*>"
    status = "404-200"
    target = "/index.html"
  }

  tags = {
    Name = "${local.prefix}-admin"
  }

  lifecycle {
    replace_triggered_by = [aws_codeconnections_connection.github]
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.admin.id
  branch_name = "main"

  framework = "Next.js - SSG"
  stage     = var.environment == "prod" ? "PRODUCTION" : "DEVELOPMENT"

  environment_variables = {
    NEXT_PUBLIC_ENVIRONMENT = var.environment
  }
}

# IAM role for Amplify to access CodeConnections
resource "aws_iam_role" "amplify" {
  name = "${local.prefix}-amplify"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "amplify.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${local.prefix}-amplify"
  }
}

resource "aws_iam_role_policy" "amplify_codeconnections" {
  name = "${local.prefix}-amplify-codeconnections"
  role = aws_iam_role.amplify.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "codeconnections:GetConnection",
          "codeconnections:UseConnection"
        ]
        Resource = aws_codeconnections_connection.github.arn
      }
    ]
  })
}
