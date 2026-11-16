# Supplemental API tests: BRD gap checks, boundary values and extra security checks.
# Complements run-api-tests.ps1. Creates its own users/products with unique names.
# Usage: powershell -ExecutionPolicy Bypass -File run-supplemental-tests.ps1
$ErrorActionPreference = 'Stop'
$Base = 'http://localhost:8080'
$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$results = New-Object System.Collections.ArrayList

function Call($method, $path, $body = $null, $token = $null) {
  $h = @{}
  if ($token) { $h['Authorization'] = "Bearer $token" }
  $args2 = @{ Uri = "$Base$path"; Method = $method; Headers = $h; UseBasicParsing = $true; ContentType = 'application/json' }
  if ($null -ne $body) { $args2['Body'] = ($body | ConvertTo-Json -Depth 6) }
  try {
    $r = Invoke-WebRequest @args2
    $code = [int]$r.StatusCode; $text = $r.Content
  } catch {
    $resp = $_.Exception.Response
    if ($null -eq $resp) { return @{ status = 0; json = $null; raw = $_.Exception.Message } }
    $code = [int]$resp.StatusCode
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream()); $text = $sr.ReadToEnd()
  }
  $j = $null
  try { if ($text) { $j = $text | ConvertFrom-Json } } catch {}
  return @{ status = $code; json = $j; raw = $text }
}
function Rec($id, $name, $pass, $details) {
  [void]$results.Add([pscustomobject]@{ ID = $id; Test = $name; Result = $(if ($pass) { 'PASS' } else { 'FAIL' }); Details = $details })
}
function Reg($tag) {
  $email = "$tag$stamp@example.com"
  $r = Call 'POST' '/api/auth/register' @{ firstName = 'Sup'; lastName = $tag; email = $email; password = 'Passw0rd!' }
  return @{ email = $email; token = $r.json.data.token; resp = $r }
}

# ---- setup ----
$admin = Call 'POST' '/api/auth/login' @{ email = 'admin@bookstore.com'; password = 'admin123' }
$at = $admin.json.data.token
$cat = (Call 'GET' '/api/categories').json.data[0].id
function NewProduct($title, $price, $stock) {
  $r = Call 'POST' '/api/products' @{ title = "$title $stamp"; author = 'Sup Author'; isbn = "S$stamp-$([guid]::NewGuid().ToString('N').Substring(0,6))"; price = $price; stockQuantity = $stock; categoryId = $cat } $at
  return $r.json.data
}
function NewAddr($token) {
  $r = Call 'POST' '/api/users/addresses' @{ fullName = 'Sup User'; street = '1 Test St'; city = 'Pune'; state = 'MH'; postalCode = '411001'; country = 'India' } $token
  return $r.json.data.id
}

# ---- validation / boundary ----
$p0 = Call 'POST' '/api/products' @{ title = 'Zero'; author = 'A'; isbn = "Z$stamp"; price = 0; categoryId = $cat } $at
Rec 'SUP-01' 'Product price 0 rejected (BR price > 0)' ($p0.status -eq 400) "status=$($p0.status)"
$pn = Call 'POST' '/api/products' @{ title = 'Neg'; author = 'A'; isbn = "N$stamp"; price = -5; categoryId = $cat } $at
Rec 'SUP-02' 'Product price negative rejected' ($pn.status -eq 400) "status=$($pn.status)"
$dupIsbn = "D$stamp"
$d1 = Call 'POST' '/api/products' @{ title = "Dup1 $stamp"; author = 'A'; isbn = $dupIsbn; price = 5; categoryId = $cat } $at
$d2 = Call 'POST' '/api/products' @{ title = "Dup2 $stamp"; author = 'A'; isbn = $dupIsbn; price = 5; categoryId = $cat } $at
Rec 'SUP-03' 'Duplicate ISBN rejected with a client error (not 500)' ($d2.status -ge 400 -and $d2.status -lt 500) "status=$($d2.status)"
$sp = Reg 'shortpw'
$short = Call 'POST' '/api/auth/register' @{ firstName = 'S'; lastName = 'P'; email = "sp2$stamp@example.com"; password = '1' }
Rec 'SUP-04' 'Password minimum length enforced' ($short.status -eq 400) "status=$($short.status) (1-character password accepted if 200/201)"
$pg = Call 'GET' '/api/products?page=0&size=3'
Rec 'SUP-05' 'Paging honours size=3' ($pg.json.data.content.Count -eq 3) "items=$($pg.json.data.content.Count), totalPages=$($pg.json.data.totalPages)"
$ci = Call 'GET' '/api/products/search?keyword=COSMOS'
Rec 'SUP-06' 'Search is case-insensitive (COSMOS)' ($ci.json.data.totalElements -ge 1) "hits=$($ci.json.data.totalElements)"
$ns = Call 'GET' '/api/products/search'
Rec 'SUP-07' 'Search without keyword is a client error' ($ns.status -ge 400 -and $ns.status -lt 500) "status=$($ns.status)"

