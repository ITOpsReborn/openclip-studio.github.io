const statusInfo = {
  delivered: { label: "Delivered", icon: "✓" },
  in_progress: { label: "In progress", icon: "↗" },
  upcoming: { label: "Coming up", icon: "○" },
};

const list = document.querySelector("#milestone-list");
const summary = document.querySelector("#status-summary");
const sequenceFill = document.querySelector("#sequence-fill");
const filters = [...document.querySelectorAll("[data-filter]")];
let milestones = [];
let activeFilter = "all";

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function countStatuses(items) {
  return items.reduce(
    (counts, item) => {
      counts[item.status] += 1;
      return counts;
    },
    { delivered: 0, in_progress: 0, upcoming: 0 },
  );
}

function renderSummary(items) {
  const counts = countStatuses(items);
  const cards = [
    { status: "delivered", title: "Delivered", detail: "Capabilities in the codebase" },
    { status: "in_progress", title: "In progress", detail: "Active implementation & validation" },
    { status: "upcoming", title: "Coming up", detail: "Queued by project sequence" },
  ];
  summary.replaceChildren();

  for (const card of cards) {
    const item = makeElement("div", `summary-card summary-${card.status}`);
    item.append(
      makeElement("span", "summary-count", String(counts[card.status])),
      makeElement("span", "summary-title", card.title),
      makeElement("span", "summary-detail", card.detail),
    );
    summary.append(item);
  }

  const deliveredWidth = items.length
    ? (counts.delivered / items.length) * 100
    : 0;
  sequenceFill.style.width = `${deliveredWidth}%`;

  for (const filter of filters) {
    const status = filter.dataset.filter;
    const count = status === "all" ? items.length : counts[status];
    filter.querySelector("[data-count]").textContent = String(count);
  }
}

function appendList(parent, entries, className) {
  if (!entries?.length) return;
  const listElement = makeElement("ul", className);
  for (const entry of entries) {
    listElement.append(makeElement("li", "", entry));
  }
  parent.append(listElement);
}

function createMilestone(item) {
  const state = statusInfo[item.status];
  const article = makeElement("article", `milestone milestone-${item.status}`);
  article.dataset.status = item.status;

  const marker = makeElement("div", "timeline-marker", state.icon);
  marker.setAttribute("aria-hidden", "true");
  const card = makeElement("div", "milestone-card");
  const cardHeader = makeElement("div", "milestone-card-header");
  const phase = makeElement("span", "phase-label", `PHASE ${String(item.phase).padStart(2, "0")}`);
  const timing = makeElement("span", "timing-label", item.timing);
  cardHeader.append(phase, timing);

  const title = makeElement("h3", "milestone-title", item.title);
  const status = makeElement("span", "status-label", state.label);
  status.setAttribute("aria-label", `Status: ${state.label}`);
  const titleRow = makeElement("div", "milestone-title-row");
  titleRow.append(title, status);

  const objective = makeElement("p", "milestone-objective", item.objective);
  card.append(cardHeader, titleRow, objective);

  if (item.validation) {
    const validation = makeElement("p", "validation-note", item.validation);
    card.append(validation);
  }

  const deliverables = makeElement("div", "detail-block");
  deliverables.append(makeElement("h4", "", "What this includes"));
  appendList(deliverables, item.deliverables, "deliverable-list");
  card.append(deliverables);

  if (item.acceptance?.length) {
    const details = makeElement("details", "acceptance-details");
    details.append(makeElement("summary", "", "Acceptance checks"));
    appendList(details, item.acceptance, "acceptance-list");
    card.append(details);
  }

  if (item.milestone) {
    const achievement = makeElement("p", "named-milestone", `★ ${item.milestone}`);
    card.append(achievement);
  }

  article.append(marker, card);
  return article;
}

function renderMilestones() {
  const visible = activeFilter === "all"
    ? milestones
    : milestones.filter((item) => item.status === activeFilter);
  const fragment = document.createDocumentFragment();

  for (const item of visible) {
    fragment.append(createMilestone(item));
  }
  list.replaceChildren(fragment);
  list.setAttribute("aria-busy", "false");
}

function showError() {
  list.replaceChildren(
    makeElement("p", "load-error", "Roadmap data could not be loaded. Refresh the page or view roadmap.json in the project repository."),
  );
  list.setAttribute("aria-busy", "false");
}

for (const filter of filters) {
  filter.addEventListener("click", () => {
    activeFilter = filter.dataset.filter;
    for (const button of filters) {
      const selected = button === filter;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    renderMilestones();
  });
}

fetch("roadmap.json")
  .then((response) => {
    if (!response.ok) throw new Error(`Roadmap request failed: ${response.status}`);
    return response.json();
  })
  .then((data) => {
    if (!Array.isArray(data.milestones) || data.milestones.length === 0) {
      throw new Error("Roadmap data is empty");
    }
    milestones = data.milestones;
    renderSummary(milestones);
    renderMilestones();
  })
  .catch((error) => {
    console.error("Could not render the OpenClip roadmap", error);
    showError();
  });
