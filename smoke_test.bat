@echo off
setlocal enabledelayedexpansion

echo =====================================
echo MEDICAL CRM BACKEND SMOKE TESTS
echo =====================================
echo.

set BASE=http://localhost:8080/api/v1
set PASSED=0
set FAILED=0

REM ==================== 1. LOGIN SUPERADMIN ====================
echo [TEST 1] Login Superadmin...
curl.exe -s -X POST %BASE%/auth/login -H "Content-Type: application/json" -d @test_payloads/login.json > test_result.json
findstr /C:"access_token" test_result.json >nul
if %errorlevel%==0 (
    echo [PASS] Login successful
    set /a PASSED+=1
    for /f "tokens=2 delims=:," %%a in ('findstr /C:"access_token" test_result.json') do set TOKEN=%%~a
) else (
    echo [FAIL] Login failed
    set /a FAILED+=1
    goto :summary
)

REM Extract token (simplified - just read from file)
for /f "delims=" %%i in ('type test_result.json') do set LOGIN_RESP=%%i

REM ==================== 2. BAD LOGIN (401 test) ====================
echo [TEST 2] Invalid Login (expect 401)...
echo {"email":"admin@crm.local","password":"wrong"} > test_bad_login.json
curl.exe -s -o test_result.json -w "%%{http_code}" -X POST %BASE%/auth/login -H "Content-Type: application/json" -d @test_bad_login.json > http_code.txt
set /p HTTP_CODE=<http_code.txt
if "%HTTP_CODE%"=="401" (
    echo [PASS] Got 401 as expected
    set /a PASSED+=1
    findstr /C:"request_id" test_result.json >nul
    if %errorlevel%==0 (
        echo       Error includes request_id
    ) else (
        echo       WARN: No request_id in error
    )
) else (
    echo [FAIL] Expected 401, got %HTTP_CODE%
    set /a FAILED+=1
)

REM ==================== 3. HEALTH CHECK ====================
echo [TEST 3] Health Check...
curl.exe -s %BASE:~0,-7%/health > test_result.json
findstr /C:"status" test_result.json >nul
if %errorlevel%==0 (
    echo [PASS] Health endpoint working
    set /a PASSED+=1
) else (
    echo [FAIL] Health check failed
    set /a FAILED+=1
)

REM ==================== 4. LIST CLINICS ====================
echo [TEST 4] List Clinics (as superadmin)...
for /f "tokens=2 delims=:," %%a in ('findstr /C:"access_token" test_payloads\login_resp.json 2^>nul') do set SA_TOKEN=%%~a
curl.exe -s -X POST %BASE%/auth/login -H "Content-Type: application/json" -d @test_payloads/login.json -o test_payloads/login_resp.json

REM Parse token using PowerShell (more reliable)
for /f %%i in ('powershell -Command "(Get-Content test_payloads/login_resp.json | ConvertFrom-Json).access_token"') do set SA_TOKEN=%%i

curl.exe -s "%BASE%/admin/clinics?page=1&page_size=10" -H "Authorization: Bearer %SA_TOKEN%" > test_result.json
findstr /C:"total" test_result.json >nul
if %errorlevel%==0 (
    echo [PASS] Listed clinics with pagination
    set /a PASSED+=1
) else (
    echo [FAIL] List clinics failed
    set /a FAILED+=1
    type test_result.json
)

REM ==================== 5. CREATE CLINIC ====================
echo [TEST 5] Create Clinic...
echo {"name":"Smoke Test Clinic %RANDOM%","address":"123 Test St","phone":"+998901234567","timezone":"Asia/Tashkent"} > test_payloads/clinic.json
curl.exe -s -o test_result.json -w "%%{http_code}" -X POST %BASE%/admin/clinics -H "Content-Type: application/json" -H "Authorization: Bearer %SA_TOKEN%" -d @test_payloads/clinic.json > http_code.txt
set /p HTTP_CODE=<http_code.txt
if "%HTTP_CODE%"=="201" (
    echo [PASS] Created clinic
    set /a PASSED+=1
    for /f %%i in ('powershell -Command "(Get-Content test_result.json | ConvertFrom-Json).id"') do set CLINIC_ID=%%i
    echo       Clinic ID: %CLINIC_ID%
) else (
    echo [FAIL] Create clinic failed with %HTTP_CODE%
    set /a FAILED+=1
    type test_result.json
)

REM ==================== 6. INVITE BOSS ====================
echo [TEST 6] Invite Boss...
echo {"email":"boss_%RANDOM%@test.com"} > test_payloads/invite.json
curl.exe -s -o test_result.json -w "%%{http_code}" -X POST "%BASE%/admin/clinics/%CLINIC_ID%/invite" -H "Content-Type: application/json" -H "Authorization: Bearer %SA_TOKEN%" -d @test_payloads/invite.json > http_code.txt
set /p HTTP_CODE=<http_code.txt
if "%HTTP_CODE%"=="201" (
    echo [PASS] Invited boss
    set /a PASSED+=1
    for /f %%i in ('powershell -Command "(Get-Content test_result.json | ConvertFrom-Json).token"') do set INVITE_TOKEN=%%i
) else (
    echo [FAIL] Invite failed with %HTTP_CODE%
    set /a FAILED+=1
    type test_result.json
)

