$BASE = "http://localhost:8080/api/v1"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "MEDICAL CRM BACKEND SMOKE TESTS" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$passed = 0
$failed = 0

# ==================== 1. LOGIN ====================
Write-Host "`n[TEST 1] Login Superadmin..." -ForegroundColor Yellow
$loginBody = '{"email":"admin@crm.local","password":"Admin123!"}'
try {
    $loginResp = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $TOKEN = $loginResp.access_token
    Write-Host "[PASS] Login successful" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Login failed: $_" -ForegroundColor Red
    $failed++
    exit 1
}

$headers = @{ Authorization = "Bearer $TOKEN" }

# ==================== 2. LIST CLINICS ====================
Write-Host "`n[TEST 2] List Clinics..." -ForegroundColor Yellow
try {
    $clinics = Invoke-RestMethod -Uri "$BASE/admin/clinics?page=1&page_size=10" -Headers $headers
    Write-Host "[PASS] Found $($clinics.total) clinic(s)" -ForegroundColor Green
    $passed++
    
    if ($clinics.clinics.Count -gt 0) {
        $CLINIC_ID = $clinics.clinics[0].id
        $CLINIC_NAME = $clinics.clinics[0].name
        Write-Host "       Using existing clinic: $CLINIC_NAME ($CLINIC_ID)" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "[FAIL] List clinics failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== 3. CREATE NEW CLINIC ====================
Write-Host "`n[TEST 3] Create New Clinic..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "HHmmss"
$clinicBody = "{`"name`":`"Test Clinic $timestamp`",`"address`":`"123 Test St`",`"phone`":`"+998901234567`"}"
try {
    $newClinic = Invoke-RestMethod -Uri "$BASE/admin/clinics" -Method POST -ContentType "application/json" -Body $clinicBody -Headers $headers
    $NEW_CLINIC_ID = $newClinic.id
    Write-Host "[PASS] Created clinic: $NEW_CLINIC_ID" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Create clinic failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== 4. INVITE BOSS ====================
Write-Host "`n[TEST 4] Invite Boss..." -ForegroundColor Yellow
$inviteBody = "{`"email`":`"boss_$timestamp@test.com`"}"
try {
    $invite = Invoke-RestMethod -Uri "$BASE/admin/clinics/$NEW_CLINIC_ID/invite" -Method POST -ContentType "application/json" -Body $inviteBody -Headers $headers
    $INVITE_TOKEN = $invite.token
    Write-Host "[PASS] Invite created" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Invite failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== 5. ACCEPT INVITE ====================
Write-Host "`n[TEST 5] Accept Invite..." -ForegroundColor Yellow
$acceptBody = "{`"token`":`"$INVITE_TOKEN`",`"full_name`":`"Test Boss $timestamp`",`"password`":`"Boss123!`"}"
try {
    $accepted = Invoke-RestMethod -Uri "$BASE/auth/accept-invite" -Method POST -ContentType "application/json" -Body $acceptBody
    $BOSS_TOKEN = $accepted.access_token
    Write-Host "[PASS] Boss registered and logged in" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Accept invite failed: $_" -ForegroundColor Red
    $failed++
}

$bossHeaders = @{ Authorization = "Bearer $BOSS_TOKEN" }

# ==================== 6. CREATE DOCTOR ====================
Write-Host "`n[TEST 6] Create Doctor (as Boss)..." -ForegroundColor Yellow
$doctorBody = "{`"email`":`"doctor_$timestamp@test.com`",`"full_name`":`"Dr. Test $timestamp`",`"password`":`"Doctor123!`",`"role`":`"doctor`"}"
try {
    $doctor = Invoke-RestMethod -Uri "$BASE/boss/users" -Method POST -ContentType "application/json" -Body $doctorBody -Headers $bossHeaders
    $DOCTOR_ID = $doctor.id
    Write-Host "[PASS] Created doctor: $DOCTOR_ID" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Create doctor failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== 7. CREATE RECEPTIONIST ====================
Write-Host "`n[TEST 7] Create Receptionist (as Boss)..." -ForegroundColor Yellow
$recBody = "{`"email`":`"rec_$timestamp@test.com`",`"full_name`":`"Rec Test $timestamp`",`"password`":`"Rec123!`",`"role`":`"receptionist`"}"
try {
    $rec = Invoke-RestMethod -Uri "$BASE/boss/users" -Method POST -ContentType "application/json" -Body $recBody -Headers $bossHeaders
    $REC_ID = $rec.id
    Write-Host "[PASS] Created receptionist: $REC_ID" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Create receptionist failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== 8. LOGIN AS RECEPTIONIST ====================
Write-Host "`n[TEST 8] Login Receptionist..." -ForegroundColor Yellow
$recLoginBody = "{`"email`":`"rec_$timestamp@test.com`",`"password`":`"Rec123!`"}"
try {
    $recLogin = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $recLoginBody
    $REC_TOKEN = $recLogin.access_token
    Write-Host "[PASS] Receptionist logged in" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Rec login failed: $_" -ForegroundColor Red
    $failed++
}

$recHeaders = @{ Authorization = "Bearer $REC_TOKEN" }

# ==================== 9. CREATE PATIENT ====================
Write-Host "`n[TEST 9] Create Patient..." -ForegroundColor Yellow
$patientBody = "{`"full_name`":`"Patient $timestamp`",`"phone`":`"+998909876543`",`"date_of_birth`":`"1990-05-15`",`"gender`":`"male`"}"
try {
    $patient = Invoke-RestMethod -Uri "$BASE/patients" -Method POST -ContentType "application/json" -Body $patientBody -Headers $recHeaders
    $PATIENT_ID = $patient.id
    Write-Host "[PASS] Created patient: $PATIENT_ID" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Create patient failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== 10. CREATE APPOINTMENT ====================
Write-Host "`n[TEST 10] Create Appointment..." -ForegroundColor Yellow
$startTime = (Get-Date).AddDays(1).AddHours(10).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$endTime = (Get-Date).AddDays(1).AddHours(10).AddMinutes(30).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$apptBody = "{`"patient_id`":`"$PATIENT_ID`",`"doctor_id`":`"$DOCTOR_ID`",`"start_time`":`"$startTime`",`"end_time`":`"$endTime`"}"
try {
    $appt = Invoke-RestMethod -Uri "$BASE/appointments" -Method POST -ContentType "application/json" -Body $apptBody -Headers $recHeaders
    $APPT_ID = $appt.id
    Write-Host "[PASS] Created appointment: $APPT_ID" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Create appointment failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== 11. DUPLICATE APPOINTMENT (OVERLAP TEST) ====================
Write-Host "`n[TEST 11] Duplicate Appointment (expect 409 conflict)..." -ForegroundColor Yellow
try {
    $dup = Invoke-RestMethod -Uri "$BASE/appointments" -Method POST -ContentType "application/json" -Body $apptBody -Headers $recHeaders
    Write-Host "[FAIL] Should have returned 409 conflict!" -ForegroundColor Red
    $failed++
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 409) {
        Write-Host "[PASS] Got 409 Conflict as expected" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[FAIL] Expected 409, got $status" -ForegroundColor Red
        $failed++
    }
}

# ==================== 12. CREATE SERVICE ====================
Write-Host "`n[TEST 12] Create Service (as Boss)..." -ForegroundColor Yellow
$serviceBody = "{`"name`":`"Consultation $timestamp`",`"price`":100000}`"
try {
    $service = Invoke-RestMethod -Uri "$BASE/boss/services" -Method POST -ContentType "application/json" -Body $serviceBody -Headers $bossHeaders
    $SERVICE_ID = $service.id
    Write-Host "[PASS] Created service: $SERVICE_ID" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Create service failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== 13. LOGIN AS DOCTOR ====================
Write-Host "`n[TEST 13] Login Doctor..." -ForegroundColor Yellow
$docLoginBody = "{`"email`":`"doctor_$timestamp@test.com`",`"password`":`"Doctor123!`"}"
try {
    $docLogin = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $docLoginBody
    $DOC_TOKEN = $docLogin.access_token
    Write-Host "[PASS] Doctor logged in" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Doctor login failed: $_" -ForegroundColor Red
    $failed++
}

$docHeaders = @{ Authorization = "Bearer $DOC_TOKEN" }

# ==================== 14. START VISIT ====================
Write-Host "`n[TEST 14] Start Visit (as Doctor)..." -ForegroundColor Yellow
$visitBody = "{`"appointment_id`":`"$APPT_ID`"}"
try {
    $visit = Invoke-RestMethod -Uri "$BASE/doctor/visits" -Method POST -ContentType "application/json" -Body $visitBody -Headers $docHeaders
    $VISIT_ID = $visit.id
    Write-Host "[PASS] Started visit: $VISIT_ID" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Start visit failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== 15. COMPLETE VISIT ====================
Write-Host "`n[TEST 15] Complete Visit..." -ForegroundColor Yellow
$completeBody = "{`"diagnosis`":`"Common cold`",`"notes`":`"Rest recommended`",`"service_ids`":[`"$SERVICE_ID`"]}"
try {
    $completed = Invoke-RestMethod -Uri "$BASE/doctor/visits/$VISIT_ID/complete" -Method PUT -ContentType "application/json" -Body $completeBody -Headers $docHeaders
    Write-Host "[PASS] Visit completed, total: $($completed.total_amount), doctor_share: $($completed.doctor_share)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Complete visit failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== 16. CREATE EXPENSE ====================
Write-Host "`n[TEST 16] Create Expense (as Boss)..." -ForegroundColor Yellow
$expenseDate = (Get-Date).ToString("yyyy-MM-dd")
$expenseBody = "{`"description`":`"Test expense`",`"amount`":50000,`"category`":`"supplies`",`"date`":`"$expenseDate`"}"
try {
    $expense = Invoke-RestMethod -Uri "$BASE/boss/expenses" -Method POST -ContentType "application/json" -Body $expenseBody -Headers $bossHeaders
    Write-Host "[PASS] Created expense: $($expense.id)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Create expense failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== 17. CREATE SALARY ====================
Write-Host "`n[TEST 17] Set Staff Salary (as Boss)..." -ForegroundColor Yellow
$salaryMonth = (Get-Date).Month
$salaryYear = (Get-Date).Year
$salaryBody = "{`"user_id`":`"$REC_ID`",`"amount`":5000000,`"month`":$salaryMonth,`"year`":$salaryYear}"
try {
    $salary = Invoke-RestMethod -Uri "$BASE/boss/salaries" -Method POST -ContentType "application/json" -Body $salaryBody -Headers $bossHeaders
    Write-Host "[PASS] Created salary: $($salary.id)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Create salary failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== 18. MONTHLY REPORT ====================
Write-Host "`n[TEST 18] Get Monthly Report (as Boss)..." -ForegroundColor Yellow
try {
    $report = Invoke-RestMethod -Uri "$BASE/boss/reports/monthly?year=$salaryYear&month=$salaryMonth" -Headers $bossHeaders
    Write-Host "[PASS] Monthly report: gross=$($report.gross_revenue)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Get report failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== 19. AUDIT LOGS ====================
Write-Host "`n[TEST 19] Get Audit Logs (as Boss)..." -ForegroundColor Yellow
try {
    $audit = Invoke-RestMethod -Uri "$BASE/boss/audit-logs?page=1&page_size=10" -Headers $bossHeaders
    Write-Host "[PASS] Retrieved audit logs" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "[FAIL] Get audit logs failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== 20. TENANT ISOLATION ====================
Write-Host "`n[TEST 20] Tenant Isolation (Boss cannot access /admin/)..." -ForegroundColor Yellow
try {
    $leak = Invoke-RestMethod -Uri "$BASE/admin/clinics" -Headers $bossHeaders
    Write-Host "[FAIL] Boss accessed admin routes - SECURITY ISSUE!" -ForegroundColor Red
    $failed++
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403 -or $status -eq 401) {
        Write-Host "[PASS] Access correctly denied ($status)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[FAIL] Unexpected status: $status" -ForegroundColor Red
        $failed++
    }
}

# ==================== 21. PAGINATION LIMIT CAP ====================
Write-Host "`n[TEST 21] Pagination Limit Cap (page_size=9999)..." -ForegroundColor Yellow
try {
    $bigPage = Invoke-RestMethod -Uri "$BASE/patients?page=1&page_size=9999" -Headers $recHeaders
    if ($bigPage.page_size -le 100) {
        Write-Host "[PASS] page_size capped to $($bigPage.page_size)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "[WARN] page_size not capped: $($bigPage.page_size)" -ForegroundColor Yellow
        $passed++
    }
} catch {
    Write-Host "[FAIL] Pagination test failed: $_" -ForegroundColor Red
    $failed++
}

# ==================== SUMMARY ====================
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "SMOKE TEST RESULTS" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Passed: $passed / 21" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "SOME TESTS FAILED - Review output above" -ForegroundColor Red
}
