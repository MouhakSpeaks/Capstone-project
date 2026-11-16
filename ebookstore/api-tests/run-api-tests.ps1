# End-to-end API test runner for the Ebookstore backend (requires backend on :8080 and seeded DB).
# Usage: powershell -ExecutionPolicy Bypass -File run-api-tests.ps1
param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$ReportPath = "$PSScriptRoot\test-report.md"
)

$ErrorActionPreference = "Stop"
$script:results = New-Object System.Collections.ArrayList
$script:ctx = @{}

function Call($method, $path, $body = $null, $token = $null) {
    $headers = @{}
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    $params = @{ Uri = "$BaseUrl$path"; Method = $method; Headers = $headers; UseBasicParsing = $true }
    if ($null -ne $body) {
        $params["Body"] = ($body | ConvertTo-Json -Depth 6)
        $params["ContentType"] = "application/json"
    }
    try {
        $r = Invoke-WebRequest @params
        $status = [int]$r.StatusCode; $content = $r.Content
    } catch {
        $resp = $_.Exception.Response
        if ($null -eq $resp) { throw }
        $status = [int]$resp.StatusCode
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $content = $reader.ReadToEnd(); $reader.Close()
    }
    $json = $null
    if ($content) { try { $json = $content | ConvertFrom-Json } catch { } }
    return [pscustomobject]@{ Status = $status; Body = $json; Raw = $content }
}

function Check($id, $name, [scriptblock]$block) {
    $detail = ""; $pass = $false
    try {
        $out = & $block
        $pass = [bool]$out.Pass; $detail = [string]$out.Detail
    } catch {
        $detail = "EXCEPTION: $($_.Exception.Message)"
    }
    [void]$script:results.Add([pscustomobject]@{ Id = $id; Name = $name; Result = $(if ($pass) { "PASS" } else { "FAIL" }); Detail = $detail })
    $color = if ($pass) { "Green" } else { "Red" }
    Write-Host ("[{0}] {1} - {2} ({3})" -f $(if ($pass) { "PASS" } else { "FAIL" }), $id, $name, $detail) -ForegroundColor $color
}

function Res($pass, $detail) { return @{ Pass = $pass; Detail = $detail } }

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$userEmail = "tester$stamp@example.com"
$userPass = "Test@1234"

Write-Host "=== Ebookstore API tests @ $BaseUrl ===" -ForegroundColor Cyan

