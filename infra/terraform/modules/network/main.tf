variable "name" { type = string }
variable "vpc_cidr" { type = string }
variable "availability_zones" { type = list(string) }
resource "aws_vpc" "this" {
  cidr_block = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support = true
  tags = { Name = var.name }
}
resource "aws_subnet" "private" {
  for_each = toset(var.availability_zones)
  vpc_id = aws_vpc.this.id
  availability_zone = each.value
  cidr_block = cidrsubnet(var.vpc_cidr, 4, index(var.availability_zones, each.value))
  tags = { Name = "${var.name}-private-${each.value}", Tier = "private" }
}
resource "aws_subnet" "public" {
  for_each = toset(var.availability_zones)
  vpc_id = aws_vpc.this.id
  availability_zone = each.value
  cidr_block = cidrsubnet(var.vpc_cidr, 4, index(var.availability_zones, each.value) + 8)
  map_public_ip_on_launch = true
  tags = { Name = "${var.name}-public-${each.value}", Tier = "public" }
}
resource "aws_internet_gateway" "this" { vpc_id = aws_vpc.this.id }
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
}
resource "aws_route_table_association" "public" {
  for_each = aws_subnet.public
  subnet_id = each.value.id
  route_table_id = aws_route_table.public.id
}
resource "aws_eip" "nat" {
  for_each = aws_subnet.public
  domain = "vpc"
  depends_on = [aws_internet_gateway.this]
}
resource "aws_nat_gateway" "this" {
  for_each = aws_subnet.public
  subnet_id = each.value.id
  allocation_id = aws_eip.nat[each.key].id
  depends_on = [aws_route_table_association.public]
}
resource "aws_route_table" "private" {
  for_each = aws_subnet.private
  vpc_id = aws_vpc.this.id
  route {
    cidr_block = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this[each.key].id
  }
}
resource "aws_route_table_association" "private" {
  for_each = aws_subnet.private
  subnet_id = each.value.id
  route_table_id = aws_route_table.private[each.key].id
}
output "vpc_id" { value = aws_vpc.this.id }
output "private_subnet_ids" { value = values(aws_subnet.private)[*].id }
output "public_subnet_ids" { value = values(aws_subnet.public)[*].id }
