variable "name" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }
variable "node_type" {
  type = string
  default = "cache.r7g.large"
}
resource "aws_elasticache_subnet_group" "this" {
  name = var.name
  subnet_ids = var.subnet_ids
}
resource "aws_elasticache_replication_group" "this" {
  replication_group_id = var.name
  description = "Managed Redis for AMP"
  engine = "redis"
  node_type = var.node_type
  port = 6379
  subnet_group_name = aws_elasticache_subnet_group.this.name
  security_group_ids = var.security_group_ids
  transit_encryption_enabled = true
  at_rest_encryption_enabled = true
  automatic_failover_enabled = true
  multi_az_enabled = true
  num_cache_clusters = 2
  snapshot_retention_limit = 7
  apply_immediately = false
}
output "primary_endpoint" { value = aws_elasticache_replication_group.this.primary_endpoint_address }
