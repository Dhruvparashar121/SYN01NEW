ANONYMITY FRAMEWORK LAB - LIVE GUACAMOLE EDITION
=================================================

Purpose
-------
This project is for an authorised closed lab/cyber-range only. It provides:

1. Training Module
   - Concept and importance cards.
   - Animated anonymity-framework flow.
   - Detailed Setup on the left and Configuration Files on the right.

2. Configuration Module
   - Metasploit-style step menu.
   - Each step includes explanation, copy-and-run commands, and expected Kali terminal output.
   - Output simulation is safe and does not execute configuration commands.

3. Testing Module
   - Only the Live Fire module is kept.
   - Left side: real local Kali/Linux shell from the host that runs this website.
   - Right side: Apache Guacamole frame for the Ubuntu observation machine on the same network.
   - Ubuntu/Wireshark packets can be viewed live while Kali commands run on the left.

Important Security Warning
--------------------------
The Live Fire terminal exposes a shell from the machine running `npm start`.
Anyone who can reach this website can potentially type commands on that host.
Use this only in a trusted lab VLAN or closed network. Add firewall rules, VPN access, reverse-proxy authentication, or both before allowing other users to connect.

=================================================
A. RUN THE WEBSITE ON KALI / UBUNTU WEB MACHINE
=================================================

1. Extract the zip:

   unzip anonymity-framework-lab-live-guacamole-edition.zip
   cd anonymity-framework-lab-v3

2. Install Node.js and npm if needed:

   sudo apt update
   sudo apt install -y nodejs npm build-essential python3 make g++

3. Install project dependencies:

   npm install

4. Start the website:

   npm start

5. Open from browser:

   http://localhost:3000

   Or from another machine on the same network:

   http://<KALI_OR_WEB_MACHINE_IP>:3000

=================================================
B. SET UP APACHE GUACAMOLE SERVER
=================================================

Recommended placement:

Browser  --->  Anonymity Framework Website  --->  Apache Guacamole  --->  Ubuntu Observation Machine
             http://web-vm:3000                 http://guac-vm:8080/guacamole       RDP/VNC

Option 1: Use the included Docker Compose files
-----------------------------------------------
Run this on the Guacamole/Web Gateway Ubuntu VM:

   cd guacamole
   nano .env.example

Change the database password, then run:

   ./prepare-guacamole.sh

This generates `initdb.sql` using the official Guacamole Docker image and starts:

   - guacamole/guacd:1.6.0
   - guacamole/guacamole:1.6.0
   - postgres:16

Open:

   http://<GUACAMOLE_SERVER_IP>:8080/guacamole

Default first login:

   Username: guacadmin
   Password: guacadmin

Change this password immediately from Guacamole Settings.

Option 2: Existing Guacamole Server
-----------------------------------
You can also use an existing Guacamole server. In the Testing Module form, enter:

   Guacamole URL:       http://<GUACAMOLE_SERVER_IP>:8080/guacamole
   Guacamole Admin:     guacadmin or another user with permission to create connections
   Guacamole Password:  that user's password
   Protocol:            RDP or VNC
   Ubuntu IP:           target Ubuntu machine IP
   Port:                3389 for RDP, 5900 for VNC
   Ubuntu Username:     observation Ubuntu username
   Ubuntu Password:     observation Ubuntu/VNC password

The website calls the Guacamole API from server.js, creates a connection, and opens that connection in the right-side frame.

=================================================
C. PREPARE THE UBUNTU OBSERVATION MACHINE FOR RDP
=================================================

Use this when Protocol = RDP in the Testing Module.

On the Ubuntu machine whose screen must be viewed:

   sudo apt update
   sudo apt install -y xrdp xfce4 xfce4-goodies wireshark tshark
   echo "startxfce4" > ~/.xsession
   sudo adduser xrdp ssl-cert
   sudo systemctl enable --now xrdp
   sudo systemctl restart xrdp

Allow only the Guacamole server to reach RDP:

   sudo ufw allow from <GUACAMOLE_SERVER_IP> to any port 3389 proto tcp
   sudo ufw enable

Give the observation user Wireshark permissions:

   sudo dpkg-reconfigure wireshark-common
   sudo usermod -aG wireshark $USER