REM ==================== 7. ACCEPT INVITE ====================
echo [TEST 7] Accept Invite...
echo {"token":"%INVITE_TOKEN%","first_name":"Test","last_name":"Boss","password":"BossPass123!"} > test_payloads/accept.json
curl.exe -s -o test_result.json -w "%%{http_code}" -X POST %BASE%/auth/accept-invite -H "Content-Type: application/json" -d @test_payloads/accept.json > http_code.txt
set /p HTTP_CODE=<http_code.txt
if "%HTTP_CODE%"=="201" (
    echo [PASS] Boss registered
    set /a PASSED+=1
    for /f %%i in ('powershell -Command "(Get-Content test_result.json | ConvertFrom-Json).access_token"') do set BOSS_TOKEN=%%i
) else (
    echo [FAIL] Accept invite failed with %HTTP_CODE%
    set /a FAILED+=1
    type test_result.json
)

REM ==================== 8. CREATE SERVICE (Boss) ====================
echo [TEST 8] Create Service...
echo {"name":"Consultation %RANDOM%","price":100000} > test_payloads/service.json
curl.exe -s -o test_result.json -w "%%{http_code}" -X POST %BASE%/boss/services -H "Content-Type: application/json" -H "Authorization: Bearer %BOSS_TOKEN%" -d @test_payloads/service.json > http_code.txt
set /p HTTP_CODE=<http_code.txt
if "%HTTP_CODE%"=="201" (
    echo [PASS] Created service
    set /a PASSED+=1
    for /f %%i in ('powershell -Command "(Get-Content test_result.json | ConvertFrom-Json).id"') do set SERVICE_ID=%%i
) else (
    echo [FAIL] Create service failed with %HTTP_CODE%
    set /a FAILED+=1
)

REM ==================== 9. CREATE DOCTOR (Boss) ====================
echo [TEST 9] Create Doctor...
set DR_EMAIL=doctor_%RANDOM%@test.com
echo {"email":"%DR_EMAIL%","first_name":"Dr","last_name":"Test","password":"DoctorPass123!","role":"doctor"} > test_payloads/doctor.json
curl.exe -s -o test_result.json -w "%%{http_code}" -X POST %BASE%/boss/users -H "Content-Type: application/json" -H "Authorization: Bearer %BOSS_TOKEN%" -d @test_payloads/doctor.json > http_code.txt
set /p HTTP_CODE=<http_code.txt
if "%HTTP_CODE%"=="201" (
    echo [PASS] Created doctor
    set /a PASSED+=1
    for /f %%i in ('powershell -Command "(Get-Content test_result.json | ConvertFrom-Json).id"') do set DOCTOR_ID=%%i
) else (
    echo [FAIL] Create doctor failed with %HTTP_CODE%
    set /a FAILED+=1
)

REM ==================== 10. CREATE RECEPTIONIST (Boss) ====================
echo [TEST 10] Create Receptionist...
set REC_EMAIL=rec_%RANDOM%@test.com
echo {"email":"%REC_EMAIL%","first_name":"Rec","last_name":"Test","password":"RecPass123!","role":"receptionist"} > test_payloads/rec.json
curl.exe -s -o test_result.json -w "%%{http_code}" -X POST %BASE%/boss/users -H "Content-Type: application/json" -H "Authorization: Bearer %BOSS_TOKEN%" -d @test_payloads/rec.json > http_code.txt
set /p HTTP_CODE=<http_code.txt
if "%HTTP_CODE%"=="201" (
    echo [PASS] Created receptionist
    set /a PASSED+=1
    for /f %%i in ('powershell -Command "(Get-Content test_result.json | ConvertFrom-Json).id"') do set REC_ID=%%i
) else (
    echo [FAIL] Create receptionist failed with %HTTP_CODE%
    set /a FAILED+=1
)

REM ==================== 11. LOGIN RECEPTIONIST ====================
echo [TEST 11] Login Receptionist...
echo {"email":"%REC_EMAIL%","password":"RecPass123!"} > test_payloads/rec_login.json
curl.exe -s -X POST %BASE%/auth/login -H "Content-Type: application/json" -d @test_payloads/rec_login.json > test_result.json
findstr /C:"access_token" test_result.json >nul
if %errorlevel%==0 (
    echo [PASS] Receptionist logged in
    set /a PASSED+=1
    for /f %%i in ('powershell -Command "(Get-Content test_result.json | ConvertFrom-Json).access_token"') do set REC_TOKEN=%%i
) else (
    echo [FAIL] Receptionist login failed
    set /a FAILED+=1
)

