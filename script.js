const form = document.getElementById("reservationForm");
const confirmation = document.getElementById("confirmation");
const timeSlots = document.querySelectorAll(".slot-button");
const timeInput = document.getElementById("timeInput");
const dateInput = document.getElementById("date");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminUsername = document.getElementById("adminUsername");
const adminPassword = document.getElementById("adminPassword");
const adminMessage = document.getElementById("adminMessage");
const adminContent = document.getElementById("adminContent");
const adminReservations = document.getElementById("adminReservations");
const clearReservationsBtn = document.getElementById("clearReservations");
const logoutAdminBtn = document.getElementById("logoutAdmin");

function setDateMin() {
  if (!dateInput) {
    return;
  }
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  dateInput.min = `${year}-${month}-${day}`;
}

function clearTimeSelection() {
  timeSlots.forEach((button) => button.classList.remove("selected"));
}

function selectTimeSlot(button) {
  clearTimeSelection();
  button.classList.add("selected");
  timeInput.value = button.dataset.time;
}

function parseDateStringToLocalDate(dateString) {
  if (!dateString) {
    return null;
  }
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cleanupOldAppointments() {
  const appointments = JSON.parse(localStorage.getItem("appointments")) || [];
  const today = getTodayString();
  const filteredAppointments = appointments.filter((appointment) => appointment.date >= today);

  if (filteredAppointments.length !== appointments.length) {
    localStorage.setItem("appointments", JSON.stringify(filteredAppointments));
  }

  return filteredAppointments;
}

function updateAppointmentStatuses(appointments = null) {
  const savedAppointments = appointments || JSON.parse(localStorage.getItem("appointments")) || [];
  const today = getTodayString();
  const now = new Date();
  let changed = false;

  const updatedAppointments = savedAppointments.map((appointment) => {
    let status = appointment.status || "pendiente";

    if (appointment.date === today) {
      const [hour, minute] = appointment.time.split(":").map(Number);
      const slotDate = new Date(appointment.date);
      slotDate.setHours(hour, minute, 0, 0);

      const newStatus = slotDate <= now ? "hecha" : "pendiente";
      if (newStatus !== status) {
        status = newStatus;
        changed = true;
      }
    }

    return { ...appointment, status };
  });

  if (changed) {
    localStorage.setItem("appointments", JSON.stringify(updatedAppointments));
  }

  return updatedAppointments;
}

function isPastSlot(date, time) {
  if (!date || !time) {
    return false;
  }

  const now = new Date();
  const slotDate = new Date(date);
  const [hour, minute] = time.split(":").map(Number);
  slotDate.setHours(hour, minute, 0, 0);

  return slotDate <= now;
}

function updateTimeSlotState() {
  const selectedDate = dateInput && dateInput.value ? parseDateStringToLocalDate(dateInput.value) : null;
  const selectedBarber = form.barber.value;
  const appointments = JSON.parse(localStorage.getItem("appointments")) || [];
  const appointmentDateLabel = dateInput && dateInput.value ? dateInput.value : "";

  timeSlots.forEach((button) => {
    const slotTime = button.dataset.time;
    const isPast = selectedDate ? isPastSlot(selectedDate, slotTime) : false;
    const isReserved = selectedBarber
      ? appointments.some(
          (appointment) =>
            appointment.barber === selectedBarber &&
            appointment.date === appointmentDateLabel &&
            appointment.time === slotTime
        )
      : false;
    const shouldDisable = isPast || isReserved;

    button.disabled = shouldDisable;
    if (shouldDisable) {
      button.classList.remove("selected");
      if (button.dataset.time === timeInput.value) {
        timeInput.value = "";
      }
    }
  });
}

function getStatusLabel(status) {
  return status === "hecha" ? "Hecha" : "Pendiente";
}

function renderAdminReservations() {
  const cleanedAppointments = cleanupOldAppointments();
  const savedAppointments = updateAppointmentStatuses(cleanedAppointments);

  if (!adminReservations) {
    return;
  }

  if (savedAppointments.length === 0) {
    adminReservations.innerHTML = '<p class="empty-reservations">No hay reservas disponibles.</p>';
    return;
  }

  adminReservations.innerHTML = savedAppointments
    .map(
      (appointment, index) => `
      <article class="reservation-item">
        <div class="reservation-item-head">
          <strong>${appointment.name}</strong>
          <span>${appointment.date} · ${appointment.time}</span>
        </div>
        <p>${appointment.service} · ${appointment.barber}</p>
        <p>${appointment.phone}</p>
        <p class="reservation-status">Estado: <strong>${getStatusLabel(appointment.status)}</strong></p>
        <button type="button" class="btn secondary-btn mark-reservation-done" data-index="${index}" ${appointment.status === "hecha" ? "disabled" : ""}>
          Marcar como hecha
        </button>
      </article>
    `
    )
    .join("");
}

function markAppointmentDone(index) {
  const appointments = JSON.parse(localStorage.getItem("appointments")) || [];
  if (!appointments[index]) {
    return;
  }

  appointments[index].status = "hecha";
  localStorage.setItem("appointments", JSON.stringify(appointments));
  renderAdminReservations();
  updateTimeSlotState();
}

function showAdminContent(show) {
  if (!adminContent) {
    return;
  }
  if (show) {
    adminContent.classList.remove("hidden");
    adminMessage.textContent = "";
  } else {
    adminContent.classList.add("hidden");
  }
}

function handleAdminLogin(event) {
  event.preventDefault();

  const username = adminUsername.value.trim();
  const password = adminPassword.value.trim();

  if (username === "admin" && password === "barberadmin") {
    renderAdminReservations();
    showAdminContent(true);
    adminMessage.textContent = "Acceso concedido.";
    adminMessage.style.color = "#bada55";
    adminLoginForm.reset();
    updateTimeSlotState();
    return;
  }

  adminMessage.textContent = "Usuario o contraseña incorrectos.";
  adminMessage.style.color = "#f29a4c";
}

function handleAdminLogout() {
  showAdminContent(false);
  adminMessage.textContent = "Sesión cerrada.";
  adminMessage.style.color = "var(--muted)";
}

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", handleAdminLogin);
}

