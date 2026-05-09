Anonymity Framework Lab - Professional UI Prototype

How to run with the Live Fire local Kali terminal:
1. Extract the ZIP file on Kali.
2. Open a terminal in this folder:
   cd anonymity-framework-lab
3. Install dependencies once:
   npm install
4. Start the hosted website + local terminal bridge:
   npm start
5. Open the shown URL, for example:
   http://localhost:3000
   or from another system on the same trusted lab network:
   http://KALI-IP:3000

Included:
- Training Module with detailed learning content
- Animated packet-flow diagram
- Configuration Module with guided hints and editable configs
- Testing Module with simple Kali command / Wireshark capture console
- Live Fire Module with an embedded local Kali terminal connected to the hosting machine

Latest Live Fire amendment:
- Removed SSH target IP / username / password / port panel.
- Removed Live Fire step execution buttons.
- Added a real local Kali shell terminal in the browser through Node.js + Socket.IO + xterm.js.
- Added a step-by-step hint panel that updates as expected commands are typed in the terminal.
- Terminal starts in the same folder from which the website is hosted.

Important security note:
The Live Fire terminal executes commands on the Kali machine running npm start. If you host this on the network, any user who can open the page can type shell commands. Use only on a trusted closed lab network.

Normal static mode:
You can still open index.html directly for viewing the training/configuration/testing simulation, but the Live Fire real terminal requires npm start.