# ---- security ----
$tam = Call 'GET' '/api/orders' $null "$($sp.token)x"
Rec 'SUP-08' 'Tampered token is denied' ($tam.status -in 401, 403) "status=$($tam.status)"
$ua = Reg 'ua'; $ub = Reg 'ub'
$addrA = NewAddr $ua.token
$upd = Call 'PUT' "/api/users/addresses/$addrA" @{ fullName = 'Hacker'; street = 'x'; city = 'x'; state = 'x'; postalCode = 'x'; country = 'x' } $ub.token
Rec 'SUP-09' "Customer B cannot update customer A's address" ($upd.status -ge 400) "status=$($upd.status)"
$delx = Call 'DELETE' "/api/users/addresses/$addrA" $null $ub.token
Rec 'SUP-10' "Customer B cannot delete customer A's address" ($delx.status -ge 400) "status=$($delx.status)"
$prodS = NewProduct 'IsoBook' 10 50
[void](Call 'POST' '/api/cart/items' @{ productId = $prodS.id; quantity = 1 } $ua.token)
$cb = Call 'GET' '/api/cart' $null $ub.token
Rec 'SUP-11' "Customer B's cart does not contain customer A's items" ($cb.json.data.items.Count -eq 0) "B items=$($cb.json.data.items.Count)"
$adm = Call 'DELETE' "/api/products/$($prodS.id)" $null $ub.token
Rec 'SUP-12' 'Customer cannot delete a product' ($adm.status -eq 403) "status=$($adm.status)"
$swag = Call 'GET' '/swagger-ui.html'
Rec 'SUP-13' 'Swagger UI reachable' ($swag.status -eq 200) "status=$($swag.status)"

