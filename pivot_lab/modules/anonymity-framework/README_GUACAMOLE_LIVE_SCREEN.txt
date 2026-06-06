QUICK COMMAND SHEET - UBUNTU LIVE SCREEN THROUGH APACHE GUACAMOLE
================================================================

1. Guacamole gateway VM
----------------------

sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker

cd anonymity-framework-lab-v3/guacamole
cp .env.example .env
nano .env                      # change POSTGRES_PASSWORD
./prepare-guacamole.sh

Open:

http://<GUACAMOLE_SERVER_IP>:8080/guacamole

First login:

guacadmin / guacadmin

Change password immediately.

2. Ubuntu observation machine using RDP
---------------------------------------

sudo apt update
sudo apt install -y xrdp xfce4 xfce4-goodies wireshark tshark
printf 'startxfce4\n' > ~/.xsession
sudo adduser xrdp ssl-cert
sudo systemctl enable --now xrdp
sudo systemctl restart xrdp
sudo dpkg-reconfigure wireshark-common
sudo usermod -aG wireshark $USER
sudo ufw allow from <GUACAMOLE_SERVER_IP> to any port 3389 proto tcp
sudo ufw enable
sudo reboot

Check after reboot:

systemctl status xrdp
ss -tlnp | grep 3389

3. Optional Ubuntu observation machine using VNC
------------------------------------------------

sudo apt update
sudo apt install -y x11vnc wireshark tshark
x11vnc -storepasswd
x11vnc -usepw -forever -shared -rfbport 5900
sudo ufw allow from <GUACAMOLE_SERVER_IP> to any port 5900 proto tcp

4. Run Anonymity Framework website
----------------------------------

cd anonymity-framework-lab-v3
sudo apt update
sudo apt install -y nodejs npm build-essential python3 make g++
npm install
npm start

Open:

http://<WEBSITE_MACHINE_IP>:3000

5. Testing Module form values
-----------------------------

Guacamole URL:       http://<GUACAMOLE_SERVER_IP>:8080/guacamole
Guacamole Admin:     guacadmin
Guacamole Password:  <changed guacadmin password>
Protocol:            RDP
Ubuntu IP:           <UBUNTU_OBSERVATION_IP>
Port:                3389
Ubuntu Username:     <ubuntu username>
Ubuntu Password:     <ubuntu password>

Click:

Connect Ubuntu Screen

Then open Wireshark inside the Ubuntu screen and run Kali commands on the left terminal.
