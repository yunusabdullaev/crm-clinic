$BASE = "http://localhost:8080/api/v1"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "MEDICAL CRM BACKEND SMOKE TESTS" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0

function Test-Endpoint {
    param($Name, $Method, $Url, $Body, $Headers, $ExpectedStatus)
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
        }
        if ($Headers) { $params.Headers = $Headers }
        if ($Body) { $params.Body = $Body }
        
        $response = Invoke-RestMethod @params -ErrorAction Stop
        Write-Host "[PASS] $Name" -ForegroundColor Green
        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($ExpectedStatus -and $statusCode -eq $ExpectedStatus) {
            Write-Host "[PASS] $Name (expected $statusCode)" -ForegroundColor Green
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            return $reader.ReadToEnd() | ConvertFrom-Json
        }
        Write-Host "[FAIL] $Name - $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# ==================== 1. AUTHENTICATION ====================
Write-Host "`n--- 1. AUTHENTICATION TESTS ---" -ForegroundColor Yellow

# Test 1: Login as superadmin
$loginBody = @{
    email = "admin@crm.local"
    password = "Admin123!"
} | ConvertTo-Json

$loginResp = Test-Endpoint "Login Superadmin" "POST" "$BASE/auth/login" $loginBody
if ($loginResp.access_token) {
    $SUPERADMIN_TOKEN = $loginResp.access_token
    Write-Host "   Got access_token: $($SUPERADMIN_TOKEN.Substring(0,20))..." -ForegroundColor DarkGray
    $passed++
} else {
    Write-Host "   ERROR: No access_token received" -ForegroundColor Red
    $failed++
}

# Test 2: Invalid credentials
$badLoginBody = @{
    email = "admin@crm.local"
    password = "wrongpassword"
} | ConvertTo-Json

$badLoginResp = Test-Endpoint "Invalid Credentials (expect 401)" "POST" "$BASE/auth/login" $badLoginBody $null 401
if ($badLoginResp.request_id) {
    Write-Host "   Error includes request_id: $($badLoginResp.request_id)" -ForegroundColor DarkGray
    $passed++
} else {
    Write-Host "   WARN: No request_id in error response" -ForegroundColor Yellow
    $failed++
}

# ==================== 2. SUPERADMIN OPERATIONS ====================
Write-Host "`n--- 2. SUPERADMIN OPERATIONS ---" -ForegroundColor Yellow

$authHeader = @{ Authorization = "Bearer $SUPERADMIN_TOKEN" }

# Test 3: Create Clinic
$clinicBody = @{
    name = "Smoke Test Clinic"
    address = "123 Test Street"
    phone = "+998901234567"
} | ConvertTo-Json

