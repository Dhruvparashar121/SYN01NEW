# enable_rdp_windows.ps1
# Purpose: Enable Windows RDP for Apache Guacamole access on the same LAN.
# Run this on the Windows machine you want to access through Guacamole.
# Must be run as Administrator.

param(
    [string]$AllowedSubnet = "",
    [string]$RdpUser = ""
)

Write-Host "=== Windows RDP Setup for Guacamole Lab ===" -ForegroundColor Cyan

# 1. Check Administrator rights
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "[ERROR] Run this script as Administrator." -ForegroundColor Red
    Write-Host "Right-click PowerShell -> Run as administrator, then run this script again."
    pause
    exit 1
}

# 2. Show Windows edition warning
$edition = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion").EditionID
Write-Host "[INFO] Windows Edition: $edition"
if ($edition -match "Core|Home") {
    Write-Host "[WARNING] Windows Home/Core editions usually cannot host built-in RDP sessions." -ForegroundColor Yellow
    Write-Host "Guacamole RDP normally needs Windows Pro, Enterprise, Education, or Server as the target."
}

# 3. Enable Remote Desktop by registry
Write-Host "[STEP] Enabling Remote Desktop..."
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server" `
    -Name "fDenyTSConnections" -Value 0

# 4. Enable RDP listener
Write-Host "[STEP] Enabling RDP listener..."
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" `
    -Name "fEnableWinStation" -Value 1

# 5. Require Network Level Authentication
Write-Host "[STEP] Enabling Network Level Authentication..."
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" `
    -Name "UserAuthentication" -Value 1

# 6. Enable Windows Firewall Remote Desktop group
Write-Host "[STEP] Enabling Windows Firewall Remote Desktop rules..."
Get-NetFirewallRule -DisplayGroup "Remote Desktop" -ErrorAction SilentlyContinue | Set-NetFirewallRule -Enabled True

# 7. Add explicit TCP 3389 firewall rule if not present
$ruleName = "Allow RDP TCP 3389 for Guacamole Lab"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if (-not $existingRule) {
    if ($AllowedSubnet -ne "") {
        Write-Host "[STEP] Creating restricted firewall rule for subnet/IP: $AllowedSubnet"
        New-NetFirewallRule -DisplayName $ruleName `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort 3389 `
            -RemoteAddress $AllowedSubnet `
            -Action Allow `
            -Profile Domain,Private
    } else {
        Write-Host "[STEP] Creating firewall rule for TCP 3389 on Domain/Private profiles..."
        New-NetFirewallRule -DisplayName $ruleName `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort 3389 `
            -Action Allow `
            -Profile Domain,Private
    }
} else {
    Write-Host "[INFO] Firewall rule already exists: $ruleName"
}

# 8. Optional: Add user to Remote Desktop Users group
if ($RdpUser -ne "") {
    Write-Host "[STEP] Adding user to Remote Desktop Users group: $RdpUser"
    try {
        Add-LocalGroupMember -Group "Remote Desktop Users" -Member $RdpUser -ErrorAction Stop
        Write-Host "[OK] User added to Remote Desktop Users group."
    } catch {
        Write-Host "[WARNING] Could not add user. It may already be a member or the username is incorrect." -ForegroundColor Yellow
        Write-Host $_.Exception.Message
    }
} else {
    Write-Host "[INFO] No RDP user supplied. Admin users can normally RDP by default."
}

# 9. Start/restart Remote Desktop Services
Write-Host "[STEP] Restarting Remote Desktop Services..."
try {
    Set-Service -Name TermService -StartupType Automatic
    Restart-Service -Name TermService -Force
} catch {
    Write-Host "[WARNING] Could not restart TermService automatically. A reboot may be required." -ForegroundColor Yellow
}

# 10. Show IP address
Write-Host "`n=== Network Details ===" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*"
    } |
    Select-Object InterfaceAlias, IPAddress, PrefixLength |
    Format-Table -AutoSize

# 11. Verify listener
Write-Host "`n=== RDP Listener Check ===" -ForegroundColor Cyan
cmd /c "qwinsta | findstr rdp-tcp"
cmd /c "netstat -ano | findstr :3389"

Write-Host "`n=== Guacamole Connection Values ===" -ForegroundColor Green
Write-Host "Protocol : RDP"
Write-Host "Hostname : Use the IPv4 address shown above"
Write-Host "Port     : 3389"
Write-Host "Security : NLA or Any"
Write-Host "Username : Your Windows username"
Write-Host "Password : Your Windows password"

Write-Host "`n[OK] RDP setup completed. If Guacamole still fails, reboot Windows once." -ForegroundColor Green
pause
