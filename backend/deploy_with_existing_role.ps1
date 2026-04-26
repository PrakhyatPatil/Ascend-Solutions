$ErrorActionPreference = "Stop"

$FunctionName = "navable-backend"
$ExecutionRoleName = "vaaniseva-lambda-role"
$TableName = "navable-accessibility-pins"
$TopicName = "navable-sos-topic"
$ZipFile = "lambda.zip"
$Handler = "lambda_handler.lambda_handler"
$Runtime = "python3.12"
$Timeout = 20
$Memory = 512
$NavableApiKey = $env:NAVABLE_API_KEY
if (-not $NavableApiKey) {
    throw "NAVABLE_API_KEY is required. Set it in your environment before deployment."
}

$Region = $env:AWS_REGION
if (-not $Region) {
    $Region = aws configure get region
}
if (-not $Region) {
    $Region = "us-east-1"
}

function Invoke-Aws {
    param([string]$Cmd)
    Invoke-Expression $Cmd
    if ($LASTEXITCODE -ne 0) {
        throw "AWS command failed: $Cmd"
    }
}

Write-Host "Using AWS region: $Region"

# 1) Ensure DynamoDB table exists
$tables = aws dynamodb list-tables --region $Region | ConvertFrom-Json
if ($tables.TableNames -notcontains $TableName) {
    Write-Host "Creating DynamoDB table: $TableName"
    Invoke-Aws "aws dynamodb create-table --region $Region --table-name $TableName --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --billing-mode PAY_PER_REQUEST"
    Invoke-Aws "aws dynamodb wait table-exists --region $Region --table-name $TableName"
}

# 2) Seed sample pins
$nowIso = (Get-Date).ToUniversalTime().ToString("o")
$samplePins = @(
    @{ id="pin_001"; name="Treasure Island Mall"; lat="22.7284"; lng="75.8858"; score="4"; status="green"; entry_access="ramp"; lift_status="working"; path_quality="smooth"; blockage="clear"; accessible_toilet="yes"; last_updated_at=$nowIso },
    @{ id="pin_002"; name="Rajwada Market"; lat="22.7170"; lng="75.8544"; score="2"; status="red"; entry_access="step"; lift_status="absent"; path_quality="uneven"; blockage="blocked"; accessible_toilet="no"; last_updated_at=$nowIso },
    @{ id="pin_003"; name="C21 Mall"; lat="22.7451"; lng="75.8937"; score="3"; status="amber"; entry_access="both"; lift_status="working"; path_quality="smooth"; blockage="clear"; accessible_toilet="yes"; last_updated_at=$nowIso }
)

foreach ($pin in $samplePins) {
    $itemJson = @{}
    foreach ($k in $pin.Keys) {
        $itemJson[$k] = @{ S = [string]$pin[$k] }
    }
    $payload = @{ TableName = $TableName; Item = $itemJson } | ConvertTo-Json -Depth 10
    $tmp = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $tmp -Value $payload -Encoding ascii
    Invoke-Aws "aws dynamodb put-item --region $Region --cli-input-json file://$tmp"
    Remove-Item $tmp -Force
}

# 3) Ensure SNS topic exists (publish permission depends on role policy)
$topicArn = (aws sns create-topic --region $Region --name $TopicName | ConvertFrom-Json).TopicArn
Write-Host "SNS Topic ARN: $topicArn"

# 4) Resolve existing execution role
$roleArn = (aws iam get-role --role-name $ExecutionRoleName | ConvertFrom-Json).Role.Arn

# 5) Build Lambda zip
if (Test-Path $ZipFile) { Remove-Item $ZipFile -Force }
Compress-Archive -Path .\lambda_handler.py -DestinationPath .\$ZipFile -Force

# 6) Create or update Lambda
$functionExists = $true
try {
    aws lambda get-function --region $Region --function-name $FunctionName | Out-Null
    if ($LASTEXITCODE -ne 0) { $functionExists = $false }
} catch {
    $functionExists = $false
}

if (-not $functionExists) {
    Write-Host "Creating Lambda function: $FunctionName"
    Invoke-Aws "aws lambda create-function --region $Region --function-name $FunctionName --runtime $Runtime --handler $Handler --role $roleArn --zip-file fileb://$ZipFile --timeout $Timeout --memory-size $Memory"
} else {
    Write-Host "Updating Lambda code: $FunctionName"
    Invoke-Aws "aws lambda update-function-code --region $Region --function-name $FunctionName --zip-file fileb://$ZipFile"
}

Invoke-Aws "aws lambda wait function-updated-v2 --region $Region --function-name $FunctionName"

aws lambda update-function-configuration `
    --region $Region `
    --function-name $FunctionName `
    --timeout $Timeout `
    --memory-size $Memory `
    --environment "Variables={ACCESSIBILITY_PINS_TABLE=$TableName,SOS_TOPIC_ARN=$topicArn,BEDROCK_MODEL_ID=amazon.nova-lite-v1:0,NAVABLE_API_KEY=$NavableApiKey}"
if ($LASTEXITCODE -ne 0) {
    throw "AWS command failed: update-function-configuration"
}
Invoke-Aws "aws lambda wait function-active-v2 --region $Region --function-name $FunctionName"

# 7) Create or update Function URL
$urlExists = $true
try {
    $urlConfig = aws lambda get-function-url-config --region $Region --function-name $FunctionName | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { $urlExists = $false }
} catch {
    $urlExists = $false
}

if (-not $urlExists) {
    $urlConfig = aws lambda create-function-url-config --region $Region --function-name $FunctionName --auth-type NONE --cors "AllowOrigins=*,AllowMethods=GET,POST,AllowHeaders=*" | ConvertFrom-Json
    try {
        aws lambda add-permission --region $Region --function-name $FunctionName --statement-id FunctionURLAllowPublicAccess --action lambda:InvokeFunctionUrl --principal "*" --function-url-auth-type NONE | Out-Null
    } catch {
        # Ignore duplicate statement errors.
    }
}

$baseUrl = $urlConfig.FunctionUrl
Write-Host ""
Write-Host "========================================="
Write-Host "NAVABLE BACKEND DEPLOYED"
Write-Host "Base URL: $baseUrl"
Write-Host "Health:   ${baseUrl}health"
Write-Host "Pins:     ${baseUrl}pins/nearby?lat=22.7196&lng=75.8577&radius_m=2000"
Write-Host "Voice:    ${baseUrl}voice/query  (POST)"
Write-Host "SOS:      ${baseUrl}sos/trigger  (POST)"
Write-Host "========================================="
