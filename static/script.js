async function loadTable() {
    const res = await fetch("/api/duts");
    const data = await res.json();
    const table = document.getElementById("dut-table");
    table.innerHTML = "";
  
    const duts = ["dut-1", "dut-2", "dut-3", "dut-4", "dut-5"];
    duts.forEach(dut => {
      const row = document.createElement("tr");
      const record = data[dut] || {};
      const status = record.status === "reserved"
        ? `Reserved by ${record.user} until ${new Date(record.expires_at).toLocaleTimeString()}`
        : "Available";
  
      row.innerHTML = `
        <td>${dut}</td>
        <td>${status}</td>
        <td>
          <input id="${dut}-user" placeholder="Name">
          <select id="${dut}-hours">
            ${[1,2,3,4,5,6,7,8].map(h => `<option value="${h}">${h}h</option>`).join("")}
          </select>
          <button onclick="reserve('${dut}')">Reserve</button>
        </td>
        <td>
          <button onclick="remove('${dut}')">Delete</button>
        </td>
      `;
      table.appendChild(row);
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
  
  window.onload = loadTable;
  