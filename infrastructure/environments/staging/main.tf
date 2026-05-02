terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "curtaincall-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "curtaincall-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

module "curtaincall" {
  source = "../../"

  environment         = "staging"
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
  default = "db.t4g.micro"
}

variable "lambda_memory_size" {
  type    = number
  default = 512
}

variable "lambda_timeout" {
  type    = number
  default = 30
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
  default = "staging.curtaincall.app"
}

variable "extra_cors_origins" {
  type    = list(string)
  default = []
}

variable "github_access_token" {
  description = "Deprecated — no longer needed. Kept to avoid tfvars errors."
  type        = string
  sensitive   = true
  default     = ""
}

output "api_url" {
  value = module.curtaincall.api_function_url
}

output "admin_url" {
  value = module.curtaincall.amplify_app_url
}

output "db_endpoint" {
  value = module.curtaincall.db_endpoint
}

output "db_secret_arn" {
  value     = module.curtaincall.db_secret_arn
  sensitive = true
}

output "eic_endpoint_id" {
  value = module.curtaincall.eic_endpoint_id
}

output "bastion_instance_id" {
  value = module.curtaincall.bastion_instance_id
}
