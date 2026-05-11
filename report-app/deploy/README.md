# Deploying to AWS (CloudFront + S3 + ALB + ECS Fargate)

Target architecture:

```
Internet ──► CloudFront (HTTPS, *.cloudfront.net)
                │
                ├─ /*      ──► S3 bucket (React build, private, OAC-protected)
                └─ /api/*  ──► ALB (HTTP :80) ──► ECS Fargate task ──► S3 (Excel)
```

CloudFront terminates HTTPS for free using its default certificate; everything internal is HTTP.

Variables used throughout. Replace before running commands:

```
AWS_REGION=ap-south-1
ACCOUNT_ID=<your 12-digit account id>
APP=india-info
ECR_REPO=$APP
IMAGE_TAG=v1
S3_DATA_BUCKET=<bucket holding the Excel report>
S3_DATA_KEY=<path/to/file.xlsx>
S3_WEB_BUCKET=$APP-web-$ACCOUNT_ID
CLUSTER=$APP-cluster
SERVICE=$APP-svc
TASK_FAMILY=$APP-task
ALB_NAME=$APP-alb
TG_NAME=$APP-tg
VPC_ID=<your default VPC>
SUBNET_IDS=<two public subnet ids, comma-separated>
SG_ALB=<sg id for ALB>
SG_TASK=<sg id for the task>
```

## 1. Build and push the backend image to ECR

```bash
aws ecr create-repository --repository-name $ECR_REPO --region $AWS_REGION

aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

cd report-app/backend
docker build -t $ECR_REPO:$IMAGE_TAG .
docker tag $ECR_REPO:$IMAGE_TAG $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG
```

## 2. Create IAM roles for the ECS task

**Execution role** — lets ECS pull the image and push logs to CloudWatch. Attach AWS-managed policy `AmazonECSTaskExecutionRolePolicy`. Trust policy: `ecs-tasks.amazonaws.com`.

**Task role** — what the running container can do. Inline policy granting access to your Excel object only:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::<S3_DATA_BUCKET>/<S3_DATA_KEY>"
  }]
}
```

Trust policy: `ecs-tasks.amazonaws.com`. Capture both role ARNs.

## 3. Security groups

- **SG_ALB**: inbound 80 from `0.0.0.0/0`. (You can lock this down to CloudFront's managed prefix list `com.amazonaws.global.cloudfront.origin-facing` after CloudFront is created.)
- **SG_TASK**: inbound 8000 only from `SG_ALB`. No public access.

## 4. ALB + target group

```bash
aws elbv2 create-target-group \
  --name $TG_NAME --protocol HTTP --port 8000 --target-type ip \
  --vpc-id $VPC_ID \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --region $AWS_REGION

aws elbv2 create-load-balancer \
  --name $ALB_NAME --type application --scheme internet-facing \
  --subnets $SUBNET_IDS --security-groups $SG_ALB \
  --region $AWS_REGION

# Get ALB ARN + target group ARN from the responses, then:
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> --protocol HTTP --port 80 \
  --default-actions Type=forward,TargetGroupArn=<TG_ARN> \
  --region $AWS_REGION
```

Save the ALB's DNS name for step 7.

## 5. ECS cluster, task definition, service

Create the cluster:

```bash
aws ecs create-cluster --cluster-name $CLUSTER --region $AWS_REGION
```

Register a task definition (`task-definition.json`):

```json
{
  "family": "india-info-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "<EXECUTION_ROLE_ARN>",
  "taskRoleArn": "<TASK_ROLE_ARN>",
  "containerDefinitions": [{
    "name": "api",
    "image": "<ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/india-info:v1",
    "portMappings": [{"containerPort": 8000, "protocol": "tcp"}],
    "essential": true,
    "environment": [
      {"name": "AWS_REGION", "value": "<AWS_REGION>"},
      {"name": "S3_BUCKET", "value": "<S3_DATA_BUCKET>"},
      {"name": "S3_KEY", "value": "<S3_DATA_KEY>"},
      {"name": "CACHE_TTL_SECONDS", "value": "600"},
      {"name": "CORS_ORIGINS", "value": "*"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/india-info",
        "awslogs-region": "<AWS_REGION>",
        "awslogs-stream-prefix": "api",
        "awslogs-create-group": "true"
      }
    }
  }]
}
```

```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json --region $AWS_REGION
```

Create the service:

```bash
aws ecs create-service \
  --cluster $CLUSTER --service-name $SERVICE \
  --task-definition $TASK_FAMILY --launch-type FARGATE \
  --desired-count 1 \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SG_TASK],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=<TG_ARN>,containerName=api,containerPort=8000" \
  --region $AWS_REGION
```

Once the target shows `healthy` in the target group, hit `http://<ALB_DNS>/api/health` to confirm.

## 6. Build and upload the frontend

```bash
cd report-app/frontend
npm ci
npm run build      # uses .env.production → VITE_API_BASE_URL=/api

aws s3 mb s3://$S3_WEB_BUCKET --region $AWS_REGION
aws s3 sync dist/ s3://$S3_WEB_BUCKET/ --delete
```

Keep the bucket private — block all public access. CloudFront will read it via OAC.

## 7. CloudFront distribution

Create a distribution with **two origins**:

1. **S3 origin** — domain `$S3_WEB_BUCKET.s3.$AWS_REGION.amazonaws.com`. Create an Origin Access Control (OAC), attach it to this origin, then update the bucket policy to allow `cloudfront.amazonaws.com` from your distribution ARN.
2. **ALB origin** — domain `<ALB_DNS>`, protocol HTTP, port 80.

Behaviors:

| Path pattern | Origin | Viewer protocol | Cache policy | Origin request policy |
|---|---|---|---|---|
| `/api/*`  | ALB origin | Redirect HTTP→HTTPS | `CachingDisabled` | `AllViewerExceptHostHeader` |
| `*` (default) | S3 origin | Redirect HTTP→HTTPS | `CachingOptimized` | `CORS-S3Origin` |

Default root object: `index.html`. Custom error responses: 403 and 404 → `/index.html` (SPA fallback for react-router routes like `/report/:rank`).

After deployment finishes (10–15 min), the CloudFront URL `https://d1234abcd.cloudfront.net` is your public site.

## 8. Smoke tests

```bash
CF=https://<your-cloudfront-domain>
curl $CF/api/health
curl $CF/api/report/metadata     # confirms task IAM role can read the Excel
# Open $CF/ in a browser — table should render with all 9 columns.
```

## 9. Updates after first deploy

```bash
# Backend code change
cd report-app/backend
docker build -t $ECR_REPO:v2 .
docker tag  $ECR_REPO:v2 $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:v2
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:v2

# Register new task definition revision pointing at :v2, then:
aws ecs update-service --cluster $CLUSTER --service $SERVICE \
  --task-definition $TASK_FAMILY --force-new-deployment --region $AWS_REGION

# Frontend code change
cd report-app/frontend
npm run build
aws s3 sync dist/ s3://$S3_WEB_BUCKET/ --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

## Common pitfalls

- **Task fails to pull image** — execution role missing `AmazonECSTaskExecutionRolePolicy` or wrong ECR URI.
- **Task starts but ALB shows unhealthy** — SG_TASK doesn't allow :8000 from SG_ALB, or health check path doesn't match `/api/health`.
- **403 from CloudFront on the SPA** — missing 403/404 → `/index.html` error responses.
- **`Failed to load report data` in browser** — task role can't read the Excel; check CloudWatch logs `/ecs/india-info`.
- **CORS errors** — frontend was built against the dev API URL instead of `/api`. Re-build with `.env.production` in place.
