# Amplify app for admin web frontend
resource "aws_amplify_app" "admin" {
  name       = "${local.prefix}-admin"
  repository = "https://github.com/ammonlarson/curtaincall"

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
            baseDirectory: .next
            files:
              - '**/*'
          cache:
            paths:
              - node_modules/**/*
              - .next/cache/**/*
  EOT

  environment_variables = {
    API_URL     = aws_lambda_function_url.api.function_url
    ENVIRONMENT = var.environment
  }

  custom_rule {
    source = "/<*>"
    status = "404-200"
    target = "/index.html"
  }

  tags = {
    Name = "${local.prefix}-admin"
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.admin.id
  branch_name = "main"

  framework = "Next.js - SSR"
  stage     = var.environment == "prod" ? "PRODUCTION" : "DEVELOPMENT"

  environment_variables = {
    NEXT_PUBLIC_ENVIRONMENT = var.environment
  }
}
