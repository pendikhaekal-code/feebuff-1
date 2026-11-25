// ===== Elemen =====
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const taskCount = document.getElementById("taskCount");
const progress = document.getElementById("progress");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const categorySelect = document.getElementById("categorySelect");
const prioritySelect = document.getElementById("prioritySelect");
const deadlineInput = document.getElementById("deadlineInput");
const deadlineError = document.getElementById("deadlineError");

// ===== Kategori & Prioritas =====
const CATEGORIES = {
  Praktikum: { label: "Praktikum", icon: "🧪", className: "cat-praktikum" },
  Teori: { label: "Teori", icon: "📖", className: "cat-teori" },
  Ujian: { label: "Ujian", icon: "📝", className: "cat-ujian" },
};

const PRIORITIES = {
  Rendah: { label: "Rendah", className: "prio-rendah" },
  Sedang: { label: "Sedang", className: "prio-sedang" },
  Tinggi: { label: "Tinggi", className: "prio-tinggi" },
};

const DEFAULT_CATEGORY = "Teori";
const DEFAULT_PRIORITY = "Sedang";

function normalizeCategory(value) {
  return Object.prototype.hasOwnProperty.call(CATEGORIES, value)
    ? value
    : DEFAULT_CATEGORY;
}

function normalizePriority(value) {
  return Object.prototype.hasOwnProperty.call(PRIORITIES, value)
    ? value
    : DEFAULT_PRIORITY;
}

// ===== Deadline =====
// Disimpan sebagai tanggal lokal "YYYY-MM-DD" agar tidak bergeser hari
// karena konversi UTC. Tugas lama tanpa deadline bernilai null.
function todayISO() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function normalizeDeadline(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const isValid =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isValid ? value : null;
}

function parseDeadline(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysUntil(deadline) {
  if (!deadline) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = parseDeadline(deadline);

  return Math.round((target - today) / 86400000);
}

function formatDeadline(deadline) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseDeadline(deadline));
}

function getDeadlineBadgeInfo(deadline) {
  if (!deadline) {
    return { className: "is-none", text: "Tanpa deadline" };
  }

  const remaining = daysUntil(deadline);
  const formatted = formatDeadline(deadline);

  if (remaining < 0) {
    return { className: "is-overdue", text: formatted + " · terlambat" };
  }
  if (remaining === 0) {
    return { className: "is-today", text: formatted + " · hari ini" };
  }
  if (remaining <= 3) {
    return {
      className: "is-soon",
      text: formatted + " · " + remaining + " hari lagi",
    };
  }

  return { className: "", text: formatted };
}

function showDeadlineError(message) {
  if (!deadlineError) return;
  deadlineError.textContent = message;
  deadlineError.hidden = false;
  deadlineInput.setAttribute("aria-invalid", "true");
}

function clearDeadlineError() {
  if (!deadlineError) return;
  deadlineError.hidden = true;
  deadlineInput.removeAttribute("aria-invalid");
}

// ===== Penyimpanan =====
const STORAGE_KEY = "tugasKuliah.v1";

let tasks = loadTasks();

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (task) =>
          task &&
          typeof task.id === "string" &&
          typeof task.text === "string"
      )
      .map((task) => ({
        ...task,
        // Tugas lama (sebelum ada kategori/prioritas/deadline) tetap dimuat.
        category: normalizeCategory(task.category),
        priority: normalizePriority(task.priority),
        // Tugas lama tanpa deadline tetap tersimpan sebagai null,
        // bukan diisi tanggal karangan.
        deadline: normalizeDeadline(task.deadline),
      }));
  } catch (error) {
    console.warn("Gagal membaca data tugas:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.warn("Gagal menyimpan data tugas:", error);
  }
}

