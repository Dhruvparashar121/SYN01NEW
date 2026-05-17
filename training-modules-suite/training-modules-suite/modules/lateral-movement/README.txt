Lateral Movement Training Module - Refined VLAN Version
======================================================

This is a standalone training-only web module for the lateral movement lab.
Open index.html in Chrome, Edge, or Firefox.

This revision includes:
1. White Team (10.0.10.26) placed between Red Team and DMZ throughout the module.
2. VLAN labels shown consistently across content and diagrams:
   - Red Team: VLAN 30
   - White Team: VLAN 10
   - DMZ: VLAN 40
   - Blue Team: VLAN 20
3. Lab topology and packet-flow diagram placed at the beginning of the page.
4. Diagram layout refined to avoid text/boundary overlap and improve readability.
5. Topology packet-learning path moved into a separate clearly visible animated bar below the main diagram.
6. Packet-flow arrows corrected so that arrowheads sit directly on the packet path in both the main topology diagram and the five-stage visual.
7. Five-stage lateral movement walkthrough improved with cleaner animated packet flow, clearer zone headers, and separated telemetry chips.
8. Supporting learning diagrams and defender-view content retained and refined.

Scenario IP plan:
- Red Team / Attacker: 30.0.30.17, VLAN 30
- White Team / Control-Observer: 10.0.10.26, VLAN 10
- DMZ Host: 10.0.40.106, VLAN 40
- Blue Team Pivot: 10.0.20.112, VLAN 20
- Blue Team Webserver 1: 10.0.20.20, VLAN 20
- Blue Team Webserver 2: 10.0.20.25, VLAN 20

Included:
- index.html
- css/styles.css
- js/app.js

This package intentionally excludes configuration files and live-fire execution.

Latest refinement:
- Removed the two webserver arrowheads from the topology/stage branch lines while keeping packet-flow animation.
- Kept the packet learning path in one single line for cleaner readability.

Latest path-bar refinement:
- Removed the leading icon before the packet learning path.
- Shifted the packet learning path left and resized spacing so the full single-line text remains visible on the UI.