const clearOldReservationsBtn = document.getElementById("clearOldReservations");
const refreshStatusBtn = document.getElementById("refreshStatus");

if (adminReservations) {
  adminReservations.addEventListener("click", (event) => {
    const target = event.target;
    if (target.classList.contains("mark-reservation-done")) {
      const index = Number(target.dataset.index);
      if (!Number.isNaN(index)) {
        markAppointmentDone(index);
      }
    }
  });
}

if (clearReservationsBtn) {
  clearReservationsBtn.addEventListener("click", () => {
    localStorage.removeItem("appointments");
    renderAdminReservations();
    updateTimeSlotState();
  });
}

if (clearOldReservationsBtn) {
  clearOldReservationsBtn.addEventListener("click", () => {
    cleanupOldAppointments();
    renderAdminReservations();
    updateTimeSlotState();
  });
}

if (refreshStatusBtn) {
  refreshStatusBtn.addEventListener("click", () => {
    updateAppointmentStatuses();
    renderAdminReservations();
    updateTimeSlotState();
  });
}

if (logoutAdminBtn) {
  logoutAdminBtn.addEventListener("click", handleAdminLogout);
}

if (dateInput) {
  dateInput.addEventListener("change", updateTimeSlotState);
}

if (form.barber) {
  form.barber.addEventListener("change", updateTimeSlotState);
}

setDateMin();
cleanupOldAppointments();
updateAppointmentStatuses();
showAdminContent(false);
updateTimeSlotState();

timeSlots.forEach((button) => {
  button.addEventListener("click", () => {
    selectTimeSlot(button);
  });
});


form.addEventListener("submit", (event) => {
  event.preventDefault();

  const appointmentDate = dateInput.value;
  const appointment = {
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    service: form.service.value,
    barber: form.barber.value,
    date: appointmentDate,
    time: timeInput.value,
    createdAt: new Date().toISOString(),
  };

  if (!appointment.name || !appointment.phone || !appointment.service || !appointment.barber || !appointment.time || !appointment.date) {
    confirmation.textContent = "Por favor completa todos los campos obligatorios y selecciona una hora.";
    confirmation.style.color = "#f29a4c";
    return;
  }

  const savedAppointments = JSON.parse(localStorage.getItem("appointments")) || [];
  savedAppointments.push(appointment);
  localStorage.setItem("appointments", JSON.stringify(savedAppointments));

  confirmation.textContent = `¡Reserva enviada! Hemos guardado tu cita para el ${appointment.date} a las ${appointment.time}.`;
  confirmation.style.color = "#bada55";
  form.reset();
  clearTimeSelection();
  timeInput.value = "";
});