# ---- points boundaries ----
$cheap = NewProduct 'Cheap' 20.00 100
$uc = Reg 'pts'; $addrC = NewAddr $uc.token
[void](Call 'POST' '/api/cart/items' @{ productId = $cheap.id; quantity = 1 } $uc.token)
$o1 = Call 'POST' '/api/orders' @{ shippingAddressId = $addrC; pointsToRedeem = 0 } $uc.token
Rec 'SUP-14' 'Order total $20.00 earns 20 points (verified via next redeem cap)' ($o1.status -in 200, 201) "order=$($o1.json.data.orderNumber), total=$($o1.json.data.totalAmount)"
[void](Call 'POST' '/api/cart/items' @{ productId = $cheap.id; quantity = 1 } $uc.token)
$o2 = Call 'POST' '/api/orders' @{ shippingAddressId = $addrC; pointsToRedeem = 1000 } $uc.token
Rec 'SUP-15' 'Redeem capped at balance (requested 1000, balance 20)' ($o2.json.data.pointsRedeemed -eq 20) "redeemed=$($o2.json.data.pointsRedeemed), total=$($o2.json.data.totalAmount) (expected 19.80)"
Rec 'SUP-16' 'Total = price - redeemed x 0.01' ([decimal]$o2.json.data.totalAmount -eq [decimal]19.80) "total=$($o2.json.data.totalAmount)"
$floorP = NewProduct 'Floor' 0.10 100
$uf = Reg 'floor'; $addrF = NewAddr $uf.token
[void](Call 'POST' '/api/cart/items' @{ productId = $cheap.id; quantity = 1 } $uf.token)
[void](Call 'POST' '/api/orders' @{ shippingAddressId = $addrF; pointsToRedeem = 0 } $uf.token)
[void](Call 'POST' '/api/cart/items' @{ productId = $floorP.id; quantity = 1 } $uf.token)
$of = Call 'POST' '/api/orders' @{ shippingAddressId = $addrF; pointsToRedeem = 20 } $uf.token
Rec 'SUP-17' 'Total never below $0 (price 0.10, redeem 20 points = $0.20)' ([decimal]$of.json.data.totalAmount -ge 0) "total=$($of.json.data.totalAmount)"
[void](Call 'POST' '/api/cart/items' @{ productId = $cheap.id; quantity = 1 } $uf.token)
$on = Call 'POST' '/api/orders' @{ shippingAddressId = $addrF; pointsToRedeem = -50 } $uf.token
Rec 'SUP-18' 'Negative pointsToRedeem rejected or ignored (total stays $20.00)' ($on.status -ge 400 -or [decimal]$on.json.data.totalAmount -eq 20) "status=$($on.status), total=$($on.json.data.totalAmount), pointsRedeemed=$($on.json.data.pointsRedeemed)"
[void](Call 'POST' '/api/cart/items' @{ productId = $cheap.id; quantity = 1 } $uc.token)
$noaddr = Call 'POST' '/api/orders' @{ shippingAddressId = 999999; pointsToRedeem = 0 } $uc.token
Rec 'SUP-19' 'Order with unknown address rejected' ($noaddr.status -ge 400) "status=$($noaddr.status), msg=$($noaddr.json.message)"

# ---- cancel rules ----
$c1 = Call 'PUT' "/api/orders/$($o1.json.data.id)/cancel" $null $uc.token
$c2 = Call 'PUT' "/api/orders/$($o1.json.data.id)/cancel" $null $uc.token
Rec 'SUP-20' 'Cancel an order that is already CANCELLED is rejected' ($c1.status -eq 200 -and $c2.status -ge 400) "first=$($c1.status), second=$($c2.status)"
$cx = Call 'PUT' "/api/orders/$($o2.json.data.id)/cancel" $null $ub.token
Rec 'SUP-21' "Customer B cannot cancel customer A's order" ($cx.status -ge 400) "status=$($cx.status)"

