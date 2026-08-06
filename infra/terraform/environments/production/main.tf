locals { name = "amp-production" }
data "aws_availability_zones" "available" { state = "available" }
module "network" {
  source = "../../modules/network"
  name = local.name
  vpc_cidr = "10.30.0.0/16"
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 3)
}
resource "aws_security_group" "redis" {
  name = "${local.name}-redis"
  vpc_id = module.network.vpc_id
  ingress {
    from_port = 6379
    to_port = 6379
    protocol = "tcp"
    cidr_blocks = ["10.30.0.0/16"]
  }
}
module "kubernetes" {
  source = "../../modules/kubernetes"
  name = local.name
  subnet_ids = module.network.private_subnet_ids
  cluster_role_arn = var.eks_cluster_role_arn
  node_role_arn = var.eks_node_role_arn
  node_instance_types = ["m7i.xlarge"]
}
module "mongodb" {
  source = "../../modules/mongodb"
  project_name = local.name
  org_id = var.atlas_org_id
  region = upper(replace(var.aws_region, "-", "_"))
  cluster_tier = "M40"
  database_username = var.atlas_database_username
  database_password = var.atlas_database_password
  network_cidrs = ["10.30.0.0/16"]
}
module "redis" {
  source = "../../modules/redis"
  name = local.name
  subnet_ids = module.network.private_subnet_ids
  security_group_ids = [aws_security_group.redis.id]
  node_type = "cache.r7g.large"
}
module "storage" {
  source = "../../modules/storage"
  bucket_name = "${local.name}-assets"
}
module "secrets" {
  source = "../../modules/secrets"
  names = ["${local.name}/runtime"]
}
module "observability" {
  source = "../../modules/observability"
  name = local.name
  retention_days = 90
}
