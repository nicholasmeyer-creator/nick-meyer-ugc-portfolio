import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const loginPanel = document.querySelector("#loginPanel");
const adminPanel = document.querySelector("#adminPanel");
const loginForm = document.querySelector("#loginForm");
const workForm = document.querySelector("#workForm");
const passwordForm = document.querySelector("#passwordForm");
const loginMessage = document.querySelector("#loginMessage");
const uploadMessage = document.querySelector("#uploadMessage");
const passwordMessage = document.querySelector("#passwordMessage");
const logoutButton = document.querySelector("#logoutButton");
const workList = document.querySelector("#workList");

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

function showDashboard(isLoggedIn) {
  loginPanel.classList.toggle("is-hidden", isLoggedIn);
  adminPanel.classList.toggle("is-hidden", !isLoggedIn);
}

function cleanFilename(name) {
  const safeName = name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
  return safeName || "ugc-upload";
}

function renderWorkItem(item) {
  const article = document.createElement("article");
  article.className = "dashboard-work-item";

  const preview = item.type === "video" ? document.createElement("video") : document.createElement("img");
  preview.src = item.file_url;
  if (item.type === "video") {
    preview.controls = true;
    preview.preload = "metadata";
  } else {
    preview.alt = item.title || item.brand || "Portfolio work";
  }

  const details = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = item.title || "Untitled work";
  const meta = document.createElement("span");
  meta.textContent = `${item.brand || "UGC"} | ${item.type}`;
  const brief = document.createElement("p");
  brief.textContent = item.brief || "No brief notes added.";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => deleteWork(item));

  details.append(title, meta, brief, deleteButton);
  article.append(preview, details);
  return article;
}

async function loadWork() {
  if (!isSupabaseConfigured) {
    workList.innerHTML = "<p>Add your Supabase keys to use the dashboard.</p>";
    return;
  }

  const { data, error } = await supabase
    .from("portfolio_work")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    workList.innerHTML = "";
    setMessage(uploadMessage, error.message, true);
    return;
  }

  workList.innerHTML = "";
  if (!data.length) {
    workList.innerHTML = "<p>No uploaded work yet.</p>";
    return;
  }

  data.forEach((item) => workList.appendChild(renderWorkItem(item)));
}

async function deleteWork(item) {
  if (!confirm(`Delete "${item.title}" from the portfolio?`)) return;

  setMessage(uploadMessage, "Deleting...");
  const { error: storageError } = await supabase.storage.from("ugc-media").remove([item.file_path]);
  if (storageError) {
    setMessage(uploadMessage, storageError.message, true);
    return;
  }

  const { error } = await supabase.from("portfolio_work").delete().eq("id", item.id);
  if (error) {
    setMessage(uploadMessage, error.message, true);
    return;
  }

  setMessage(uploadMessage, "Deleted.");
  await loadWork();
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isSupabaseConfigured) {
    setMessage(loginMessage, "Add your Supabase URL and anon key first.", true);
    return;
  }

  const form = new FormData(loginForm);
  setMessage(loginMessage, "Logging in...");
  const { error } = await supabase.auth.signInWithPassword({
    email: form.get("email"),
    password: form.get("password")
  });

  if (error) {
    setMessage(loginMessage, error.message, true);
    return;
  }

  setMessage(loginMessage, "");
  showDashboard(true);
  await loadWork();
});

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  showDashboard(false);
});

passwordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(passwordForm);
  const password = String(form.get("password") || "");
  const confirmPassword = String(form.get("confirm_password") || "");

  if (password.length < 8) {
    setMessage(passwordMessage, "Use at least 8 characters.", true);
    return;
  }

  if (password !== confirmPassword) {
    setMessage(passwordMessage, "The passwords do not match.", true);
    return;
  }

  setMessage(passwordMessage, "Updating password...");
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    setMessage(passwordMessage, error.message, true);
    return;
  }

  passwordForm.reset();
  setMessage(passwordMessage, "Password updated.");
});

workForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(workForm);
  const file = form.get("file");

  if (!(file instanceof File) || !file.size) {
    setMessage(uploadMessage, "Choose a photo or video first.", true);
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    setMessage(uploadMessage, "Please log in again.", true);
    showDashboard(false);
    return;
  }

  setMessage(uploadMessage, "Uploading...");

  const filePath = `${userId}/${Date.now()}-${cleanFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("ugc-media")
    .upload(filePath, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    setMessage(uploadMessage, uploadError.message, true);
    return;
  }

  const { data: publicData } = supabase.storage.from("ugc-media").getPublicUrl(filePath);

  const { error } = await supabase.from("portfolio_work").insert({
    user_id: userId,
    type: form.get("type"),
    brand: form.get("brand"),
    title: form.get("title"),
    brief: form.get("brief"),
    sort_order: Number(form.get("sort_order") || 0),
    file_path: filePath,
    file_url: publicData.publicUrl
  });

  if (error) {
    setMessage(uploadMessage, error.message, true);
    return;
  }

  workForm.reset();
  setMessage(uploadMessage, "Uploaded. The public portfolio will update automatically.");
  await loadWork();
});

async function init() {
  if (!isSupabaseConfigured) {
    showDashboard(false);
    setMessage(loginMessage, "Add Supabase environment variables to enable login.", true);
    return;
  }

  const { data } = await supabase.auth.getSession();
  showDashboard(Boolean(data.session));
  if (data.session) await loadWork();
}

init();
