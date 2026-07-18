@echo off
echo ========================================================
echo Para Wallet Setup
echo ========================================================
echo.
echo Step 1: Using your existing Para Org and Project...
echo Organization: hssn (1e38392c-c899-4d1d-8cbb-de6d4fbf0c0f)
echo Project: mneme (73541ca3-e9b7-449a-9739-224805566e57)
echo.
call npx @getpara/cli keys create -n monad-app-dev --display-name "Monad App (dev)" --org 1e38392c-c899-4d1d-8cbb-de6d4fbf0c0f --project 73541ca3-e9b7-449a-9739-224805566e57

echo.
echo ========================================================
echo SUCCESS!
echo ========================================================
echo Please COPY the Public Key from the output above.
echo Open the file apps\web\.env.local in your editor and paste it there!
echo.
pause
