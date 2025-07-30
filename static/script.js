async function loadTable() {
    const res = await fetch("/api/duts");
    const data = await res.json();
    const grid = document.getElementById("dut-grid");
    grid.innerHTML = "";
  
    const dutMapping = {
      "10.30.2.157": "TL7 (no name)",
      "10.30.2.75": "leaf1",
      "10.30.2.16": "spine1",
      "10.30.2.134": "leaf2", 
      "10.30.2.129": "spine2"
    };
    
    const duts = ["10.30.2.157", "10.30.2.75", "10.30.2.16", "10.30.2.134", "10.30.2.129"];
    duts.forEach(dut => {
      const card = document.createElement("div");
      const record = data[dut] || {};
      const friendlyName = dutMapping[dut] || "unknown";
      
      let status = "Available";
      if (record.status === "reserved") {
        const expiryDate = new Date(record.expires_at);
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const localTime = expiryDate.toLocaleString('en-US', {
          timeZone: timeZone,
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        });
        status = `Reserved by ${record.user} until ${localTime}`;
      }
  
      const statusClass = record.status === "reserved" ? "status-reserved" : "status-available";
      const statusText = record.status === "reserved" ? "RESERVED" : "AVAILABLE";
      
      card.innerHTML = `
        <div class="dut-card">
          <div class="dut-header">
            <div class="dut-info">
              <div class="dut-ip">${dut}</div>
              <div class="dut-name">${friendlyName}</div>
            </div>
            <a href="/schedule/${dut}" class="schedule-toggle">📅 Schedule</a>
          </div>
          
          <div class="dut-status">
            <span class="${statusClass}">${statusText}</span>
            ${record.status === "reserved" ? `<br><small>${status}</small>` : ''}
          </div>
          
          <div class="dut-actions">
            <div class="reservation-form">
              <input id="${dut}-user" placeholder="Your name" type="text">
              <select id="${dut}-hours">
                ${[1,2,3,4,5,6,7,8].map(h => `<option value="${h}">${h}h</option>`).join("")}
              </select>
              <button class="btn btn-primary" onclick="reserve('${dut}')">Reserve</button>
            </div>
            <button class="btn btn-danger" onclick="remove('${dut}')">Delete</button>
          </div>
          

        </div>
      `;
      grid.appendChild(card);
    });
  }
  

  
  async function reserve(dut) {
    const user = document.getElementById(`${dut}-user`).value;
    const hours = document.getElementById(`${dut}-hours`).value;
    await fetch("/api/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `dut=${dut}&user=${user}&hours=${hours}`
    });
    loadTable();
  }
  
  async function remove(dut) {
    await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `dut=${dut}`
    });
    loadTable();
  }
  
  function updateClock() {
    const now = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeString = now.toLocaleString('en-US', {
      timeZone: timeZone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
    
    const clockElement = document.getElementById("current-time");
    if (clockElement) {
      clockElement.textContent = timeString;
    }
  }

  function updateTimezoneInfo() {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeZoneInfo = document.getElementById("timezone-info");
    if (timeZoneInfo) {
      timeZoneInfo.textContent = `Times displayed in your local timezone: ${timeZone}`;
    }
  }

  window.onload = function() {
    updateTimezoneInfo();
    updateClock();
    loadTable();
    
    // Update clock every second
    setInterval(updateClock, 1000);
  };
  