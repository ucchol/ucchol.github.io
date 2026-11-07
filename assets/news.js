/* Move entries between recent news and the archive when the page is opened. */
(function () {
  "use strict";

  function eventDate(value) {
    const parts = value.split("-").map(Number);
    // A month-only entry stays recent through the end of its anniversary month.
    return new Date(parts[0], parts[1] - 1,
      parts.length === 3 ? parts[2] : new Date(parts[0], parts[1], 0).getDate());
  }

  function selectNews(entries, view, now = new Date()) {
    const previousYear = now.getFullYear() - 1;
    const anniversaryDay = Math.min(now.getDate(), new Date(previousYear, now.getMonth() + 1, 0).getDate());
    const cutoff = new Date(previousYear, now.getMonth(), anniversaryDay);
    return entries
      .filter(entry => (eventDate(entry.date) < cutoff) === (view === "older"))
      .sort((a, b) => eventDate(b.date) - eventDate(a.date));
  }

  function monthLabel(value) {
    return eventDate(value).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { selectNews, monthLabel };
  }

  if (typeof document === "undefined" || !Array.isArray(window.academicNews)) return;
  for (const list of document.querySelectorAll("[data-news-view]")) {
    const entries = selectNews(window.academicNews, list.dataset.newsView);
    const fragment = document.createDocumentFragment();
    for (const entry of entries) {
      const item = document.createElement("li");
      const time = document.createElement("time");
      time.dateTime = entry.date;
      time.textContent = monthLabel(entry.date);
      const text = document.createElement("p");
      // The data file contains the author's own formatted news text and links.
      text.innerHTML = entry.html;
      item.append(time, text);
      fragment.append(item);
    }
    if (!entries.length) {
      const item = document.createElement("li");
      item.className = "news-empty";
      item.textContent = list.dataset.newsView === "older"
        ? "There are no older news items yet."
        : "There are no updates from the past year. Earlier updates are in Older News.";
      fragment.append(item);
    }
    list.replaceChildren(fragment);
  }
})();
