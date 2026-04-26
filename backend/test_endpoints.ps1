param(
  [Parameter(Mandatory=$true)]
  [string]$BaseUrl
)

$ErrorActionPreference = "Stop"

$headers = @{"x-navable-api-key"="navable_ZjJnfhGuMiFKSMefFOTyEC4lW9n6lnj8"}

Write-Host "Testing health..."
Invoke-RestMethod -Uri "${BaseUrl}health" -Method GET -Headers $headers | ConvertTo-Json -Depth 10

Write-Host "Testing nearby pins..."
Invoke-RestMethod -Uri "${BaseUrl}pins/nearby?lat=22.7196&lng=75.8577&radius_m=2500" -Method GET -Headers $headers | ConvertTo-Json -Depth 10

Write-Host "Testing voice query..."
$voicePayload = @{
  user_id = "u_demo"
  lat = 22.7196
  lng = 75.8577
  query_text = "Kya yahan mall entrance accessible hai?"
  recent_hazards = @(
    @{hazard="vehicle"; distance_estimate="near"; direction="left"; alert_level="high"}
  )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "${BaseUrl}voice/query" -Method POST -ContentType "application/json" -Body $voicePayload -Headers $headers | ConvertTo-Json -Depth 10

Write-Host "Testing SOS trigger..."
$sosPayload = @{
  user_id = "u_demo"
  lat = 22.7196
  lng = 75.8577
  message = "Emergency, please check my location"
} | ConvertTo-Json

Invoke-RestMethod -Uri "${BaseUrl}sos/trigger" -Method POST -ContentType "application/json" -Body $sosPayload -Headers $headers | ConvertTo-Json -Depth 10

Write-Host "All endpoint tests completed."
