import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const loginPanel = document.querySelector("#loginPanel");
const adminPanel = document.querySelector("#adminPanel");
const loginForm = document.querySelector("#loginForm");
const workForm = document.querySelector("#workForm");
const passwordForm = document.querySelector("#passwordForm");
const rateForm = document.querySelector("#rateForm");
const loginMessage = document.querySelector("#loginMessage");
const uploadMessage = document.querySelector("#uploadMessage");
const passwordMessage = document.querySelector("#passwordMessage");
const rateMessage = document.querySelector("#rateMessage");
const logoutButton = document.querySelector("#logoutButton");
const workList = document.querySelector("#workList");
const rateList = document.querySelector("#rateList");
const megabyte = 1024 * 1024;
const maxUploadBytes = 45 * megabyte;
const imageQuality = 0.9;
const imageMaxEdge = 2200;

const starterWork = [
  {
    type: "photo",
    brand: "Travel",
    title: "Mountain coffee moment",
    brief: "Starter photography item. Rearrange, delete, or replace it when your next project is ready.",
    file_path: "starter/mountain-coffee.jpg",
    file_url: "/starter/mountain-coffee.jpg",
    sort_order: 10
  },
  {
    type: "photo",
    brand: "Hospitality",
    title: "Spa lifestyle",
    brief: "Starter photography item. Rearrange, delete, or replace it when your next project is ready.",
    file_path: "starter/spa-coffee.jpg",
    file_url: "/starter/spa-coffee.jpg",
    sort_order: 20
  },
  {
    type: "photo",
    brand: "Food & Drink",
    title: "Cocktail serve",
    brief: "Starter photography item. Rearrange, delete, or replace it when your next project is ready.",
    file_path: "starter/cocktail-garnish.jpg",
    file_url: "/starter/cocktail-garnish.jpg",
    sort_order: 30
  },
  {
    type: "photo",
    brand: "Brand",
    title: "Coastal product moment",
    brief: "Starter photography item. Rearrange, delete, or replace it when your next project is ready.",
    file_path: "starter/stellenbrau-coast.jpg",
    file_url: "/starter/stellenbrau-coast.jpg",
    sort_order: 40
  },
  {
    type: "photo",
    brand: "Food",
    title: "Restaurant detail",
    brief: "Starter photography item. Rearrange, delete, or replace it when your next project is ready.",
    file_path: "starter/food-salad.jpg",
    file_url: "/starter/food-salad.jpg",
    sort_order: 50
  },
  {
    type: "photo",
    brand: "Travel",
    title: "Cave discovery",
    brief: "Starter photography item. Rearrange, delete, or replace it when your next project is ready.",
    file_path: "starter/cave-silhouette.jpg",
    file_url: "/starter/cave-silhouette.jpg",
    sort_order: 60
  }
];

const starterRates = [
  {
    label: "Starter",
    title: "1 UGC Video",
    price: "Tailored quote",
    description: "Concept, filming and edited vertical video for paid or organic social use.",
    sort_order: 10
  },
  {
    label: "Content Pack",
    title: "3 UGC Videos",
    price: "Tailored quote",
    description: "A stronger campaign set with varied hooks, angles and usable cutdowns.",
    sort_order: 20
  },
  {
    label: "Photo Add-On",
    title: "Photography Set",
    price: "Tailored quote",
    description: "Lifestyle product, food, travel or venue photos delivered with the campaign.",
    sort_order: 30
  }
];

let currentWork = [];
let currentRates = [];

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

function formatBytes(bytes) {
  return `${(bytes / megabyte).toFixed(bytes > 10 * megabyte ? 0 : 1)}MB`;
}

function renameAsJpeg(name) {
  return `${name.replace(/\.[^.]+$/, "") || "ugc-photo"}.jpg`;
}

async function compressImage(file) {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, imageMaxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", imageQuality);
  });

  bitmap.close?.();
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], renameAsJpeg(file.name), { type: "image/jpeg" });
}