function createId() {
  if (window.crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ===== Render =====
function renderTasks() {
  taskList.replaceChildren();

  tasks.forEach((task) => {
    const category = CATEGORIES[task.category] || CATEGORIES[DEFAULT_CATEGORY];
    const priority = PRIORITIES[task.priority] || PRIORITIES[DEFAULT_PRIORITY];

    const item = document.createElement("li");
    item.className =
      "task-item " + priority.className + (task.done ? " done" : "");

    // Label + checkbox
    const label = document.createElement("label");
    label.className = "task-check";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.dataset.action = "toggle";
    checkbox.dataset.id = task.id;

    const checkmark = document.createElement("span");
    checkmark.className = "checkmark";

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const badges = document.createElement("span");
    badges.className = "task-badges";

    const categoryBadge = document.createElement("span");
    categoryBadge.className = "badge badge-category " + category.className;
    categoryBadge.innerHTML =
      '<span aria-hidden="true">' +
      category.icon +
      "</span> " +
      category.label;

    const priorityBadge = document.createElement("span");
    priorityBadge.className = "badge badge-priority " + priority.className;
    priorityBadge.innerHTML =
      '<span class="badge-dot" aria-hidden="true"></span>' +
      priority.label +
      "<span class=\"sr-only\"> prioritas</span>";

    const deadlineInfo = getDeadlineBadgeInfo(task.deadline);
    const deadlineBadge = document.createElement("span");
    deadlineBadge.className =
      "badge badge-deadline" +
      (deadlineInfo.className ? " " + deadlineInfo.className : "");
    deadlineBadge.textContent = deadlineInfo.text;

    badges.append(categoryBadge, priorityBadge, deadlineBadge);

    label.append(checkbox, checkmark, text, badges);

    // Tombol hapus
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-delete";
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id = task.id;
    deleteBtn.setAttribute("aria-label", "Hapus tugas: " + task.text);
    deleteBtn.title = "Hapus tugas";
    deleteBtn.textContent = "✕";

    item.append(label, deleteBtn);
    taskList.append(item);
  });

  updateSummary();
}

function updateSummary() {
  const total = tasks.length;
  const done = tasks.filter((task) => task.done).length;
  const remaining = total - done;

  emptyState.hidden = total > 0;

  taskCount.textContent =
    total === 0 ? "0 tugas" : `${remaining} belum selesai · ${total} tugas`;

  progress.hidden = total === 0;
  progressText.textContent = `${done} dari ${total} selesai`;
  progressFill.style.width = total ? `${(done / total) * 100}%` : "0%";
}

// ===== Aksi =====
taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = taskInput.value.trim();
  if (!text) {
    taskInput.focus();
    return;
  }

  const deadline = normalizeDeadline(deadlineInput.value.trim());
  if (!deadline) {
    showDeadlineError("Deadline wajib diisi dengan tanggal yang valid.");
    deadlineInput.focus();
    return;
  }
  if (deadline < todayISO()) {
    showDeadlineError("Deadline tidak boleh tanggal yang sudah lewat.");
    deadlineInput.focus();
    return;
  }

  tasks.unshift({
    id: createId(),
    text,
    done: false,
    category: normalizeCategory(categorySelect.value),
    priority: normalizePriority(prioritySelect.value),
    deadline,
  });
  saveTasks();
  renderTasks();

  taskForm.reset();
  categorySelect.value = DEFAULT_CATEGORY;
  prioritySelect.value = DEFAULT_PRIORITY;
  deadlineInput.min = todayISO();
  clearDeadlineError();
  taskInput.focus();
});

// Event delegation untuk checkbox dan tombol hapus
taskList.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const { action, id } = target.dataset;

  if (action === "delete") {
    tasks = tasks.filter((task) => task.id !== id);
    saveTasks();
    renderTasks();
  }
});

taskList.addEventListener("change", (event) => {
  const target = event.target.closest('[data-action="toggle"]');
  if (!target) return;

  const task = tasks.find((item) => item.id === target.dataset.id);
  if (!task) return;

  task.done = target.checked;
  saveTasks();
  renderTasks();
});

// ===== Mulai =====
deadlineInput.min = todayISO();
deadlineInput.addEventListener("input", clearDeadlineError);
renderTasks();
