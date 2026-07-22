$envFile='C:\Documents2\global.env'
Get-Content $envFile | ForEach-Object {if($_ -match '^\s*([^#=]+)=(.*)$'){[Environment]::SetEnvironmentVariable($matches[1].Trim(),$matches[2].Trim(),'Process')}}
# Relaunching the desktop shortcut safely replaces an older local dashboard.
$old=Get-NetTCPConnection -LocalPort 3410 -State Listen -ErrorAction SilentlyContinue
if($old){Stop-Process -Id $old.OwningProcess -Force}
Start-Process 'http://localhost:3410'
node "$PSScriptRoot\server.mjs"
