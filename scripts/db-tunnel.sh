#!/bin/bash
set -e

REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${1:-staging}"
LOCAL_PORT="${2:-5432}"
TF_DIR="$(cd "$(dirname "$0")/../infrastructure/environments/$ENVIRONMENT" && pwd)"

echo "Fetching Terraform outputs for $ENVIRONMENT..."
DB_ENDPOINT=$(terraform -chdir="$TF_DIR" output -raw db_endpoint)
DB_SECRET_ARN=$(terraform -chdir="$TF_DIR" output -raw db_secret_arn)
EIC_ENDPOINT_ID=$(terraform -chdir="$TF_DIR" output -raw eic_endpoint_id)
BASTION_ID=$(terraform -chdir="$TF_DIR" output -raw bastion_instance_id)

# Ensure bastion is running
echo "Checking bastion state..."
BASTION_STATE=$(aws ec2 describe-instances \
  --instance-ids "$BASTION_ID" \
  --region "$REGION" \
  --query "Reservations[0].Instances[0].State.Name" --output text)

if [ "$BASTION_STATE" = "stopped" ]; then
  echo "Starting bastion instance..."
  aws ec2 start-instances --instance-ids "$BASTION_ID" --region "$REGION" > /dev/null
  echo "Waiting for bastion to be running..."
  aws ec2 wait instance-running --instance-ids "$BASTION_ID" --region "$REGION"
  echo "Waiting for instance status checks..."
  aws ec2 wait instance-status-ok --instance-ids "$BASTION_ID" --region "$REGION"
elif [ "$BASTION_STATE" = "running" ]; then
  echo "Bastion is already running."
elif [ "$BASTION_STATE" = "pending" ]; then
  echo "Bastion is starting, waiting..."
  aws ec2 wait instance-running --instance-ids "$BASTION_ID" --region "$REGION"
  aws ec2 wait instance-status-ok --instance-ids "$BASTION_ID" --region "$REGION"
else
  echo "Error: Bastion is in unexpected state: $BASTION_STATE" >&2
  exit 1
fi

echo "Fetching database credentials from Secrets Manager..."
SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id "$DB_SECRET_ARN" \
  --region "$REGION" \
  --query SecretString --output text)

DB_USER=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['username'])")
DB_NAME=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['dbname'])")
DB_PASS=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['password'])")

echo ""
echo "== Connection Details =="
echo "  Host:     localhost"
echo "  Port:     $LOCAL_PORT"
echo "  Database: $DB_NAME"
echo "  User:     $DB_USER"
echo "  Password: $DB_PASS"
echo ""
echo "Connect with:"
echo "  psql \"postgresql://$DB_USER:$DB_PASS@localhost:$LOCAL_PORT/$DB_NAME?sslmode=require\""
echo ""
echo "Opening SSH tunnel through bastion (keep this running)..."
echo "To stop the bastion when done: aws ec2 stop-instances --instance-ids $BASTION_ID --region $REGION"
echo ""

# Generate a temporary SSH key pair for this session
TMPKEY=$(mktemp /tmp/db-tunnel-XXXXXX)
rm -f "$TMPKEY"
ssh-keygen -t ed25519 -f "$TMPKEY" -N "" -q
trap 'rm -f "$TMPKEY" "${TMPKEY}.pub"' EXIT

# Push the public key to the bastion (valid for 60 seconds, long enough to connect)
aws ec2-instance-connect send-ssh-public-key \
  --instance-id "$BASTION_ID" \
  --instance-os-user ec2-user \
  --ssh-public-key "file://${TMPKEY}.pub" \
  --region "$REGION" > /dev/null

ssh -N -L "$LOCAL_PORT:$DB_ENDPOINT:5432" ec2-user@"$BASTION_ID" \
  -i "$TMPKEY" \
  -o ProxyCommand="aws ec2-instance-connect open-tunnel --instance-connect-endpoint-id $EIC_ENDPOINT_ID --instance-id $BASTION_ID --region $REGION" \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null