async function prepareUploadFile(file) {
  if (file.type.startsWith("image/")) {
    setMessage(uploadMessage, "Optimising photo...");
    const compressed = await compressImage(file);
    if (compressed.size > maxUploadBytes) {
      throw new Error(`This photo is still ${formatBytes(compressed.size)} after optimisation. Please use an image under ${formatBytes(maxUploadBytes)}.`);
    }
    return compressed;
  }

  if (file.type.startsWith("video/") && file.size > maxUploadBytes) {
    throw new Error(`This video is ${formatBytes(file.size)}. Please export/compress it below ${formatBytes(maxUploadBytes)} before uploading, or increase the Supabase bucket file size limit.`);
  }

  if (file.size > maxUploadBytes) {
    throw new Error(`This file is ${formatBytes(file.size)}. Please upload a file below ${formatBytes(maxUploadBytes)}.`);
  }

  return file;
}

function renderEditForm(item) {
  const form = document.createElement("form");
  form.className = "dashboard-edit-form";

  form.innerHTML = `
    <label>
      Type
      <select name="type" required>
        <option value="photo">Photo</option>
        <option value="video">Video</option>
      </select>
    </label>
    <label>
      Brand / Client
      <input type="text" name="brand" required>
    </label>
    <label>
      Work Needed
      <input type="text" name="title" required>
    </label>
    <label>
      Display Order
      <input type="number" name="sort_order">
    </label>
    <label class="edit-wide">
      Brief Notes
      <textarea name="brief" rows="3"></textarea>
    </label>
    <div class="dashboard-actions edit-wide">
      <button type="submit">Save Text</button>
      <button type="button" data-edit-cancel>Cancel</button>
    </div>
  `;

  form.elements.type.value = item.type || "photo";
  form.elements.brand.value = item.brand || "";
  form.elements.title.value = item.title || "";
  form.elements.sort_order.value = item.sort_order ?? "";
  form.elements.brief.value = item.brief || "";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveWorkText(item, form);
  });
  form.querySelector("[data-edit-cancel]").addEventListener("click", () => loadWork());

  return form;
}

function renderWorkSections() {
  workList.innerHTML = "";
  const photos = currentWork.filter((item) => item.type === "photo");
  const videos = currentWork.filter((item) => item.type === "video");

  workList.append(
    renderWorkSection("Photography", photos),
    renderWorkSection("Videography", videos)
  );
}

function renderWorkSection(title, items) {
  const section = document.createElement("section");
  section.className = "dashboard-work-section";

  const header = document.createElement("div");
  header.className = "dashboard-work-heading";
  header.innerHTML = `
    <div>
      <p class="dashboard-label">${title}</p>
      <h2>${title} order</h2>
    </div>
    <span>${items.length} ${items.length === 1 ? "item" : "items"}</span>
  `;

  const track = document.createElement("div");
  track.className = "dashboard-work-carousel";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "dashboard-empty";
    empty.textContent = `No ${title.toLowerCase()} uploaded yet.`;
    track.appendChild(empty);
  } else {
    items.forEach((item) => track.appendChild(renderWorkItem(item, items)));
  }

  section.append(header, track);
  return section;
}

function renderWorkItem(item, orderedItems = currentWork.filter((work) => work.type === item.type)) {
  const article = document.createElement("article");
  article.className = "dashboard-work-item";
  const position = orderedItems.findIndex((work) => work.id === item.id);

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

  const actions = document.createElement("div");
  actions.className = "dashboard-actions";

  const moveLeftButton = document.createElement("button");
  moveLeftButton.type = "button";
  moveLeftButton.textContent = "Move Left";
  moveLeftButton.disabled = position <= 0;
  moveLeftButton.addEventListener("click", () => moveWork(item, -1, orderedItems));

  const moveRightButton = document.createElement("button");
  moveRightButton.type = "button";
  moveRightButton.textContent = "Move Right";
  moveRightButton.disabled = position === orderedItems.length - 1;
  moveRightButton.addEventListener("click", () => moveWork(item, 1, orderedItems));

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "Edit Text";
  editButton.addEventListener("click", () => {
    article.classList.add("is-editing");
    details.replaceChildren(renderEditForm(item));
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => deleteWork(item));

  actions.append(moveLeftButton, moveRightButton, editButton, deleteButton);
  details.append(title, meta, brief, actions);
  article.append(preview, details);
  return article;
}

function renderRateItem(item) {
  const article = document.createElement("article");
  article.className = "dashboard-rate-item";

  const form = document.createElement("form");
  form.className = "dashboard-edit-form";
  form.innerHTML = `
    <label>
      Package Label
      <input type="text" name="label" required>
    </label>
    <label>
      Package Name
      <input type="text" name="title" required>
    </label>
    <label>
      Price / Note
      <input type="text" name="price">
    </label>
    <label>
      Display Order
      <input type="number" name="sort_order">
    </label>
    <label class="edit-wide">
      Description
      <textarea name="description" rows="3" required></textarea>
    </label>
    <div class="dashboard-actions edit-wide">
      <button type="submit">Save Rate</button>
      <button type="button" data-delete-rate>Delete</button>
    </div>
  `;

  form.elements.label.value = item.label || "";
  form.elements.title.value = item.title || "";
  form.elements.price.value = item.price || "";
  form.elements.sort_order.value = item.sort_order ?? "";
  form.elements.description.value = item.description || "";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveRate(item, form);
  });

  form.querySelector("[data-delete-rate]").addEventListener("click", () => deleteRate(item));
  article.appendChild(form);
  return article;
}

