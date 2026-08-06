# Atlas private networking

The base module exposes Atlas project and cluster identifiers needed for private networking. Production must add the provider-specific Atlas PrivateLink resources after the target VPC and subnets exist:

1. Create an Atlas `mongodbatlas_privatelink_endpoint` for AWS and the deployment region.
2. Create an `aws_vpc_endpoint` of type `Interface` in private subnets using the Atlas endpoint service name.
3. Register the cloud endpoint through `mongodbatlas_privatelink_endpoint_service`.
4. Verify private DNS and TLS connectivity from EKS.
5. Remove broad Atlas IP access-list entries.

Exact attributes vary across MongoDB Atlas provider versions, so pin the provider and validate against the selected version before adding these resources. Do not expose `0.0.0.0/0` as a temporary production workaround.
