module "curtaincall" {
  source = "../../"

  environment         = "prod"
  aws_region          = var.aws_region
  db_instance_class   = var.db_instance_class
  lambda_memory_size  = var.lambda_memory_size
  lambda_timeout      = var.lambda_timeout
  seed_admin_email    = var.seed_admin_email
  seed_admin_password = var.seed_admin_password
  domain_name         = var.domain_name
  extra_cors_origins  = var.extra_cors_origins
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.small"
}

variable "lambda_memory_size" {
  type    = number
  default = 1024
}

variable "lambda_timeout" {
  type    = number
  default = 60
}

variable "seed_admin_email" {
  type    = string
  default = "admin@curtaincall.app"
}

variable "seed_admin_password" {
  type      = string
  sensitive = true
}

variable "domain_name" {
  type    = string
  default = "curtaincall.app"
}

variable "extra_cors_origins" {
  type    = list(string)
  default = []
}

output "api_url" {
  value = module.curtaincall.api_function_url
}

output "admin_url" {
  value = module.curtaincall.amplify_app_url
}
