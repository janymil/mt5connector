@echo off
set Path=C:\Metatrader Account Statistic\node_portable\node-v20.18.0-win-x64;%Path%
cd /d "C:\Metatrader Account Statistic\server"
start "NodeServer" /MIN node.exe index.js
cd /d "C:\Metatrader Account Statistic"
start "CloudflaredTunnel" /MIN cloudflared.exe tunnel run