Log out and log back in, or reboot:

   sudo reboot

Check RDP service:

   sudo systemctl status xrdp
   ss -tlnp | grep 3389

=================================================
D. PREPARE THE UBUNTU OBSERVATION MACHINE FOR VNC
=================================================

Use this only if you choose Protocol = VNC.

On Ubuntu target:

   sudo apt update
   sudo apt install -y x11vnc wireshark tshark
   x11vnc -storepasswd
   x11vnc -usepw -forever -shared -rfbport 5900

Firewall rule:

   sudo ufw allow from <GUACAMOLE_SERVER_IP> to any port 5900 proto tcp

In the website Testing Module:

   Protocol: VNC
   Port: 5900
   Username: usually blank for x11vnc
   Password: the VNC password set by x11vnc -storepasswd

=================================================
E. LIVE TESTING WORKFLOW
=================================================

1. Start the website:

   npm start

2. Open Testing Module.

3. On the right side, fill Guacamole and Ubuntu target details.

4. Click "Connect Ubuntu Screen".

5. When the Ubuntu desktop appears, open Wireshark on the required interface.

6. On the left Kali terminal, run the guided commands, for example:

   ip a
   sudo wg show
   sudo wg-quick up wg2
   ip addr show wg2
   ping -c 4 8.8.8.8
   traceroute -n 8.8.8.8
   nc -vz 10.0.40.100 22
   sudo wg show wg2

7. Watch the packet evidence in real time on the Ubuntu/Wireshark screen.

=================================================
F. TROUBLESHOOTING
=================================================

1. Guacamole frame stays blank
   - Open Guacamole URL directly in a new tab.
   - Confirm Guacamole is reachable from the website host.
   - Check whether browser blocks mixed content. Use HTTP with HTTP or HTTPS with HTTPS.
   - Some reverse proxies may block iframe embedding. Adjust proxy headers or use "Open Guacamole Home".

2. Cannot create Guacamole connection
   - Confirm Guacamole admin username/password.
   - Confirm the admin user can create connections.
   - Confirm the URL ends with /guacamole, e.g. http://192.168.1.50:8080/guacamole.

3. RDP fails
   - On Ubuntu target: sudo systemctl status xrdp
   - On Guacamole server: nc -vz <UBUNTU_IP> 3389
   - Check firewall: sudo ufw status verbose

4. VNC fails
   - Confirm x11vnc is running.
   - On Guacamole server: nc -vz <UBUNTU_IP> 5900
   - Confirm VNC password.

5. Kali terminal not interactive
   - Run npm install again.
   - node-pty may require build tools:

     sudo apt install -y build-essential python3 make g++
     npm install

6. Website reachable by other users
   - This is dangerous for live fire mode.
   - Restrict access:

     sudo ufw allow from <YOUR_ADMIN_IP> to any port 3000 proto tcp
     sudo ufw deny 3000/tcp

=================================================
G. FILES ADDED / CHANGED
=================================================

index.html
  - New professional dashboard with top landscape navigation.

css/styles.css
  - New dashboard graphics, responsive layout, lab cards, terminal and Guacamole UI.

js/app.js
  - Metasploit-style configuration module.
  - Live terminal guide.
  - Guacamole connection form and frame handling.

server.js
  - Existing local shell bridge retained.
  - New /api/guac/connect endpoint added for Guacamole API connection creation.

guacamole/docker-compose.guacamole.yml
  - Guacamole + guacd + PostgreSQL deployment.

guacamole/prepare-guacamole.sh
  - Generates PostgreSQL schema and starts Guacamole stack.

README_GUACAMOLE_LIVE_SCREEN.txt
  - Focused short command sheet for setting up the live screen.

LATEST UI AMENDMENTS
====================
1. Training module images have been enlarged to full-width learning visuals inside each card.
2. Training/configuration explanations now use bold key terms and bullet-style learning points for easier exam/lab understanding.
3. Testing module now places the Kali terminal and Ubuntu Guacamole screen exactly side-by-side.
4. Command hints and the Guacamole IP/username/password input form have been moved below the two screens for cleaner live-fire visibility.
