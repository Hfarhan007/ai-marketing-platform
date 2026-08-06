variable "names" { type = set(string) }
resource "aws_secretsmanager_secret" "this" {
  for_each = var.names
  name = each.value
  recovery_window_in_days = 30
}
# Secret versions are intentionally not managed here. Populate values through an approved secret delivery workflow.
output "secret_arns" { value = { for key, secret in aws_secretsmanager_secret.this : key => secret.arn } }
