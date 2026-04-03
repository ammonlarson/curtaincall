output "api_function_url" {
  description = "Lambda Function URL for the API"
  value       = aws_lambda_function_url.api.function_url
}

output "db_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.main.address
}

output "db_port" {
  description = "RDS database port"
  value       = aws_db_instance.main.port
}

output "db_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "images_bucket" {
  description = "S3 bucket for show images"
  value       = aws_s3_bucket.images.bucket
}

output "images_base_url" {
  description = "Base URL for public show images"
  value       = "https://${aws_s3_bucket.images.bucket_regional_domain_name}/public"
}

output "amplify_app_url" {
  description = "Amplify admin web app URL"
  value       = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.admin.default_domain}"
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.api.function_name
}
