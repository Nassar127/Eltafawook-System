param(
  [string]$Base        = "http://127.0.0.1:8000",
  [string]$BranchCode  = "CAI",
  [string]$SKU         = "BK-001",
  [string]$StudentName = "Omar Ali",
  [string]$Phone       = "01002003004",
  [int]$Qty            = 1,
  [int]$HoldMinutes    = 60,

  # Pricing / actions:
  # - If -Prepay is given and -PriceCents < 0, we'll try to use item.default_price_cents (if your API exposes it).
  [int]$PriceCents     = -1,
  [switch]$Prepay,
  [switch]$Notify,
  [switch]$Fulfill
)

function Step($msg){ Write-Host "• $msg" -ForegroundColor Cyan }

try {
  Step "Health check"
  $health = Invoke-RestMethod -Uri "$Base/healthz"
  Write-Host "  -> $($health.status) ($($health.env))"

  Step "Lookup branch '$BranchCode' and item '$SKU'"
  $branch = (Invoke-RestMethod -Uri "$Base/api/v1/branches") | Where-Object { $_.code -eq $BranchCode }
  if(-not $branch){ throw "Branch '$BranchCode' not found" }
  $item   = (Invoke-RestMethod -Uri "$Base/api/v1/items")    | Where-Object { $_.sku  -eq $SKU }
  if(-not $item){ throw "Item '$SKU' not found" }
  Write-Host "  -> branch=$($branch.id) item=$($item.id)"

  Step "Ensure student (by phone $Phone)"
  $studentId = $null
  $found = Invoke-RestMethod -Uri "$Base/api/v1/students/search?phone=$Phone"
  if ($found -and $found.value) { $studentId = ($found.value | Select-Object -First 1 -ExpandProperty id) }
  if (-not $studentId) {
    $created = Invoke-RestMethod -Uri "$Base/api/v1/students" -Method POST `
      -Body (@{ full_name=$StudentName; phone="+2$Phone" } | ConvertTo-Json) `
      -ContentType "application/json"
    $studentId = $created.id
  }
  Write-Host "  -> studentId=$studentId"

  Step "Create reservation (qty=$Qty, hold=$HoldMinutes m)"
  $body  = @{
    branch_id    = $branch.id
    item_id      = $item.id
    qty          = $Qty
    hold_minutes = $HoldMinutes
    student_id   = $studentId
  } | ConvertTo-Json
  $res = Invoke-RestMethod -Uri "$Base/api/v1/reservations" -Method POST -Body $body -ContentType "application/json"
  Write-Host "  -> reservation=$($res.id) status=$($res.status)"

  if ($Prepay -or $PriceCents -ge 0) {
    if ($PriceCents -lt 0) {
      # Try auto-price from item if your API exposes default_price_cents
      try { $PriceCents = [int]$item.default_price_cents } catch { $PriceCents = 0 }
    }
    Step "Prepay unit price = $([math]::Round($PriceCents/100,2)) EGP"
    $pre = Invoke-RestMethod -Uri "$Base/api/v1/reservations/$($res.id)/prepay" -Method POST `
      -Body (@{ unit_price_cents = $PriceCents } | ConvertTo-Json) -ContentType "application/json"
    Write-Host "  -> prepaid_cents=$($pre.prepaid_cents) at=$($pre.prepaid_at)"
  }

  if ($Notify) {
    Step "Mark ready (notify customer)"
    $mr = Invoke-RestMethod -Uri "$Base/api/v1/reservations/$($res.id)/mark-ready" -Method POST `
      -Body (@{ notify = $true } | ConvertTo-Json) -ContentType "application/json"
    Write-Host "  -> status=$($mr.status) notified_at=$($mr.notified_at)"
  }

  if ($Fulfill) {
    Step "Fulfill (pickup)"
    $ful = Invoke-RestMethod -Uri "$Base/api/v1/reservations/$($res.id)/fulfill" -Method POST
    Write-Host ("  -> sale={0} total={1} EGP" -f $ful.sale_id, ([math]::Round($ful.total_cents/100,2)))
    Write-Host ("  -> inventory after: on_hand={0} reserved={1} available={2}" -f `
      $ful.inventory.on_hand, $ful.inventory.reserved, $ful.inventory.available)
  }

  Step "Inventory snapshot"
  $inv = Invoke-RestMethod -Uri "$Base/api/v1/inventory/summary-by-code?branch_code=$BranchCode&sku=$SKU"
  Write-Host ("  -> on_hand={0} reserved={1} available={2}" -f $inv.on_hand, $inv.reserved, $inv.available)

  Step "Daily sales rollup"
  $sales = Invoke-RestMethod -Uri "$Base/api/v1/reports/daily-sales?branch_code=$BranchCode"
  Write-Host ("  -> {0} | sales={1} | total={2} EGP" -f $sales.day, $sales.sales_count, $sales.total_egp)

  Write-Host ""
  Write-Host "Done. Reservation ID:" $res.id
}
catch {
  Write-Error $_
  exit 1
}
