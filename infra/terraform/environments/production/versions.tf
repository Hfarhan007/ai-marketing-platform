terraform {
  required_version = ">= 1.8.0"
  backend "s3" {}
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
    mongodbatlas = { source = "mongodb/mongodbatlas", version = "~> 1.30" }
  }
}
provider "aws" {
  region = var.aws_region
  default_tags { tags = { Application = "amp", Environment = "production", ManagedBy = "terraform" } }
}
provider "mongodbatlas" {}
