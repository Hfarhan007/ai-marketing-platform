variable "aws_region" { type = string }
variable "atlas_org_id" { type = string }
variable "atlas_database_username" { type = string }
variable "atlas_database_password" {
  type = string
  sensitive = true
}
variable "eks_cluster_role_arn" { type = string }
variable "eks_node_role_arn" { type = string }