# ---------------- Catalogue (public) ----------------
Check "CAT-01" "GET /api/categories returns seeded categories" {
    $r = Call GET "/api/categories"
    $script:ctx.categoryId = $r.Body.data[0].id
    Res ($r.Status -eq 200 -and $r.Body.data.Count -ge 3) "status=$($r.Status), count=$($r.Body.data.Count)"
}
Check "CAT-02" "GET /api/categories/{id}" {
    $r = Call GET "/api/categories/$($script:ctx.categoryId)"
    Res ($r.Status -eq 200 -and $r.Body.data.id -eq $script:ctx.categoryId) "status=$($r.Status), name=$($r.Body.data.name)"
}
Check "PRD-01" "GET /api/products paginated list" {
    $r = Call GET "/api/products?page=0&size=20"
    Res ($r.Status -eq 200 -and $r.Body.data.totalElements -ge 7) "status=$($r.Status), total=$($r.Body.data.totalElements)"
}
Check "PRD-02" "GET /api/products/{id}" {
    $r = Call GET "/api/products"
    $script:ctx.product = ($r.Body.data.content | Where-Object { $_.stockQuantity -gt 20 } | Select-Object -First 1)
    $script:ctx.product2 = ($r.Body.data.content | Where-Object { $_.stockQuantity -gt 20 -and $_.id -ne $script:ctx.product.id } | Select-Object -First 1)
    $r2 = Call GET "/api/products/$($script:ctx.product.id)"
    Res ($r2.Status -eq 200 -and $r2.Body.data.title -eq $script:ctx.product.title) "status=$($r2.Status), title=$($r2.Body.data.title)"
}
Check "PRD-03" "GET /api/products/{id} unknown id is rejected" {
    $r = Call GET "/api/products/999999"
    Res ($r.Status -eq 400 -or $r.Status -eq 404) "status=$($r.Status), msg=$($r.Body.message)"
}
Check "PRD-04" "Search by keyword (title)" {
    $r = Call GET "/api/products/search?keyword=clean"
    Res ($r.Status -eq 200 -and $r.Body.data.totalElements -ge 1) "status=$($r.Status), hits=$($r.Body.data.totalElements)"
}
Check "PRD-05" "Search by author" {
    $r = Call GET "/api/products/search?keyword=orwell"
    Res ($r.Status -eq 200 -and $r.Body.data.totalElements -ge 1) "status=$($r.Status), hits=$($r.Body.data.totalElements)"
}
Check "PRD-06" "Search with no match returns empty page" {
    $r = Call GET "/api/products/search?keyword=zzzznomatch"
    Res ($r.Status -eq 200 -and $r.Body.data.totalElements -eq 0) "status=$($r.Status), hits=$($r.Body.data.totalElements)"
}
Check "PRD-07" "Products by category" {
    $r = Call GET "/api/products/category/$($script:ctx.categoryId)"
    Res ($r.Status -eq 200 -and $r.Body.data.totalElements -ge 1) "status=$($r.Status), hits=$($r.Body.data.totalElements)"
}
Check "PRD-08" "Related products" {
    $r = Call GET "/api/products/$($script:ctx.product.id)/related"
    Res ($r.Status -eq 200 -and $r.Body.success) "status=$($r.Status), related=$($r.Body.data.Count)"
}

# ---------------- Auth ----------------
Check "AUTH-01" "Register new customer" {
    $r = Call POST "/api/auth/register" @{ firstName = "Test"; lastName = "User"; email = $userEmail; password = $userPass }
    Res (($r.Status -eq 200 -or $r.Status -eq 201) -and $r.Body.data.token) "status=$($r.Status), role=$($r.Body.data.role)"
}
Check "AUTH-02" "Register duplicate email is rejected" {
    $r = Call POST "/api/auth/register" @{ firstName = "Test"; lastName = "User"; email = $userEmail; password = $userPass }
    Res ($r.Status -eq 400) "status=$($r.Status), msg=$($r.Body.message)"
}
Check "AUTH-03" "Register with invalid email / blank fields fails validation" {
    $r = Call POST "/api/auth/register" @{ firstName = ""; lastName = "X"; email = "not-an-email"; password = "" }
    Res ($r.Status -eq 400) "status=$($r.Status), msg=$($r.Body.message)"
}
Check "AUTH-04" "Login with valid credentials returns JWT" {
    $r = Call POST "/api/auth/login" @{ email = $userEmail; password = $userPass }
    $script:ctx.userToken = $r.Body.data.token
    Res ($r.Status -eq 200 -and $r.Body.data.token -and $r.Body.data.role -eq "CUSTOMER") "status=$($r.Status), role=$($r.Body.data.role)"
}
Check "AUTH-05" "Login with wrong password returns 401" {
    $r = Call POST "/api/auth/login" @{ email = $userEmail; password = "wrong" }
    Res ($r.Status -eq 401) "status=$($r.Status)"
}
Check "AUTH-06" "Login with malformed email fails validation" {
    $r = Call POST "/api/auth/login" @{ email = "bad"; password = "x" }
    Res ($r.Status -eq 400) "status=$($r.Status)"
}
Check "AUTH-07" "Seeded admin can login" {
    $r = Call POST "/api/auth/login" @{ email = "admin@bookstore.com"; password = "admin123" }
    $script:ctx.adminToken = $r.Body.data.token
    Res ($r.Status -eq 200 -and $r.Body.data.role -eq "ADMIN") "status=$($r.Status), role=$($r.Body.data.role)"
}

