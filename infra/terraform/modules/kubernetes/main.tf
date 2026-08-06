variable "name" { type = string }
variable "subnet_ids" { type = list(string) }
variable "cluster_role_arn" { type = string }
variable "node_role_arn" { type = string }
variable "node_instance_types" {
  type = list(string)
  default = ["m7i.large"]
}
resource "aws_eks_cluster" "this" {
  name = var.name
  role_arn = var.cluster_role_arn
  version = "1.32"
  vpc_config {
    subnet_ids = var.subnet_ids
    endpoint_private_access = true
    endpoint_public_access = false
  }
  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}
resource "aws_eks_node_group" "system" {
  cluster_name = aws_eks_cluster.this.name
  node_group_name = "system"
  node_role_arn = var.node_role_arn
  subnet_ids = var.subnet_ids
  instance_types = var.node_instance_types
  scaling_config {
    desired_size = 3
    min_size = 2
    max_size = 10
  }
  update_config { max_unavailable_percentage = 25 }
}
output "cluster_name" { value = aws_eks_cluster.this.name }
output "endpoint" {
  value = aws_eks_cluster.this.endpoint
  sensitive = true
}
