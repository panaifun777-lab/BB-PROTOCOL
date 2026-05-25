# =============================================================================
# variables.tf — Cognitive Avatar Protocol Infrastructure Variables
# =============================================================================
# All configurable variables for Terraform infrastructure
# =============================================================================

# ── General ─────────────────────────────────────────────────────────────────

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "cognitive-avatar"
}

variable "environment" {
  description = "Deployment environment (staging, production)"
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either staging or production."
  }
}

variable "aws_region" {
  description = "AWS region for resource deployment"
  type        = string
  default     = "us-east-1"
}

# ── VPC Configuration ──────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_count" {
  description = "Number of public subnets"
  type        = number
  default     = 2
}

variable "private_subnet_count" {
  description = "Number of private subnets"
  type        = number
  default     = 2
}

variable "database_subnet_count" {
  description = "Number of database subnets"
  type        = number
  default     = 2
}

variable "nat_gateway_count" {
  description = "Number of NAT Gateways (one per AZ recommended for production)"
  type        = number
  default     = 1
}

# ── ECS Configuration ──────────────────────────────────────────────────────

variable "app_cpu" {
  description = "CPU units for the main app task (1 vCPU = 1024)"
  type        = number
  default     = 512
}

variable "app_memory" {
  description = "Memory (MiB) for the main app task"
  type        = number
  default     = 1024
}

variable "app_desired_count" {
  description = "Desired number of app task instances"
  type        = number
  default     = 2
}

variable "app_min_count" {
  description = "Minimum number of app task instances for auto-scaling"
  type        = number
  default     = 2
}

variable "app_max_count" {
  description = "Maximum number of app task instances for auto-scaling"
  type        = number
  default     = 10
}

variable "app_image_tag" {
  description = "Docker image tag for the main app"
  type        = string
  default     = "latest"
}

variable "ecr_repository_url" {
  description = "ECR repository URL for Docker images"
  type        = string
}

variable "enable_container_insights" {
  description = "Enable ECS Container Insights for monitoring"
  type        = bool
  default     = true
}

# ── RDS Configuration ──────────────────────────────────────────────────────

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "rds_allocated_storage" {
  description = "Initial allocated storage (GB)"
  type        = number
  default     = 50
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage for auto-scaling (GB)"
  type        = number
  default     = 200
}

variable "rds_database_name" {
  description = "Name of the PostgreSQL database"
  type        = string
  default     = "cognitive_avatar"
}

variable "rds_username" {
  description = "Master username for RDS"
  type        = string
  default     = "dbadmin"
}

variable "rds_password" {
  description = "Master password for RDS (use SSM/Secrets Manager in production)"
  type        = string
  sensitive   = true
}

variable "rds_max_connections" {
  description = "Maximum number of database connections"
  type        = number
  default     = 100
}

variable "rds_shared_buffers" {
  description = "PostgreSQL shared_buffers setting"
  type        = string
  default     = "256MB"
}

variable "rds_effective_cache_size" {
  description = "PostgreSQL effective_cache_size setting"
  type        = string
  default     = "768MB"
}

variable "rds_backup_retention_period" {
  description = "Number of days to retain RDS backups"
  type        = number
  default     = 7
}

# ── S3 / CloudFront Configuration ─────────────────────────────────────────

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS records"
  type        = string
}

variable "cloudfront_price_class" {
  description = "CloudFront price class (PriceClass_100, PriceClass_200, PriceClass_All)"
  type        = string
  default     = "PriceClass_200"
}

variable "waf_web_acl_id" {
  description = "WAF Web ACL ID to associate with CloudFront (empty string to disable)"
  type        = string
  default     = ""
}

# ── Web3 / Blockchain Configuration ────────────────────────────────────────

variable "chain_id" {
  description = "Blockchain chain ID (8453 for Base Mainnet)"
  type        = number
  default     = 8453
}

variable "rpc_url" {
  description = "RPC URL for blockchain interactions"
  type        = string
  default     = "https://mainnet.base.org"
}

variable "cors_origin" {
  description = "CORS origin allowed for Socket.IO services"
  type        = string
  default     = "https://cognitive-avatar.protocol"
}

# ── ACM Certificate ────────────────────────────────────────────────────────

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS (can be auto-provisioned)"
  type        = string
  default     = ""
}

# ── Logging ────────────────────────────────────────────────────────────────

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
}

# ── Tags ───────────────────────────────────────────────────────────────────

variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