async function seedStarterWork() {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;

  const { error } = await supabase.from("portfolio_work").insert(
    starterWork.map((item) => ({
      ...item,
      user_id: userId
    }))
  );

  if (error) {
    setMessage(uploadMessage, error.message, true);
    return false;
  }

  setMessage(uploadMessage, "Starter photography items added. You can rearrange or replace them.");
  return true;
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
  const hasStarterItems = data.some((item) => item.file_path?.startsWith("starter/"));
  if (!hasStarterItems) {
    const seeded = await seedStarterWork();
    if (seeded) {
      await loadWork();
      return;
    }
  }

  if (!data.length) {
    workList.innerHTML = "<p>No work yet.</p>";
    return;
  }

  currentWork = data;
  renderWorkSections();
}

async function seedStarterRates() {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;

  const { error } = await supabase.from("portfolio_rates").insert(
    starterRates.map((item) => ({
      ...item,
      user_id: userId
    }))
  );

  if (error) {
    setMessage(rateMessage, error.message, true);
    return false;
  }

  setMessage(rateMessage, "Starter rates added. You can edit them below.");
  return true;
}

async function loadRates() {
  if (!isSupabaseConfigured) {
    rateList.innerHTML = "<p>Add your Supabase keys to use rates.</p>";
    return;
  }

  const { data, error } = await supabase
    .from("portfolio_rates")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    rateList.innerHTML = "";
    setMessage(rateMessage, `${error.message}. Run the latest supabase/schema.sql to enable editable rates.`, true);
    return;
  }

  if (!data.length) {
    const seeded = await seedStarterRates();
    if (seeded) {
      await loadRates();
      return;
    }
  }

  currentRates = data;
  rateList.innerHTML = "";

  if (!data.length) {
    rateList.innerHTML = "<p>No rates yet.</p>";
    return;
  }

  data.forEach((item) => rateList.appendChild(renderRateItem(item)));
}

async function deleteWork(item) {
  if (!confirm(`Delete "${item.title}" from the portfolio?`)) return;

  setMessage(uploadMessage, "Deleting...");

  if (!item.file_path?.startsWith("starter/")) {
    const { error: storageError } = await supabase.storage.from("ugc-media").remove([item.file_path]);
    if (storageError) {
      setMessage(uploadMessage, storageError.message, true);
      return;
    }
  }

  const { error } = await supabase.from("portfolio_work").delete().eq("id", item.id);
  if (error) {
    setMessage(uploadMessage, error.message, true);
    return;
  }

  setMessage(uploadMessage, "Deleted.");
  await loadWork();
}