# ---- BRD gaps (expected to FAIL today) ----
$low = NewProduct 'LowStock' 15 3
$ug = Reg 'gap'; $addrG = NewAddr $ug.token
$ov = Call 'POST' '/api/cart/items' @{ productId = $low.id; quantity = 10 } $ug.token
Rec 'SUP-22' 'GAP G-1 / FR-D8: adding more than stock (10 vs 3) is rejected' ($ov.status -ge 400) "status=$($ov.status), cart qty=$($ov.json.data.items[0].quantity)"
$og = Call 'POST' '/api/orders' @{ shippingAddressId = $addrG; pointsToRedeem = 0 } $ug.token
$after = (Call 'GET' "/api/products/$($low.id)").json.data.stockQuantity
Rec 'SUP-23' 'GAP G-1 / FR-D8: order of 10 when stock is 3 is rejected' ($og.status -ge 400) "status=$($og.status), stock after=$after (expected 3)"
$sk = NewProduct 'StockRestore' 12 10
$us = Reg 'stk'; $addrS = NewAddr $us.token
[void](Call 'POST' '/api/cart/items' @{ productId = $sk.id; quantity = 2 } $us.token)
$os = Call 'POST' '/api/orders' @{ shippingAddressId = $addrS; pointsToRedeem = 0 } $us.token
$stAfterOrder = (Call 'GET' "/api/products/$($sk.id)").json.data.stockQuantity
[void](Call 'PUT' "/api/orders/$($os.json.data.id)/cancel" $null $us.token)
$stAfterCancel = (Call 'GET' "/api/products/$($sk.id)").json.data.stockQuantity
Rec 'SUP-24' 'GAP G-2 / FR-F7: cancel returns books to stock' ($stAfterCancel -eq 10) "stock: start 10, after order $stAfterOrder, after cancel $stAfterCancel"
$pr = Call 'POST' '/api/users/payment' @{ orderId = $o2.json.data.id; paymentMethod = 'UPI'; upiId = 'x@upi' } $ub.token
Rec 'SUP-25' "GAP G-3 / FR-G5: customer B cannot pay customer A's order" ($pr.status -ge 400) "status=$($pr.status)"
Rec 'SUP-26' 'GAP G-4 / FR-G6: new unpaid order is not CONFIRMED' ($os.json.data.status -ne 'CONFIRMED') "status right after placement=$($os.json.data.status)"
Rec 'SUP-27' 'GAP G-5 / FR-H3: login response exposes the gift point balance' ($null -ne $admin.json.data.giftPoints) "fields=$(($admin.json.data.PSObject.Properties.Name) -join ',')"
$st = Call 'PUT' "/api/orders/$($os.json.data.id)/status" @{ status = 'SHIPPED' } $at
Rec 'SUP-28' 'GAP G-6 / FR-F10: admin can set order status SHIPPED' ($st.status -eq 200) "status=$($st.status)"
$nf = Call 'GET' '/api/products/999999'
Rec 'SUP-29' 'GAP G-7 / NFR-4: unknown product returns 404' ($nf.status -eq 404) "status=$($nf.status)"
$nt = Call 'GET' '/api/cart'
Rec 'SUP-30' 'GAP G-7 / NFR-4: missing token returns 401' ($nt.status -eq 401) "status=$($nt.status)"

# ---- double-cancel must not credit redeemed points twice ----
$ud = Reg 'dbl'; $addrD = NewAddr $ud.token
[void](Call 'POST' '/api/cart/items' @{ productId = $cheap.id; quantity = 1 } $ud.token)
[void](Call 'POST' '/api/orders' @{ shippingAddressId = $addrD; pointsToRedeem = 0 } $ud.token)
[void](Call 'POST' '/api/cart/items' @{ productId = $cheap.id; quantity = 1 } $ud.token)
$od = Call 'POST' '/api/orders' @{ shippingAddressId = $addrD; pointsToRedeem = 20 } $ud.token
[void](Call 'PUT' "/api/orders/$($od.json.data.id)/cancel" $null $ud.token)
[void](Call 'PUT' "/api/orders/$($od.json.data.id)/cancel" $null $ud.token)
[void](Call 'POST' '/api/cart/items' @{ productId = $cheap.id; quantity = 1 } $ud.token)
$probe = Call 'POST' '/api/orders' @{ shippingAddressId = $addrD; pointsToRedeem = 100000 } $ud.token
Rec 'SUP-31' 'Cancelling twice does not credit redeemed points twice (expected balance 39, not 59)' ($probe.json.data.pointsRedeemed -eq 39) "balance seen by probe order=$($probe.json.data.pointsRedeemed)"

# ---- output ----
$pass = ($results | Where-Object Result -eq 'PASS').Count
$fail = ($results | Where-Object Result -eq 'FAIL').Count
$md = @("# Supplemental API Test Report", "", "- Run at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')", "- Target: $Base", "- Total: **$($results.Count)**, Passed: **$pass**, Failed: **$fail**", "", "| ID | Test | Result | Details |", "|----|------|--------|---------|")
foreach ($r in $results) { $md += "| $($r.ID) | $($r.Test) | $($r.Result) | $(($r.Details -replace '\|','/' -replace "`r?`n",' ')) |" }
$md | Set-Content -Path (Join-Path $PSScriptRoot 'supplemental-report.md') -Encoding UTF8
$results | Format-Table ID, Result, Test, Details -AutoSize -Wrap | Out-String -Width 250
"TOTAL=$($results.Count) PASS=$pass FAIL=$fail"
