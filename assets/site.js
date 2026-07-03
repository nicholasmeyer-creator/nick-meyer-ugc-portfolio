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

function setupCarousels() {
  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const track = carousel.querySelector(".carousel-track");
    const previous = carousel.querySelector("[data-carousel-prev]");
    const next = carousel.querySelector("[data-carousel-next]");
    if (!track || !previous || !next) return;

    const updateButtons = () => {
      const maxScroll = track.scrollWidth - track.clientWidth - 4;
      previous.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= maxScroll;
      carousel.classList.toggle("is-scrollable", maxScroll > 4);
    };

    const scrollByItem = (direction) => {
      const items = Array.from(track.children);
      if (!items.length) return;

      const currentLeft = track.scrollLeft;
      const positions = items.map((item) => item.offsetLeft - track.offsetLeft);
      const targetIndex = direction > 0
        ? positions.findIndex((position) => position > currentLeft + 4)
        : positions.reduce((match, position, index) => (position < currentLeft - 4 ? index : match), -1);
      const fallbackIndex = direction > 0 ? items.length - 1 : 0;
      const nextLeft = positions[targetIndex >= 0 ? targetIndex : fallbackIndex];

      track.scrollTo({ left: nextLeft, behavior: reduceMotion ? "auto" : "smooth" });
    };

    previous.addEventListener("click", () => scrollByItem(-1));
    next.addEventListener("click", () => scrollByItem(1));
    track.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);

    updateButtons();
  });
}

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

loadUploadedWork().finally(setupCarousels);
