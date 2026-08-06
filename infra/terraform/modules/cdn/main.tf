variable "origin_domain" { type = string }
variable "aliases" { type = list(string) }
variable "certificate_arn" { type = string }
resource "aws_cloudfront_distribution" "this" {
  enabled = true
  aliases = var.aliases
  origin {
    domain_name = var.origin_domain
    origin_id = "web"
    custom_origin_config {
      http_port = 80
      https_port = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols = ["TLSv1.2"]
    }
  }
  default_cache_behavior {
    target_origin_id = "web"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods = ["GET", "HEAD"]
    forwarded_values {
      query_string = true
      cookies { forward = "none" }
    }
  }
  restrictions { geo_restriction { restriction_type = "none" } }
  viewer_certificate {
    acm_certificate_arn = var.certificate_arn
    ssl_support_method = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
output "domain_name" { value = aws_cloudfront_distribution.this.domain_name }
