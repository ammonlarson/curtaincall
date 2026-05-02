variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (staging or prod)"
  type        = string
  validation {
    condition     = contains(["staging", "prod"], var.environment)
    error_message = "Environment must be staging or prod."
  }
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "curtaincall"
}

variable "lambda_memory_size" {
  description = "Lambda function memory in MB"
  type        = number
  default     = 1024
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 60
}

variable "seed_admin_email" {
  description = "Initial admin email for seeding"
  type        = string
  default     = "admin@curtaincall.app"
}

variable "seed_admin_password" {
  description = "Initial admin password for seeding"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "curtaincall.app"
}

variable "github_access_token" {
  description = "Deprecated — Amplify now uses CodeConnections. Kept for backward compatibility."
  type        = string
  sensitive   = true
  default     = ""
}

variable "images_bucket_name" {
  description = "S3 bucket name for show images"
  type        = string
  default     = ""
}

# Lambda Function URL CORS only accepts complete origins (e.g.,
# https://www.example.com), the literal "*", or "https://*". Subdomain
# wildcards like https://*.example.com are rejected by the AWS API, so we
# validate against them here to fail fast at plan time instead of apply.
variable "extra_cors_origins" {
  description = "Additional origins to allow on the API Lambda Function URL. Each entry must be a complete origin (e.g., https://main.<app-id>.amplifyapp.com); subdomain wildcards are not supported by Lambda Function URL CORS."
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for origin in var.extra_cors_origins :
      !can(regex("^https?://\\*\\.", origin))
    ])
    error_message = "Lambda Function URL CORS does not accept subdomain wildcards (https://*.example.com). Use a complete origin or the full wildcard \"*\"."
  }
}
