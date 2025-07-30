class ScheduleManager {
    constructor() {
        this.dutIp = window.location.pathname.split('/')[2];
        this.isDragging = false;
        this.selectedSlots = new Set();
        this.reservedSlots = new Set();
        
        this.initializeEventListeners();
        this.loadExistingSchedule();
        this.loadDayReservations();
    }
    
    initializeEventListeners() {
        const slots = document.querySelectorAll('.slot');
        
        slots.forEach(slot => {
            slot.addEventListener('mousedown', (e) => this.handleMouseDown(e, slot));
            slot.addEventListener('mouseenter', (e) => this.handleMouseEnter(e, slot));
            slot.addEventListener('mouseup', (e) => this.handleMouseUp(e, slot));
        });
        
        document.addEventListener('mouseup', () => this.handleMouseUp());
        
        document.getElementById('save-schedule').addEventListener('click', () => this.saveSchedule());
        document.getElementById('clear-selection').addEventListener('click', () => this.clearSelection());
    }
    
    handleMouseDown(e, slot) {
        if (slot.classList.contains('reserved')) return;
        
        this.isDragging = true;
        this.toggleSlot(slot);
        e.preventDefault();
    }
    
    handleMouseEnter(e, slot) {
        if (!this.isDragging || slot.classList.contains('reserved')) return;
        
        this.toggleSlot(slot);
    }
    
    handleMouseUp(e, slot) {
        if (this.isDragging && slot && !slot.classList.contains('reserved')) {
            this.toggleSlot(slot);
        }
        this.isDragging = false;
    }
    
    toggleSlot(slot) {
        const time = slot.dataset.time;
        
        if (this.selectedSlots.has(time)) {
            this.selectedSlots.delete(time);
            slot.classList.remove('selected');
        } else {
            this.selectedSlots.add(time);
            slot.classList.add('selected');
        }
        
        this.updateSaveButton();
    }
    
    updateSaveButton() {
        const saveBtn = document.getElementById('save-schedule');
        const userName = document.getElementById('user-name').value.trim();
        
        saveBtn.disabled = this.selectedSlots.size === 0 || userName === '';
    }
    
    async loadExistingSchedule() {
        try {
            const response = await fetch(`/api/schedule/${this.dutIp}`);
            const data = await response.json();
            
            if (data.time_slots) {
                data.time_slots.forEach(time => {
                    this.reservedSlots.add(time);
                    const slot = document.querySelector(`[data-time="${time}"]`);
                    if (slot) {
                        slot.classList.add('reserved');
                        slot.title = `Reserved by ${data.user} - ${time}`;
                    }
                });
            }
        } catch (error) {
            console.error('Error loading schedule:', error);
        }
    }
    
    async loadDayReservations() {
        try {
            const response = await fetch(`/api/schedule/${this.dutIp}/day`);
            const reservations = await response.json();
            
            const container = document.getElementById('reservations-container');
            if (reservations.length === 0) {
                container.innerHTML = '<p style="color: #6b7280; font-style: italic;">No reservations for today</p>';
                return;
            }
            
            container.innerHTML = reservations.map(reservation => {
                const timeSlots = reservation.time_slots.map(time => {
                    const hour = parseInt(time.split(':')[0]);
                    return `${hour}:00`;
                }).join(', ');
                
                return `
                    <div class="reservation-item">
                        <div class="reservation-info">
                            <div class="reservation-dut">${reservation.friendly_name} (${reservation.dut_ip})</div>
                            <div class="reservation-details">Reserved by ${reservation.user}</div>
                        </div>
                        <div class="reservation-times">${timeSlots}</div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading day reservations:', error);
        }
    }
    
    async saveSchedule() {
        const userName = document.getElementById('user-name').value.trim();
        
        if (!userName) {
            alert('Please enter your name');
            return;
        }
        
        if (this.selectedSlots.size === 0) {
            alert('Please select at least one time slot');
            return;
        }
        
        const timeSlots = Array.from(this.selectedSlots).sort();
        
        try {
            const response = await fetch(`/api/schedule/${this.dutIp}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user: userName,
                    time_slots: timeSlots
                })
            });
            
            if (response.ok) {
                alert('Schedule saved successfully!');
                this.reservedSlots = new Set([...this.reservedSlots, ...this.selectedSlots]);
                this.selectedSlots.clear();
                this.updateSlotDisplay();
            } else {
                alert('Error saving schedule');
            }
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Error saving schedule');
        }
    }
    
    clearSelection() {
        this.selectedSlots.clear();
        this.updateSlotDisplay();
        this.updateSaveButton();
    }
    
    updateSlotDisplay() {
        const slots = document.querySelectorAll('.slot');
        
        slots.forEach(slot => {
            const time = slot.dataset.time;
            slot.classList.remove('selected');
            
            if (this.reservedSlots.has(time)) {
                slot.classList.add('reserved');
            } else {
                slot.classList.remove('reserved');
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ScheduleManager();
    
    // Add event listener for name input to update save button
    document.getElementById('user-name').addEventListener('input', () => {
        const saveBtn = document.getElementById('save-schedule');
        const userName = document.getElementById('user-name').value.trim();
        const selectedSlots = document.querySelectorAll('.slot.selected');
        
        saveBtn.disabled = selectedSlots.length === 0 || userName === '';
    });
}); 