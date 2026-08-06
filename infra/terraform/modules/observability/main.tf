variable "name" { type = string }
variable "retention_days" {
  type = number
  default = 30
}
resource "aws_cloudwatch_log_group" "application" {
  name = "/amp/${var.name}/application"
  retention_in_days = var.retention_days
}
resource "aws_cloudwatch_log_group" "audit" {
  name = "/amp/${var.name}/audit"
  retention_in_days = max(var.retention_days, 365)
}
output "application_log_group" { value = aws_cloudwatch_log_group.application.name }
