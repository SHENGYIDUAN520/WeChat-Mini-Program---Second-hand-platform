@echo off
echo 正在临时更改PowerShell执行策略...

powershell -Command "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass"

echo 执行策略已更改，现在可以运行install-cloud-deps.bat了
echo 请关闭此窗口后，再运行install-cloud-deps.bat

pause 