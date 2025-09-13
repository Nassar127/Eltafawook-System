# scripts/demo_reservation_flow.ps1
# End-to-end reservation lifecycle demo on Windows PowerShell

$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8000"

function Get-Branch([string]$code) {
  (Invoke-RestMethod -Uri "$base/api/v1/branches" -Method GET) | Where-Object { $_.code -eq $code }
}
function Get-ItemBySku([string]$sku) {
  (Invoke-RestMethod -Uri "$base/api/v1/items" -Method GET) | Where-Object { $_.sku -eq $sku }
}
function Ensure-Student([string]$name, [string]$phone) {
  $res = Invoke-RestMethod -Uri "$base/api/v1/students/search?phone=$phone" -Method GET
  if (-not $res.value -or $res.value.Count -eq 0) {
    $body = @{ full_name=$name; phone="+2$phone" } | ConvertTo-Json
    return Invoke-RestMethod -Uri "$base/api/v1/students" -Method POST -Body $body -ContentType "application/json"
  } else {
    return $res.value[0]
  }
}

Write-Host "1) Health check..."
$h = Invoke-RestMethod -Uri "$base/healthz" -Method GET
Write-Host "   -> $($h.status) ($($h.env))"

Write-Host "2) Lookup CAI branch and BK-001 item..."
$branch = Get-Branch -code "CAI"
$item   = Get-ItemBySku -sku "BK-001"
if (-not $branch) { throw "Branch CAI not found" }
if (-not $item)   { throw "Item BK-001 not found" }
Write-Host "   -> branch=$($branch.id) item=$($item.id)"

Write-Host "3) Ensure student..."
$student = Ensure-Student -name "Omar Ali" -phone "01002003004"
Write-Host "   -> student=$($student.id) $($student.full_name) $($student.phone)"

Write-Host "4) Create reservation (qty=1, hold 60m)..."
$resBody = @{
  branch_id    = $branch.id
  item_id      = $item.id
  qty          = 1
  hold_minutes = 60
  student_id   = $student.id
} | ConvertTo-Json
$res = Invoke-RestMethod -Uri "$base/api/v1/reservations" -Method POST -Body $resBody -ContentType "application/json"
Write-Host "   -> reservation=$($res.id) status=$($res.status) window=$($res.start) → $($res.end)"

Write-Host "5) Prepay 150.00 EGP..."
$prepay = @{ unit_price_cents = 15000 } | ConvertTo-Json
$pp = Invoke-RestMethod -Uri "$base/api/v1/reservations/$($res.id)/prepay" -Method POST -Body $prepay -ContentType "application/json"
Write-Host "   -> prepaid_cents=$($pp.prepaid_cents) at=$($pp.prepaid_at)"

Write-Host "6) Mark ready (notify customer)..."
$mr = @{ notify = $true } | ConvertTo-Json
$rd = Invoke-RestMethod -Uri "$base/api/v1/reservations/$($res.id)/mark-ready" -Method POST -Body $mr -ContentType "application/json"
Write-Host "   -> status=$($rd.status) notified_at=$($rd.notified_at)"

Write-Host "7) Fulfill (pickup)..."
$ful = Invoke-RestMethod -Uri "$base/api/v1/reservations/$($res.id)/fulfill" -Method POST
Write-Host "   -> sale=$($ful.sale_id) total_cents=$($ful.total_cents) sold_at=$($ful.sold_at)"
Write-Host "   -> inventory after: on_hand=$($ful.inventory.on_hand) reserved=$($ful.inventory.reserved) available=$($ful.inventory.available)"

Write-Host "8) Daily sales rollup (Cairo)..."
$ds = Invoke-RestMethod -Uri "$base/api/v1/reports/daily-sales?branch_code=CAI" -Method GET
"{0} | sales={1} | total={2} EGP" -f $ds.day, $ds.sales_count, $ds.total_egp