# ---------------- Authorization ----------------
Check "SEC-01" "Cart without token is denied" {
    $r = Call GET "/api/cart"
    Res ($r.Status -eq 401 -or $r.Status -eq 403) "status=$($r.Status)"
}
Check "SEC-02" "Orders with invalid token are denied" {
    $r = Call GET "/api/orders" $null "invalid.jwt.token"
    Res ($r.Status -eq 401 -or $r.Status -eq 403) "status=$($r.Status)"
}
Check "SEC-03" "Customer cannot create product (ADMIN only)" {
    $r = Call POST "/api/products" @{ title = "x"; author = "x"; isbn = "x"; price = 1; categoryId = $script:ctx.categoryId } $script:ctx.userToken
    Res ($r.Status -eq 403) "status=$($r.Status)"
}
Check "SEC-04" "Customer cannot create category (ADMIN only)" {
    $r = Call POST "/api/categories" @{ name = "Hack" } $script:ctx.userToken
    Res ($r.Status -eq 403) "status=$($r.Status)"
}

# ---------------- Admin catalogue management ----------------
Check "ADM-01" "Admin creates category" {
    $r = Call POST "/api/categories" @{ name = "TestCat$stamp"; description = "temp" } $script:ctx.adminToken
    $script:ctx.newCatId = $r.Body.data.id
    Res ($r.Status -eq 201 -and $r.Body.data.id) "status=$($r.Status), id=$($r.Body.data.id)"
}
Check "ADM-02" "Admin updates category" {
    $r = Call PUT "/api/categories/$($script:ctx.newCatId)" @{ name = "TestCat$stamp-upd"; description = "updated" } $script:ctx.adminToken
    Res ($r.Status -eq 200 -and $r.Body.data.name -like "*-upd") "status=$($r.Status), name=$($r.Body.data.name)"
}
Check "ADM-03" "Admin creates product" {
    $r = Call POST "/api/products" @{ title = "Test Book $stamp"; author = "QA Author"; isbn = "TST-$stamp"; price = 19.99; stockQuantity = 10; categoryId = $script:ctx.newCatId } $script:ctx.adminToken
    $script:ctx.newProdId = $r.Body.data.id
    Res ($r.Status -eq 201 -and $r.Body.data.id) "status=$($r.Status), id=$($r.Body.data.id)"
}
Check "ADM-04" "Admin updates product price" {
    $r = Call PUT "/api/products/$($script:ctx.newProdId)" @{ title = "Test Book $stamp"; author = "QA Author"; isbn = "TST-$stamp"; price = 24.99; stockQuantity = 10; categoryId = $script:ctx.newCatId } $script:ctx.adminToken
    Res ($r.Status -eq 200 -and [decimal]$r.Body.data.price -eq 24.99) "status=$($r.Status), price=$($r.Body.data.price)"
}
Check "ADM-05" "Product validation: missing title/price rejected" {
    $r = Call POST "/api/products" @{ author = "x"; isbn = "y"; categoryId = $script:ctx.newCatId } $script:ctx.adminToken
    Res ($r.Status -eq 400) "status=$($r.Status)"
}
Check "ADM-06" "Admin soft-deletes product; it disappears from catalogue" {
    $d = Call DELETE "/api/products/$($script:ctx.newProdId)" $null $script:ctx.adminToken
    $s = Call GET "/api/products/search?keyword=Test Book $stamp"
    Res ($d.Status -eq 200 -and $s.Body.data.totalElements -eq 0) "delete=$($d.Status), searchHits=$($s.Body.data.totalElements)"
}
Check "ADM-07" "Admin deletes category" {
    $c = Call POST "/api/categories" @{ name = "DelCat$stamp" } $script:ctx.adminToken
    $d = Call DELETE "/api/categories/$($c.Body.data.id)" $null $script:ctx.adminToken
    Res ($d.Status -eq 200) "status=$($d.Status)"
}