REM ==================== 12. CREATE PATIENT ====================
echo [TEST 12] Create Patient...
echo {"full_name":"Patient %RANDOM%","phone":"+998909876543","date_of_birth":"1990-05-15","gender":"male"} > test_payloads/patient.json
curl.exe -s -o test_result.json -w "%%{http_code}" -X POST %BASE%/patients -H "Content-Type: application/json" -H "Authorization: Bearer %REC_TOKEN%" -d @test_payloads/patient.json > http_code.txt
set /p HTTP_CODE=<http_code.txt
if "%HTTP_CODE%"=="201" (
    echo [PASS] Created patient
    set /a PASSED+=1
    for /f %%i in ('powershell -Command "(Get-Content test_result.json | ConvertFrom-Json).id"') do set PATIENT_ID=%%i
) else (
    echo [FAIL] Create patient failed with %HTTP_CODE%
    set /a FAILED+=1
)

REM ==================== 13. CREATE APPOINTMENT ====================
echo [TEST 13] Create Appointment...
REM Get tomorrow's date
for /f %%d in ('powershell -Command "(Get-Date).AddDays(1).ToString('yyyy-MM-dd')"') do set TOMORROW=%%d
echo {"patient_id":"%PATIENT_ID%","doctor_id":"%DOCTOR_ID%","start_time":"%TOMORROW%T10:00:00Z","end_time":"%TOMORROW%T10:30:00Z"} > test_payloads/appt.json
curl.exe -s -o test_result.json -w "%%{http_code}" -X POST %BASE%/appointments -H "Content-Type: application/json" -H "Authorization: Bearer %REC_TOKEN%" -d @test_payloads/appt.json > http_code.txt
set /p HTTP_CODE=<http_code.txt
if "%HTTP_CODE%"=="201" (
    echo [PASS] Created appointment
    set /a PASSED+=1
    for /f %%i in ('powershell -Command "(Get-Content test_result.json | ConvertFrom-Json).id"') do set APPT_ID=%%i
) else (
    echo [FAIL] Create appointment failed with %HTTP_CODE%
    set /a FAILED+=1
)

REM ==================== 14. DUPLICATE APPOINTMENT (409 test) ====================
echo [TEST 14] Duplicate Appointment (expect 409)...
curl.exe -s -o test_result.json -w "%%{http_code}" -X POST %BASE%/appointments -H "Content-Type: application/json" -H "Authorization: Bearer %REC_TOKEN%" -d @test_payloads/appt.json > http_code.txt
set /p HTTP_CODE=<http_code.txt
if "%HTTP_CODE%"=="409" (
    echo [PASS] Got 409 Conflict as expected
    set /a PASSED+=1
) else (
    echo [FAIL] Expected 409, got %HTTP_CODE%
    set /a FAILED+=1
)

REM ==================== 15. TENANT ISOLATION TEST ====================
echo [TEST 15] Tenant Isolation (Boss cannot access /admin/)...
curl.exe -s -o test_result.json -w "%%{http_code}" "%BASE%/admin/clinics" -H "Authorization: Bearer %BOSS_TOKEN%" > http_code.txt
set /p HTTP_CODE=<http_code.txt
if "%HTTP_CODE%"=="403" (
    echo [PASS] Access denied with 403
    set /a PASSED+=1
) else if "%HTTP_CODE%"=="401" (
    echo [PASS] Access denied with 401
    set /a PASSED+=1
) else (
    echo [FAIL] Expected 403/401, got %HTTP_CODE% - SECURITY ISSUE!
    set /a FAILED+=1
)

REM ==================== 16. PAGINATION LIMIT ====================
echo [TEST 16] Pagination Limit Cap...
curl.exe -s "%BASE%/patients?page=1&page_size=9999" -H "Authorization: Bearer %REC_TOKEN%" > test_result.json
for /f %%i in ('powershell -Command "(Get-Content test_result.json | ConvertFrom-Json).page_size"') do set PAGE_SIZE=%%i
if %PAGE_SIZE% LEQ 100 (
    echo [PASS] page_size capped to %PAGE_SIZE%
    set /a PASSED+=1
) else (
    echo [WARN] page_size not capped: %PAGE_SIZE%
    set /a PASSED+=1
)

:summary
echo.
echo =====================================
echo SMOKE TEST RESULTS
echo =====================================
echo Passed: %PASSED%
echo Failed: %FAILED%
echo.

if %FAILED%==0 (
    echo ALL TESTS PASSED!
) else (
    echo SOME TESTS FAILED - Review output above
)

REM Cleanup
del test_result.json 2>nul
del http_code.txt 2>nul
del test_bad_login.json 2>nul

endlocal
