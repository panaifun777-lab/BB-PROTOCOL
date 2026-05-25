# =============================================================================
# outputs.tf — Cognitive Avatar Protocol Infrastructure Outputs
# =============================================================================
# Output values: endpoints, ARNs, connection strings
# =============================================================================

# ── VPC Outputs ─────────────────────────────────────────────────────────────

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = aws_subnet.database[*].id
}

# ── ECS Outputs ─────────────────────────────────────────────────────────────

output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "app_service_name" {
  description = "Name of the main app ECS service"
  value       = aws_ecs_service.app.name
}

output "app_task_definition_arn" {
  description = "ARN of the main app task definition"
  value       = aws_ecs_task_definition.app.arn
}

output "resonance_sim_service_name" {
  description = "Name of the resonance simulation ECS service"
  value       = aws_ecs_service.resonance_sim.name
}

output "monitoring_sim_service_name" {
  description = "Name of the monitoring simulation ECS service"
  value       = aws_ecs_service.monitoring_sim.name
}

# ── Load Balancer Outputs ──────────────────────────────────────────────────

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Route53 zone ID of the ALB"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "app_target_group_arn" {
  description = "ARN of the main app target group"
  value       = aws_lb_target_group.app.arn
}

# ── RDS Outputs ─────────────────────────────────────────────────────────────

output "rds_endpoint" {
  description = "Endpoint of the RDS PostgreSQL instance"
  value       = aws_db_instance.main.endpoint
}

output "rds_port" {
  description = "Port of the RDS PostgreSQL instance"
  value       = aws_db_instance.main.port
}

output "rds_database_name" {
  description = "Name of the RDS database"
  value       = aws_db_instance.main.db_name
}

output "rds_instance_arn" {
  description = "ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "rds_read_replica_endpoint" {
  description = "Endpoint of the RDS read replica (production only)"
  value       = length(aws_db_instance.read_replica) > 0 ? aws_db_instance.read_replica[0].endpoint : ""
}

output "database_url_ssm_parameter" {
  description = "SSM parameter name for the database URL"
  value       = aws_ssm_parameter.database_url.name
}

# ── S3 Outputs ─────────────────────────────────────────────────────────────

output "assets_bucket_name" {
  description = "Name of the S3 assets bucket"
  value       = aws_s3_bucket.assets.id
}

output "static_bucket_name" {
  description = "Name of the S3 static content bucket"
  value       = aws_s3_bucket.static.id
}

output "ipfs_cache_bucket_name" {
  description = "Name of the S3 IPFS cache bucket"
  value       = aws_s3_bucket.ipfs_cache.id
}

output "assets_bucket_arn" {
  description = "ARN of the S3 assets bucket"
  value       = aws_s3_bucket.assets.arn
}

# ── CloudFront Outputs ─────────────────────────────────────────────────────

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.arn
}

output "cloudfront_hosted_zone_id" {
  description = "Route53 zone ID for the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

# ── ACM Certificate Outputs ────────────────────────────────────────────────

output "acm_certificate_arn" {
  description = "ARN of the ACM SSL certificate"
  value       = aws_acm_certificate.main.arn
}

output "acm_certificate_domain" {
  description = "Domain name of the ACM certificate"
  value       = aws_acm_certificate.main.domain_name
}

# ── DNS Outputs ─────────────────────────────────────────────────────────────

output "app_url" {
  description = "Full application URL"
  value       = "https://${var.domain_name}"
}

output "api_base_url" {
  description = "Base URL for API endpoints"
  value       = "https://${var.domain_name}/api"
}

output "health_check_url" {
  description = "URL for the health check endpoint"
  value       = "https://${var.domain_name}/api/health"
}

# ── Security Group Outputs ─────────────────────────────────────────────────

output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "ID of the ECS security group"
  value       = aws_security_group.ecs.id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

output "mini_services_security_group_id" {
  description = "ID of the mini services security group"
  value       = aws_security_group.mini_services.id
}

# ── IAM Outputs ─────────────────────────────────────────────────────────────

output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution IAM role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task IAM role"
  value       = aws_iam_role.ecs_task.arn
}

output "rds_monitoring_role_arn" {
  description = "ARN of the RDS monitoring IAM role"
  value       = aws_iam_role.rds_monitoring.arn
}

# ── CloudWatch Outputs ─────────────────────────────────────────────────────

output "ecs_log_group_name" {
  description = "Name of the ECS CloudWatch log group"
  value       = aws_cloudwatch_log_group.ecs.name
}

output "mini_services_log_group_name" {
  description = "Name of the mini services CloudWatch log group"
  value       = aws_cloudwatch_log_group.mini_services.name
}

# ── Auto-scaling Outputs ───────────────────────────────────────────────────

output "app_autoscaling_target_id" {
  description = "ID of the app auto-scaling target"
  value       = aws_appautoscaling_target.app.resource_id
}

output "app_min_capacity" {
  description = "Minimum capacity for app auto-scaling"
  value       = aws_appautoscaling_target.app.min_capacity
}

output "app_max_capacity" {
  description = "Maximum capacity for app auto-scaling"
  value       = aws_appautoscaling_target.app.max_capacity
}