# ---------------- Cart ----------------
Check "CART-01" "New customer cart is empty" {
    $r = Call GET "/api/cart" $null $script:ctx.userToken
    Res ($r.Status -eq 200 -and $r.Body.data.items.Count -eq 0) "status=$($r.Status), items=$($r.Body.data.items.Count)"
}
Check "CART-02" "Add product to cart" {
    $r = Call POST "/api/cart/items" @{ productId = $script:ctx.product.id; quantity = 1 } $script:ctx.userToken
    $script:ctx.cartItemId = $r.Body.data.items[0].id
    Res ($r.Status -eq 200 -and $r.Body.data.items.Count -eq 1) "status=$($r.Status), items=$($r.Body.data.items.Count)"
}
Check "CART-03" "Adding same product again merges quantity" {
    $r = Call POST "/api/cart/items" @{ productId = $script:ctx.product.id; quantity = 1 } $script:ctx.userToken
    Res ($r.Status -eq 200 -and $r.Body.data.items.Count -eq 1 -and $r.Body.data.items[0].quantity -eq 2) "qty=$($r.Body.data.items[0].quantity)"
}
Check "CART-04" "Update cart item quantity" {
    $r = Call PUT "/api/cart/items/$($script:ctx.cartItemId)?quantity=3" $null $script:ctx.userToken
    Res ($r.Status -eq 200 -and $r.Body.data.items[0].quantity -eq 3) "qty=$($r.Body.data.items[0].quantity)"
}
Check "CART-05" "Quantity < 1 rejected by validation" {
    $r = Call POST "/api/cart/items" @{ productId = $script:ctx.product.id; quantity = 0 } $script:ctx.userToken
    Res ($r.Status -eq 400) "status=$($r.Status)"
}
Check "CART-06" "Adding unknown product rejected" {
    $r = Call POST "/api/cart/items" @{ productId = 999999; quantity = 1 } $script:ctx.userToken
    Res ($r.Status -eq 400) "status=$($r.Status), msg=$($r.Body.message)"
}
Check "CART-07" "Add second product and remove it" {
    $a = Call POST "/api/cart/items" @{ productId = $script:ctx.product2.id; quantity = 1 } $script:ctx.userToken
    $item2 = ($a.Body.data.items | Where-Object { $_.productId -eq $script:ctx.product2.id } | Select-Object -First 1)
    if (-not $item2) { $item2 = $a.Body.data.items | Select-Object -Last 1 }
    $d = Call DELETE "/api/cart/items/$($item2.id)" $null $script:ctx.userToken
    $g = Call GET "/api/cart" $null $script:ctx.userToken
    Res ($a.Body.data.items.Count -eq 2 -and $d.Status -eq 200 -and $d.Body.data.items.Count -eq 1 -and $g.Body.data.items.Count -eq 1) "afterAdd=$($a.Body.data.items.Count), deleteResponseItems=$($d.Body.data.items.Count), refetchedItems=$($g.Body.data.items.Count)"
}

# ---------------- Addresses ----------------
$addr = @{ fullName = "Test User"; street = "1 Main St"; city = "Pune"; state = "MH"; postalCode = "411001"; country = "India"; phone = "9999999999"; defaultAddress = $true }
Check "ADDR-01" "Add address" {
    $r = Call POST "/api/users/addresses" $addr $script:ctx.userToken
    $script:ctx.addressId = $r.Body.data.id
    Res ($r.Status -eq 200 -and $r.Body.data.id) "status=$($r.Status), id=$($r.Body.data.id)"
}
Check "ADDR-02" "List addresses" {
    $r = Call GET "/api/users/addresses" $null $script:ctx.userToken
    Res ($r.Status -eq 200 -and $r.Body.data.Count -ge 1) "count=$($r.Body.data.Count)"
}
Check "ADDR-03" "Update address" {
    $u = $addr.Clone(); $u.city = "Mumbai"
    $r = Call PUT "/api/users/addresses/$($script:ctx.addressId)" $u $script:ctx.userToken
    Res ($r.Status -eq 200 -and $r.Body.data.city -eq "Mumbai") "city=$($r.Body.data.city)"
}
Check "ADDR-04" "Address validation: blank fields rejected" {
    $r = Call POST "/api/users/addresses" @{ fullName = ""; street = ""; city = ""; state = ""; postalCode = ""; country = "" } $script:ctx.userToken
    Res ($r.Status -eq 400) "status=$($r.Status)"
}

