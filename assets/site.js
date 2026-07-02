import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduceMotion && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  document.querySelectorAll(".ugc-section, .work-card, .phone-frame").forEach((element) => {
    element.classList.add("reveal");
    observer.observe(element);
  });
} else {
  document.querySelectorAll(".ugc-section, .work-card, .phone-frame").forEach((element) => {
    element.classList.add("is-visible");
  });
}

const photoWork = document.querySelector("#photoWork");
const videoWork = document.querySelector("#videoWork");

function createPhotoCard(item) {
  const card = document.createElement("article");
  card.className = "work-card reveal is-visible";

  const image = document.createElement("img");
  image.src = item.file_url || item.file;
  image.alt = item.title || item.brand || "UGC photo work";

  const brand = document.createElement("span");
  brand.textContent = item.brand || "UGC";

  const title = document.createElement("strong");
  title.textContent = item.title || item.brief || "Photo content";

  card.append(image, brand, title);
  return card;
}

function createVideoCard(item) {
  const card = document.createElement("article");
  card.className = "phone-frame reveal is-visible";
  const label = item.title || item.brand || "Video";

  const video = document.createElement("video");
  video.src = item.file_url || item.file;
  video.controls = true;
  video.playsInline = true;
  video.preload = "metadata";

  const caption = document.createElement("small");
  caption.textContent = label;

  card.append(video, caption);
  return card;
}

async function loadUploadedWork() {
  if (!photoWork || !videoWork) return;

  try {
    let items = [];

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from("portfolio_work")
        .select("type, brand, title, brief, file_url, created_at, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      items = data || [];
    } else {
      const response = await fetch("/data/work.json", { cache: "no-store" });
      if (!response.ok) return;
      items = await response.json();
    }

    if (!Array.isArray(items) || items.length === 0) return;

    const photos = items.filter((item) => item.type === "photo");
    const videos = items.filter((item) => item.type === "video");

    if (photos.length) {
      photoWork.querySelectorAll("[data-fallback-work]").forEach((item) => item.remove());
      photos.forEach((item) => photoWork.appendChild(createPhotoCard(item)));
    }

    if (videos.length) {
      videoWork.querySelectorAll("[data-fallback-work]").forEach((item) => item.remove());
      videos.forEach((item) => videoWork.appendChild(createVideoCard(item)));
    }
  } catch {
    // Keep the curated fallback portfolio visible when the site is opened locally.
  }
}

loadUploadedWork();
