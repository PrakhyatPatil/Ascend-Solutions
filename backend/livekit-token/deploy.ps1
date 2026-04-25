param(
  [Parameter(Mandatory=$true)]
  [string]$FunctionName,

  [Parameter(Mandatory=$true)]
  [string]$RoleArn,

  [Parameter(Mandatory=$true)]
  [string]$LivekitApiKey,

  [Parameter(Mandatory=$true)]
  [string]$LivekitApiSecret,

  [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI not found. Install AWS CLI v2 before running this script."
}

Push-Location $PSScriptRoot
try {
  if (Test-Path ".\lambda.zip") { Remove-Item ".\lambda.zip" -Force }
  npm install
  Compress-Archive -Path .\index.js, .\package.json, .\node_modules -DestinationPath .\lambda.zip -Force

  $exists = $true
  try {
    aws lambda get-function --function-name $FunctionName --region $Region | Out-Null
  } catch {
    $exists = $false
  }

  if (-not $exists) {
    aws lambda create-function `
      --function-name $FunctionName `
      --runtime nodejs20.x `
      --handler index.handler `
      --zip-file fileb://lambda.zip `
      --role $RoleArn `
      --timeout 10 `
      --memory-size 256 `
      --region $Region | Out-Null
  } else {
    aws lambda update-function-code `
      --function-name $FunctionName `
      --zip-file fileb://lambda.zip `
      --region $Region | Out-Null
  }

  aws lambda update-function-configuration `
    --function-name $FunctionName `
    --environment "Variables={LIVEKIT_API_KEY=$LivekitApiKey,LIVEKIT_API_SECRET=$LivekitApiSecret}" `
    --region $Region | Out-Null

  $urlConfig = $null
  try {
    $urlConfig = aws lambda get-function-url-config --function-name $FunctionName --region $Region | ConvertFrom-Json
  } catch {
    $urlConfig = aws lambda create-function-url-config `
      --function-name $FunctionName `
      --auth-type NONE `
      --cors "AllowOrigins=*,AllowMethods=POST,OPTIONS,AllowHeaders=*" `
      --region $Region | ConvertFrom-Json

    aws lambda add-permission `
      --function-name $FunctionName `
      --statement-id livekitTokenPublicInvoke `
      --action lambda:InvokeFunctionUrl `
      --principal "*" `
      --function-url-auth-type NONE `
      --region $Region | Out-Null
  }

  Write-Host "LiveKit token lambda ready: $($urlConfig.FunctionUrl)"
}
finally {
  Pop-Location
}