# ---------------- Orders ----------------
Check "ORD-01" "Place order from cart (stock decreases, cart cleared)" {
    $before = (Call GET "/api/products/$($script:ctx.product.id)").Body.data.stockQuantity
    $preCart = (Call GET "/api/cart" $null $script:ctx.userToken).Body.data
    $r = Call POST "/api/orders" @{ shippingAddressId = $script:ctx.addressId; pointsToRedeem = 0 } $script:ctx.userToken
    $script:ctx.order = $r.Body.data
    $after = (Call GET "/api/products/$($script:ctx.product.id)").Body.data.stockQuantity
    $cart = Call GET "/api/cart" $null $script:ctx.userToken
    $expected = [decimal]$preCart.totalAmount   # total must equal what the cart contained (independent of CART-07)
    Res ($r.Status -eq 201 -and $r.Body.data.status -eq "CONFIRMED" -and [decimal]$r.Body.data.totalAmount -eq $expected -and ($before - $after) -eq 3 -and $cart.Body.data.items.Count -eq 0) `
      "status=$($r.Status), order=$($r.Body.data.orderNumber), total=$($r.Body.data.totalAmount) (cart total $expected), stock $before->$after, cartItems=$($cart.Body.data.items.Count)"
}
Check "ORD-02" "Place order with empty cart rejected" {
    $r = Call POST "/api/orders" @{ shippingAddressId = $script:ctx.addressId } $script:ctx.userToken
    Res ($r.Status -eq 400) "status=$($r.Status), msg=$($r.Body.message)"
}
Check "ORD-03" "Order history lists the order" {
    $r = Call GET "/api/orders" $null $script:ctx.userToken
    Res ($r.Status -eq 200 -and $r.Body.data.totalElements -ge 1) "total=$($r.Body.data.totalElements)"
}
Check "ORD-04" "Get order by id" {
    $r = Call GET "/api/orders/$($script:ctx.order.id)" $null $script:ctx.userToken
    Res ($r.Status -eq 200 -and $r.Body.data.orderNumber -eq $script:ctx.order.orderNumber) "order=$($r.Body.data.orderNumber)"
}
Check "ORD-05" "Another user cannot read this order" {
    $email2 = "tester2$stamp@example.com"
    $reg = Call POST "/api/auth/register" @{ firstName = "Other"; lastName = "User"; email = $email2; password = $userPass }
    $r = Call GET "/api/orders/$($script:ctx.order.id)" $null $reg.Body.data.token
    Res ($r.Status -eq 400 -or $r.Status -eq 404 -or $r.Status -eq 403) "status=$($r.Status), msg=$($r.Body.message)"
}
Check "ORD-06" "Redeem gift points reduces total" {
    # first order awarded floor(total) points; request 100, expect cap at balance; 1 point = 0.01
    $null = Call POST "/api/cart/items" @{ productId = $script:ctx.product.id; quantity = 1 } $script:ctx.userToken
    $r = Call POST "/api/orders" @{ shippingAddressId = $script:ctx.addressId; pointsToRedeem = 100 } $script:ctx.userToken
    $script:ctx.order2 = $r.Body.data
    $expPts = [math]::Min(100, [int][math]::Floor([decimal]$script:ctx.order.totalAmount))
    $expected = [decimal]$script:ctx.product.price - ($expPts * 0.01)
    Res ($r.Status -eq 201 -and $r.Body.data.pointsRedeemed -eq $expPts -and $expPts -gt 0 -and [decimal]$r.Body.data.totalAmount -eq $expected) "status=$($r.Status), total=$($r.Body.data.totalAmount) (expected $expected), pointsRedeemed=$($r.Body.data.pointsRedeemed)"
}

# ---------------- Payment ----------------
Check "PAY-01" "Process credit-card payment (card masked)" {
    $r = Call POST "/api/users/payment" @{ orderId = $script:ctx.order.id; paymentMethod = "CREDIT_CARD"; cardNumber = "4111111111111111"; cardExpiry = "12/30"; cardCvv = "123" } $script:ctx.userToken
    Res ($r.Status -eq 200 -and $r.Body.data.status -eq "SUCCESS" -and $r.Body.data.maskedCardNumber -eq "**** **** **** 1111") "status=$($r.Status), pay=$($r.Body.data.status), card=$($r.Body.data.maskedCardNumber), txn=$($r.Body.data.transactionId)"
}
Check "PAY-02" "Get payment by order" {
    $r = Call GET "/api/users/payment/order/$($script:ctx.order.id)" $null $script:ctx.userToken
    Res ($r.Status -eq 200 -and [decimal]$r.Body.data.amount -eq [decimal]$script:ctx.order.totalAmount) "amount=$($r.Body.data.amount)"
}
Check "PAY-03" "Payment for unknown order rejected" {
    $r = Call POST "/api/users/payment" @{ orderId = 999999; paymentMethod = "UPI"; upiId = "a@upi" } $script:ctx.userToken
    Res ($r.Status -eq 400) "status=$($r.Status)"
}
Check "PAY-04" "Payment with invalid method rejected" {
    $r = Call POST "/api/users/payment" @{ orderId = $script:ctx.order.id; paymentMethod = "BITCOIN" } $script:ctx.userToken
    Res ($r.Status -ge 400 -and $r.Status -lt 500) "status=$($r.Status)"
}

# ---------------- Cancel ----------------
Check "ORD-07" "Cancel order within 48h" {
    $r = Call PUT "/api/orders/$($script:ctx.order2.id)/cancel" $null $script:ctx.userToken
    Res ($r.Status -eq 200 -and $r.Body.data.status -eq "CANCELLED") "status=$($r.Status), orderStatus=$($r.Body.data.status)"
}
Check "PAY-05" "Cannot pay for a cancelled order" {
    $r = Call POST "/api/users/payment" @{ orderId = $script:ctx.order2.id; paymentMethod = "UPI"; upiId = "a@upi" } $script:ctx.userToken
    Res ($r.Status -eq 400) "status=$($r.Status), msg=$($r.Body.message)"
}

# ---------------- Cleanup ----------------
Check "ADDR-05" "Delete address" {
    $r = Call DELETE "/api/users/addresses/$($script:ctx.addressId)" $null $script:ctx.userToken
    Res ($r.Status -eq 200) "status=$($r.Status), msg=$($r.Body.message)"
}

# ---------------- Report ----------------
$total = $script:results.Count
$passed = ($script:results | Where-Object { $_.Result -eq "PASS" }).Count
$failed = $total - $passed
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("# Ebookstore API Test Report")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("- Run at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$sb.AppendLine("- Target: $BaseUrl")
[void]$sb.AppendLine("- Total: **$total**, Passed: **$passed**, Failed: **$failed**")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("| ID | Test | Result | Details |")
[void]$sb.AppendLine("|----|------|--------|---------|")
foreach ($t in $script:results) {
    $d = ($t.Detail -replace '\|', '/')
    [void]$sb.AppendLine("| $($t.Id) | $($t.Name) | $($t.Result) | $d |")
}
Set-Content -Path $ReportPath -Value $sb.ToString() -Encoding UTF8
Write-Host ""
Write-Host "=== Total: $total  Passed: $passed  Failed: $failed ===" -ForegroundColor Cyan
Write-Host "Report written to $ReportPath"
if ($failed -gt 0) { exit 1 }



