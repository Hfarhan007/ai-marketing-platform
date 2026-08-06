variable "project_name" { type = string }
variable "org_id" { type = string }
variable "region" { type = string }
variable "cluster_tier" {
  type = string
  default = "M30"
}
variable "database_username" { type = string }
variable "database_password" {
  type = string
  sensitive = true
}
variable "network_cidrs" {
  type = list(string)
  default = []
}
variable "point_in_time_restore_window_days" {
  type = number
  default = 7
}
resource "mongodbatlas_project" "this" {
  name = var.project_name
  org_id = var.org_id
}
resource "mongodbatlas_advanced_cluster" "this" {
  project_id = mongodbatlas_project.this.id
  name = "primary"
  cluster_type = "REPLICASET"
  backup_enabled = true
  replication_specs {
    region_configs {
      provider_name = "AWS"
      region_name = var.region
      priority = 7
      electable_specs {
        instance_size = var.cluster_tier
        node_count = 3
      }
    }
  }
}
resource "mongodbatlas_database_user" "app" {
  project_id = mongodbatlas_project.this.id
  username = var.database_username
  password = var.database_password
  auth_database_name = "admin"
  roles {
    role_name = "readWrite"
    database_name = "ai_marketing"
  }
  scopes {
    name = mongodbatlas_advanced_cluster.this.name
    type = "CLUSTER"
  }
}
resource "mongodbatlas_project_ip_access_list" "allowed" {
  for_each = toset(var.network_cidrs)
  project_id = mongodbatlas_project.this.id
  cidr_block = each.value
  comment = "Terraform managed application network"
}
resource "mongodbatlas_cloud_backup_schedule" "this" {
  project_id = mongodbatlas_project.this.id
  cluster_name = mongodbatlas_advanced_cluster.this.name
  reference_hour_of_day = 2
  reference_minute_of_hour = 0
  restore_window_days = var.point_in_time_restore_window_days
  policy_item {
    frequency_interval = 1
    frequency_type = "hourly"
    retention_unit = "days"
    retention_value = 2
  }
  policy_item {
    frequency_interval = 1
    frequency_type = "daily"
    retention_unit = "days"
    retention_value = 14
  }
  policy_item {
    frequency_interval = 1
    frequency_type = "weekly"
    retention_unit = "weeks"
    retention_value = 8
  }
  policy_item {
    frequency_interval = 1
    frequency_type = "monthly"
    retention_unit = "months"
    retention_value = 12
  }
}
output "project_id" { value = mongodbatlas_project.this.id }
output "connection_strings" {
  value = mongodbatlas_advanced_cluster.this.connection_strings
  sensitive = true
}
