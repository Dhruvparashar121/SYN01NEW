RDP Windows Setup for Apache Guacamole Lab

Use this on the Windows machine you want to access through Guacamole.

Recommended method:
1. Extract this ZIP on the Windows machine.
2. Right-click run_enable_rdp_as_admin.bat.
3. Choose "Run as administrator".
4. After completion, note the IPv4 address shown.
5. In Guacamole, add:
   Protocol: RDP
   Hostname: Windows IPv4 address
   Port: 3389
   Security: NLA or Any
   Username: Windows username
   Password: Windows password

PowerShell direct method:
1. Open PowerShell as Administrator.
2. cd to this folder.
3. Run:
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\enable_rdp_windows.ps1

Optional restricted subnet example:
.\enable_rdp_windows.ps1 -AllowedSubnet "192.168.3.0/24"

Optional user add example:
.\enable_rdp_windows.ps1 -RdpUser "YourUsername"

Git Bash / WSL method:
Run Git Bash as Administrator, then:
bash enable_rdp_windows.sh

Note:
Windows Home/Core editions usually cannot act as a built-in RDP host.
Use Windows Pro, Enterprise, Education, or Server for normal RDP hosting.