async function moveWork(item, direction, orderedItems = currentWork.filter((work) => work.type === item.type)) {
  const index = orderedItems.findIndex((work) => work.id === item.id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= orderedItems.length) return;

  const reordered = [...orderedItems];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(nextIndex, 0, moved);

  currentWork = currentWork.map((work) => {
    const orderIndex = reordered.findIndex((orderedWork) => orderedWork.id === work.id);
    return orderIndex >= 0 ? { ...work, sort_order: (orderIndex + 1) * 10 } : work;
  });
  renderWorkSections();

  setMessage(uploadMessage, "Saving order...");
  const updates = reordered.map((work, orderIndex) =>
    supabase
      .from("portfolio_work")
      .update({ sort_order: (orderIndex + 1) * 10 })
      .eq("id", work.id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);

  if (failed) {
    setMessage(uploadMessage, failed.error.message, true);
    await loadWork();
    return;
  }

  setMessage(uploadMessage, "Order saved. The public portfolio will update automatically.");
  await loadWork();
}

async function saveRate(item, form) {
  const formData = new FormData(form);
  const updates = {
    label: String(formData.get("label") || "").trim(),
    title: String(formData.get("title") || "").trim(),
    price: String(formData.get("price") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    sort_order: Number(formData.get("sort_order") || 0)
  };

  if (!updates.label || !updates.title || !updates.description) {
    setMessage(rateMessage, "Package label, package name and description are required.", true);
    return;
  }

  setMessage(rateMessage, "Saving rate...");
  const { error } = await supabase.from("portfolio_rates").update(updates).eq("id", item.id);

  if (error) {
    setMessage(rateMessage, error.message, true);
    return;
  }

  setMessage(rateMessage, "Rate updated. The website will update automatically.");
  await loadRates();
}

async function deleteRate(item) {
  if (!confirm(`Delete "${item.title}" from your rates?`)) return;

  setMessage(rateMessage, "Deleting rate...");
  const { error } = await supabase.from("portfolio_rates").delete().eq("id", item.id);

  if (error) {
    setMessage(rateMessage, error.message, true);
    return;
  }

  setMessage(rateMessage, "Rate deleted.");
  await loadRates();
}

async function saveWorkText(item, form) {
  const formData = new FormData(form);
  const updates = {
    type: formData.get("type"),
    brand: String(formData.get("brand") || "").trim(),
    title: String(formData.get("title") || "").trim(),
    brief: String(formData.get("brief") || "").trim(),
    sort_order: Number(formData.get("sort_order") || 0)
  };

  if (!updates.brand || !updates.title) {
    setMessage(uploadMessage, "Brand and work needed are required.", true);
    return;
  }

  setMessage(uploadMessage, "Saving text...");
  const { error } = await supabase.from("portfolio_work").update(updates).eq("id", item.id);

  if (error) {
    setMessage(uploadMessage, error.message, true);
    return;
  }

  setMessage(uploadMessage, "Text updated. The public portfolio will update automatically.");
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
  await loadRates();
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

rateForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    setMessage(rateMessage, "Please log in again.", true);
    showDashboard(false);
    return;
  }

  const form = new FormData(rateForm);
  const rate = {
    user_id: userId,
    label: String(form.get("label") || "").trim(),
    title: String(form.get("title") || "").trim(),
    price: String(form.get("price") || "").trim(),
    description: String(form.get("description") || "").trim(),
    sort_order: Number(form.get("sort_order") || 0)
  };

  if (!rate.label || !rate.title || !rate.description) {
    setMessage(rateMessage, "Package label, package name and description are required.", true);
    return;
  }

  setMessage(rateMessage, "Adding rate...");
  const { error } = await supabase.from("portfolio_rates").insert(rate);

  if (error) {
    setMessage(rateMessage, error.message, true);
    return;
  }

  rateForm.reset();
  setMessage(rateMessage, "Rate added. The website will update automatically.");
  await loadRates();
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

  let uploadFile;
  try {
    uploadFile = await prepareUploadFile(file);
  } catch (error) {
    setMessage(uploadMessage, error.message, true);
    return;
  }

  const savedBytes = file.size - uploadFile.size;
  const optimisedMessage = savedBytes > megabyte
    ? ` Optimised from ${formatBytes(file.size)} to ${formatBytes(uploadFile.size)}.`
    : "";
  setMessage(uploadMessage, `Uploading...${optimisedMessage}`);

  const filePath = `${userId}/${Date.now()}-${cleanFilename(uploadFile.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("ugc-media")
    .upload(filePath, uploadFile, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    const sizeHint = uploadError.message.toLowerCase().includes("maximum allowed size")
      ? ` The current dashboard limit is ${formatBytes(maxUploadBytes)}. Compress the file smaller or increase the Supabase bucket limit.`
      : "";
    setMessage(uploadMessage, `${uploadError.message}${sizeHint}`, true);
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
  if (data.session) {
    await loadWork();
    await loadRates();
  }
}

init();
