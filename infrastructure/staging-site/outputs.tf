output "aws_account_id" {
  description = "AWS account id used for the staging site resources."
  value       = data.aws_caller_identity.current.account_id
}

output "bucket_name" {
  description = "Name of the private S3 bucket serving as the CloudFront origin."
  value       = aws_s3_bucket.site.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution id for cache invalidations and deploys."
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution hostname."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "hosted_zone_id" {
  description = "Route 53 hosted zone id used for the staging record."
  value       = data.aws_route53_zone.primary.zone_id
}

output "staging_url" {
  description = "Public staging URL."
  value       = "https://${var.domain_name}"
}