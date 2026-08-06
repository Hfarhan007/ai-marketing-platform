variable "bucket_name" { type = string }
variable "noncurrent_version_retention_days" {
  type = number
  default = 90
}
variable "replication_destination_bucket_arn" {
  type = string
  default = null
}
variable "replication_role_arn" {
  type = string
  default = null
}
resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
  lifecycle { prevent_destroy = true }
}
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id
  block_public_acls = true
  block_public_policy = true
  ignore_public_acls = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" }
    bucket_key_enabled = true
  }
}
resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  rule {
    id = "retain-and-tier-noncurrent-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class = "STANDARD_IA"
    }
    noncurrent_version_transition {
      noncurrent_days = 60
      storage_class = "GLACIER_IR"
    }
    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_retention_days
    }
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }
}
resource "aws_s3_bucket_replication_configuration" "this" {
  count = var.replication_destination_bucket_arn != null && var.replication_role_arn != null ? 1 : 0
  bucket = aws_s3_bucket.this.id
  role = var.replication_role_arn
  rule {
    id = "cross-region-dr"
    status = "Enabled"
    filter {}
    delete_marker_replication { status = "Disabled" }
    destination {
      bucket = var.replication_destination_bucket_arn
      storage_class = "STANDARD_IA"
    }
  }
  depends_on = [aws_s3_bucket_versioning.this]
}
output "bucket_name" { value = aws_s3_bucket.this.bucket }