$clinicResp = Test-Endpoint "Create Clinic" "POST" "$BASE/admin/clinics" $clinicBody $authHeader
if ($clinicResp.id) {
    $CLINIC_ID = $clinicResp.id
    Write-Host "   Created clinic ID: $CLINIC_ID" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# Test 4: List Clinics with pagination
$clinicsResp = Test-Endpoint "List Clinics (pagination)" "GET" "$BASE/admin/clinics?page=1&page_size=10" $null $authHeader
if ($clinicsResp.total -ge 0) {
    Write-Host "   Total clinics: $($clinicsResp.total), page_size: $($clinicsResp.page_size)" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# Test 5: Invite Boss
$inviteBody = @{
    email = "boss_test@clinic.com"
} | ConvertTo-Json

$inviteResp = Test-Endpoint "Invite Boss" "POST" "$BASE/admin/clinics/$CLINIC_ID/invite" $inviteBody $authHeader
if ($inviteResp.token) {
    $INVITE_TOKEN = $inviteResp.token
    Write-Host "   Got invite token: $($INVITE_TOKEN.Substring(0,20))..." -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# ==================== 3. BOSS ONBOARDING ====================
Write-Host "`n--- 3. BOSS ONBOARDING ---" -ForegroundColor Yellow

# Test 6: Accept Invite
$acceptBody = @{
    token = $INVITE_TOKEN
    full_name = "Test Boss"
    password = "BossPass123!"
} | ConvertTo-Json

$acceptResp = Test-Endpoint "Accept Invite" "POST" "$BASE/auth/accept-invite" $acceptBody
if ($acceptResp.access_token) {
    $BOSS_TOKEN = $acceptResp.access_token
    Write-Host "   Boss logged in, token: $($BOSS_TOKEN.Substring(0,20))..." -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

$bossHeader = @{ Authorization = "Bearer $BOSS_TOKEN" }

# ==================== 4. STAFF MANAGEMENT ====================
Write-Host "`n--- 4. STAFF MANAGEMENT ---" -ForegroundColor Yellow

# Test 7: Create Doctor
$doctorBody = @{
    email = "doctor_test@clinic.com"
    full_name = "Dr. Test"
    password = "Doctor123!"
    role = "doctor"
} | ConvertTo-Json

$doctorResp = Test-Endpoint "Create Doctor" "POST" "$BASE/boss/users" $doctorBody $bossHeader
if ($doctorResp.id) {
    $DOCTOR_ID = $doctorResp.id
    Write-Host "   Created doctor ID: $DOCTOR_ID" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# Test 8: Create Receptionist
$receptionBody = @{
    email = "reception_test@clinic.com"
    full_name = "Reception Test"
    password = "Reception123!"
    role = "receptionist"
} | ConvertTo-Json

$receptionResp = Test-Endpoint "Create Receptionist" "POST" "$BASE/boss/users" $receptionBody $bossHeader
if ($receptionResp.id) {
    $RECEPTION_ID = $receptionResp.id
    Write-Host "   Created receptionist ID: $RECEPTION_ID" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# Login as receptionist
$recLoginBody = @{
    email = "reception_test@clinic.com"
    password = "Reception123!"
} | ConvertTo-Json

$recLoginResp = Test-Endpoint "Login Receptionist" "POST" "$BASE/auth/login" $recLoginBody
if ($recLoginResp.access_token) {
    $RECEPTION_TOKEN = $recLoginResp.access_token
    $passed++
} else {
    $failed++
}

$recHeader = @{ Authorization = "Bearer $RECEPTION_TOKEN" }

# ==================== 5. PATIENT & APPOINTMENT ====================
Write-Host "`n--- 5. PATIENT & APPOINTMENT ---" -ForegroundColor Yellow

# Test 9: Create Patient
$patientBody = @{
    full_name = "Test Patient"
    phone = "+998909876543"
    date_of_birth = "1990-05-15"
    gender = "male"
    address = "456 Patient Street"
} | ConvertTo-Json

$patientResp = Test-Endpoint "Create Patient" "POST" "$BASE/patients" $patientBody $recHeader
if ($patientResp.id) {
    $PATIENT_ID = $patientResp.id
    Write-Host "   Created patient ID: $PATIENT_ID" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# Test 10: Create Appointment
$tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
$apptBody = @{
    patient_id = $PATIENT_ID
    doctor_id = $DOCTOR_ID
    start_time = "${tomorrow}T10:00:00Z"
    end_time = "${tomorrow}T10:30:00Z"
    notes = "Test appointment"
} | ConvertTo-Json

$apptResp = Test-Endpoint "Create Appointment" "POST" "$BASE/appointments" $apptBody $recHeader
if ($apptResp.id) {
    $APPT_ID = $apptResp.id
    Write-Host "   Created appointment ID: $APPT_ID" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# Test 11: Duplicate Appointment (overlap test)
$apptDupResp = Test-Endpoint "Duplicate Appointment (expect 409)" "POST" "$BASE/appointments" $apptBody $recHeader $null 409
if ($apptDupResp) {
    Write-Host "   Got conflict error as expected" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# ==================== 6. SERVICES & VISITS ====================
Write-Host "`n--- 6. SERVICES & VISITS ---" -ForegroundColor Yellow

# Create a service first
$serviceBody = @{
    name = "Test Consultation"
    price = 100000
    description = "Basic consultation"
} | ConvertTo-Json

$serviceResp = Test-Endpoint "Create Service" "POST" "$BASE/boss/services" $serviceBody $bossHeader
if ($serviceResp.id) {
    $SERVICE_ID = $serviceResp.id
    Write-Host "   Created service ID: $SERVICE_ID" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# Login as doctor
$docLoginBody = @{
    email = "doctor_test@clinic.com"
    password = "Doctor123!"
} | ConvertTo-Json

$docLoginResp = Test-Endpoint "Login Doctor" "POST" "$BASE/auth/login" $docLoginBody
if ($docLoginResp.access_token) {
    $DOCTOR_TOKEN = $docLoginResp.access_token
    $passed++
} else {
    $failed++
}

$docHeader = @{ Authorization = "Bearer $DOCTOR_TOKEN" }

# Test 12: Start Visit
$visitBody = @{
    appointment_id = $APPT_ID
} | ConvertTo-Json

$visitResp = Test-Endpoint "Start Visit" "POST" "$BASE/doctor/visits" $visitBody $docHeader
if ($visitResp.id) {
    $VISIT_ID = $visitResp.id
    Write-Host "   Started visit ID: $VISIT_ID" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# Test 13: Complete Visit
$completeBody = @{
    diagnosis = "Common cold"
    notes = "Rest and fluids"
    service_ids = @($SERVICE_ID)
} | ConvertTo-Json

$completeResp = Test-Endpoint "Complete Visit" "PUT" "$BASE/doctor/visits/$VISIT_ID/complete" $completeBody $docHeader
if ($completeResp.total_amount -ge 0) {
    Write-Host "   Visit total: $($completeResp.total_amount), doctor_share: $($completeResp.doctor_share)" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# ==================== 7. FINANCIAL OPERATIONS ====================
Write-Host "`n--- 7. FINANCIAL OPERATIONS ---" -ForegroundColor Yellow

# Test 14: Create Expense
$expenseBody = @{
    description = "Test supplies"
    amount = 50000
    category = "supplies"
    date = (Get-Date).ToString("yyyy-MM-dd")
} | ConvertTo-Json

$expenseResp = Test-Endpoint "Create Expense" "POST" "$BASE/boss/expenses" $expenseBody $bossHeader
if ($expenseResp.id) {
    Write-Host "   Created expense ID: $($expenseResp.id)" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# Test 15: Create Salary
$salaryBody = @{
    user_id = $RECEPTION_ID
    amount = 5000000
    month = [int](Get-Date).Month
    year = [int](Get-Date).Year
} | ConvertTo-Json

$salaryResp = Test-Endpoint "Create Salary" "POST" "$BASE/boss/salaries" $salaryBody $bossHeader
if ($salaryResp.id) {
    Write-Host "   Created salary ID: $($salaryResp.id)" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# Test 16: Get Monthly Report
$month = (Get-Date).Month
$year = (Get-Date).Year
$reportResp = Test-Endpoint "Get Monthly Report" "GET" "$BASE/boss/reports/monthly?year=$year&month=$month" $null $bossHeader
if ($reportResp) {
    Write-Host "   Report: gross_revenue=$($reportResp.gross_revenue)" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# ==================== 8. AUDIT LOGS ====================
Write-Host "`n--- 8. AUDIT LOGS ---" -ForegroundColor Yellow

$auditResp = Test-Endpoint "Get Audit Logs" "GET" "$BASE/boss/audit-logs?page=1&page_size=10" $null $bossHeader
if ($auditResp -ne $null) {
    Write-Host "   Retrieved audit logs" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# ==================== 9. TENANT ISOLATION TEST ====================
Write-Host "`n--- 9. TENANT ISOLATION ---" -ForegroundColor Yellow

# Boss trying to access superadmin routes
$tenantTestResp = Test-Endpoint "Boss cannot access /admin/* (expect 403)" "GET" "$BASE/admin/clinics" $null $bossHeader 403
if ($tenantTestResp) {
    Write-Host "   Correctly blocked from admin routes" -ForegroundColor DarkGray
    $passed++
} else {
    $failed++
}

# ==================== SUMMARY ====================
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "SMOKE TEST RESULTS" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "SOME TESTS FAILED - Review output above" -ForegroundColor Red
}
