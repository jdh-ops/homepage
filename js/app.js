(function () {
  const COL_KEYS = [
    "col_1",
    "col_2",
    "col_3",
    "col_4",
    "col_5",
    "col_6",
    "col_7",
    "col_8",
    "col_9",
    "col_10",
  ];

  const VALID_DISPLAY_KEYS = new Set([...COL_KEYS, "tag"]);
  const DEFAULT_DISPLAY_COLUMNS = ["col_1", "col_5", "col_10", "tag", "col_2"];
  const DEFAULT_COLUMN_WIDTH_PERCENTS = [3, 5, 10, 49, 12, 13, 8];
  const CATEGORIES = ["미분류", "의심", "블랙리스트", "화이트리스트", "무시", "기타"];
  const DEFAULT_CATEGORY = "미분류";
  const STATUSES = ["신고대기", "처리중", "반려", "차단", "철회", "보류", "기타"];
  const DEFAULT_STATUS = "신고대기";

  const cfg = window.APP_CONFIG;
  const statusEl = document.getElementById("status");
  const tbody = document.getElementById("tbody");
  const headerRow = document.getElementById("headerRow");
  const colgroup = document.getElementById("colgroup");
  const selectionInfo = document.getElementById("selectionInfo");
  const filterCol1 = document.getElementById("filterCol1");
  const filterTag = document.getElementById("filterTag");
  const filterCol2From = document.getElementById("filterCol2From");
  const filterCol2To = document.getElementById("filterCol2To");
  const searchInput = document.getElementById("searchInput");
  const btnClearFilters = document.getElementById("btnClearFilters");
  const filterResultCount = document.getElementById("filterResultCount");
  const fileInput = document.getElementById("fileInput");
  const dropZone = document.getElementById("dropZone");
  const dropZoneFileName = document.getElementById("dropZoneFileName");
  const replaceCheck = document.getElementById("replaceOnUpload");
  const btnRefresh = document.getElementById("btnRefresh");
  const btnAddData = document.getElementById("btnAddData");
  const btnUpload = document.getElementById("btnUpload");
  const btnModalClose = document.getElementById("btnModalClose");
  const btnModalCancel = document.getElementById("btnModalCancel");
  const uploadModal = document.getElementById("uploadModal");
  const modalStatus = document.getElementById("modalStatus");
  const uploadResultModal = document.getElementById("uploadResultModal");
  const uploadResultSummary = document.getElementById("uploadResultSummary");
  const uploadResultCategoryList = document.getElementById("uploadResultCategoryList");
  const btnUploadResultClose = document.getElementById("btnUploadResultClose");
  const btnUploadResultOk = document.getElementById("btnUploadResultOk");
  const btnDelete = document.getElementById("btnDelete");
  const btnTagAdd = document.getElementById("btnTagAdd");
  const btnCategoryBulk = document.getElementById("btnCategoryBulk");
  const btnReportSubmit = document.getElementById("btnReportSubmit");
  const btnDataView = document.getElementById("btnDataView");
  const dataViewModal = document.getElementById("dataViewModal");
  const dataViewModalInfo = document.getElementById("dataViewModalInfo");
  const dataViewModalStatus = document.getElementById("dataViewModalStatus");
  const dataViewHead = document.getElementById("dataViewHead");
  const dataViewBody = document.getElementById("dataViewBody");
  const btnDataViewModalClose = document.getElementById("btnDataViewModalClose");
  const btnDataViewModalCancel = document.getElementById("btnDataViewModalCancel");
  const btnDataViewCopyAll = document.getElementById("btnDataViewCopyAll");
  const btnDataViewCopy = document.getElementById("btnDataViewCopy");
  const categoryBulkModal = document.getElementById("categoryBulkModal");
  const categoryBulkModalInfo = document.getElementById("categoryBulkModalInfo");
  const categoryBulkButtons = document.getElementById("categoryBulkButtons");
  const categoryBulkModalStatus = document.getElementById("categoryBulkModalStatus");
  const btnCategoryBulkModalClose = document.getElementById("btnCategoryBulkModalClose");
  const btnCategoryBulkModalCancel = document.getElementById("btnCategoryBulkModalCancel");
  const tagModal = document.getElementById("tagModal");
  const tagModalInfo = document.getElementById("tagModalInfo");
  const tagChipList = document.getElementById("tagChipList");
  const tagInput = document.getElementById("tagInput");
  const btnTagChipAdd = document.getElementById("btnTagChipAdd");
  const tagModalStatus = document.getElementById("tagModalStatus");
  const btnTagModalClose = document.getElementById("btnTagModalClose");
  const btnTagModalCancel = document.getElementById("btnTagModalCancel");
  const btnTagModalSave = document.getElementById("btnTagModalSave");
  const categoryFiltersEl = document.getElementById("categoryFilters");
  const btnPhaseClassification = document.getElementById("btnPhaseClassification");
  const btnPhaseReport = document.getElementById("btnPhaseReport");
  const categoryBulkModalTitle = document.getElementById("categoryBulkModalTitle");
  const detailModal = document.getElementById("detailModal");
  const detailModalTitle = document.getElementById("detailModalTitle");
  const detailNavPrev = document.getElementById("detailNavPrev");
  const detailNavNext = document.getElementById("detailNavNext");
  const detailImgPrev = document.getElementById("detailImgPrev");
  const detailImgNext = document.getElementById("detailImgNext");
  const detailImage = document.getElementById("detailImage");
  const detailImageEmpty = document.getElementById("detailImageEmpty");
  const detailUrlLink = document.getElementById("detailUrlLink");
  const detailUrlEmpty = document.getElementById("detailUrlEmpty");
  const detailTitle = document.getElementById("detailTitle");
  const detailAuthor = document.getElementById("detailAuthor");
  const detailDate = document.getElementById("detailDate");
  const detailTag = document.getElementById("detailTag");
  const detailMemo = document.getElementById("detailMemo");
  const detailCategoriesEl = document.getElementById("detailCategories");
  const detailModalStatus = document.getElementById("detailModalStatus");
  const btnDetailClose = document.getElementById("btnDetailClose");
  const btnDetailCancel = document.getElementById("btnDetailCancel");
  const btnDetailSave = document.getElementById("btnDetailSave");
  const authorModal = document.getElementById("authorModal");
  const authorModalName = document.getElementById("authorModalName");
  const authorModalPlatform = document.getElementById("authorModalPlatform");
  const authorModalStatus = document.getElementById("authorModalStatus");
  const btnAuthorModalClose = document.getElementById("btnAuthorModalClose");
  const btnAuthorModalCancel = document.getElementById("btnAuthorModalCancel");
  const btnAuthorBlacklist = document.getElementById("btnAuthorBlacklist");
  const btnAuthorWhitelist = document.getElementById("btnAuthorWhitelist");
  const btnAuthorIgnore = document.getElementById("btnAuthorIgnore");
  const btnAuthorReset = document.getElementById("btnAuthorReset");

  const ACCEPT_EXT = [".xlsx", ".xls", ".csv"];
  const AUTHOR_LIST_CATEGORIES = ["블랙리스트", "화이트리스트", "무시"];

  /** 플랫폼(col_1) → 업로드 시 meta.tag */
  const PLATFORM_TAG_MAP = {
    google_com: "포털사이트",
    youtube_us: "SNS",
    naver_band_kr: "SNS",
    tiktok_cn: "SNS",
    coupang_kr: "오픈마켓",
    "11st_kr": "오픈마켓",
    gmarket_kr: "오픈마켓",
    naver_kr: "포털사이트",
    instagram_us: "SNS",
    facebook_us: "SNS",
  };
  const authorModalActionButtons = () =>
    [btnAuthorBlacklist, btnAuthorWhitelist, btnAuthorIgnore, btnAuthorReset].filter(Boolean);

  let supabase = null;
  let dragDepth = 0;
  let activePhase = "classification";
  let activeListFilter = "전체";
  let listCounts = { 전체: 0 };
  let allLoadedRows = [];
  let tagModalTargetIds = [];
  let tagModalWorkingTags = [];
  let categoryBulkTargetIds = [];
  let authorModalAuthorName = "";
  let authorModalPlatformValue = "";
  let sortColumn = null;
  let sortDirection = null;
  let displayedRows = [];
  let detailIndex = -1;
  let detailImageIndex = 0;
  let detailSnapshot = "";
  let detailDraft = { category: DEFAULT_CATEGORY, status: "" };
  /** 상세 모달에서 분류가 바뀌었으면 닫을 때만 표 전체 새로고침 */
  let detailCategoryRefreshPending = false;
  let dataViewRows = [];
  let dataViewSelectedColKeys = new Set();

  function colNumFromKey(key) {
    const n = parseInt(String(key).replace("col_", ""), 10);
    return Number.isFinite(n) ? n : 0;
  }

  const COLUMN_LABELS = {
    col_1: "플랫폼",
    col_2: "수집일",
    col_3: "키워드",
    col_4: "URL",
    col_5: "제목",
    col_6: "글번호",
    col_7: "이미지 주소",
    col_8: "작성자 코드",
    col_9: "작성자 페이지",
    col_10: "작성자",
    tag: "태그",
  };

  function labelForColumn(key) {
    if (COLUMN_LABELS[key]) return COLUMN_LABELS[key];
    return `열 ${colNumFromKey(key)}`;
  }

  function getDataViewColumns() {
    return [
      { key: "id", label: "ID" },
      ...COL_KEYS.map((key) => ({ key, label: labelForColumn(key) })),
      { key: "category", label: "분류", meta: true },
      { key: "status", label: "상태", meta: true },
      { key: "tag", label: "태그", meta: true },
      { key: "memo", label: "메모", meta: true },
    ];
  }

  function getDisplayColumns() {
    const keys = Array.isArray(cfg?.displayColumns)
      ? cfg.displayColumns.filter((k) => VALID_DISPLAY_KEYS.has(k))
      : DEFAULT_DISPLAY_COLUMNS;
    const unique = [...new Set(keys.length ? keys : DEFAULT_DISPLAY_COLUMNS)];
    return unique.map((key) => ({
      key,
      label: labelForColumn(key),
      type: key === "col_2" ? "date" : undefined,
    }));
  }

  const DISPLAY_COLUMNS = getDisplayColumns();

  function getTableColumns() {
    return [
      { key: "_check", label: "", type: "checkbox" },
      { key: "id", label: "ID" },
      ...DISPLAY_COLUMNS,
    ];
  }

  const TABLE_COLUMNS = getTableColumns();
  const TABLE_COLUMN_COUNT = TABLE_COLUMNS.length;

  function getColumnWidthPercents() {
    const raw = cfg?.columnWidthPercents;
    const fallback =
      DEFAULT_COLUMN_WIDTH_PERCENTS.length === TABLE_COLUMN_COUNT
        ? DEFAULT_COLUMN_WIDTH_PERCENTS
        : [5, ...DISPLAY_COLUMNS.map(() => Math.floor(95 / DISPLAY_COLUMNS.length))];

    if (!Array.isArray(raw) || raw.length !== TABLE_COLUMN_COUNT) {
      return normalizePercents(fallback.slice(0, TABLE_COLUMN_COUNT));
    }
    return normalizePercents(raw.map((n) => Number(n)).filter((n) => n > 0));
  }

  function normalizePercents(values) {
    const sum = values.reduce((a, b) => a + b, 0);
    if (!sum) return values.map(() => 100 / values.length);
    return values.map((v) => (v / sum) * 100);
  }

  function applyWidthPercents(percents) {
    const cols = colgroup.querySelectorAll("col");
    const ths = headerRow.querySelectorAll("th");
    percents.forEach((pct, i) => {
      const width = `${pct}%`;
      if (cols[i]) cols[i].style.width = width;
      if (ths[i]) ths[i].style.width = width;
    });
  }

  function buildTableChrome() {
    colgroup.innerHTML = "";
    headerRow.innerHTML = "";

    const percents = getColumnWidthPercents();

    TABLE_COLUMNS.forEach((col, index) => {
      const colEl = document.createElement("col");
      colEl.style.width = `${percents[index]}%`;
      colgroup.appendChild(colEl);

      const th = document.createElement("th");
      if (col.key === "id") th.classList.add("num");
      if (col.type === "checkbox") th.classList.add("col-check");
      if (col.key === "tag") th.classList.add("tag-cell");
      if (col.type === "date") th.classList.add("date-cell");
      th.style.width = `${percents[index]}%`;

      if (col.type === "checkbox") {
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = "checkSelectAll";
        cb.title = "전체 선택";
        cb.addEventListener("change", onSelectAllChange);
        th.appendChild(cb);
      } else {
        th.classList.add("sortable");
        th.dataset.sortKey = col.key;
        th.title = "클릭: 오름차순 → 내림차순 → 초기화";

        const label = document.createElement("span");
        label.className = "th-label";
        label.textContent = col.label;
        const indicator = document.createElement("span");
        indicator.className = "sort-indicator";
        indicator.setAttribute("aria-hidden", "true");
        label.appendChild(indicator);
        th.appendChild(label);

        th.addEventListener("click", () => onHeaderSort(col.key));
      }

      headerRow.appendChild(th);
    });

    applyWidthPercents(percents);
    updateHeaderSortIndicators();
  }

  function getSortValue(row, key) {
    switch (key) {
      case "id":
        return row.id ?? 0;
      case "tag":
        return serializeTags(parseTags(row.meta?.tag ?? row.tag)) ?? "";
      case "col_2": {
        const d = parseCol2Date(row.col_2);
        return d ? d.getTime() : null;
      }
      default:
        return row[key] ?? "";
    }
  }

  function compareSortValues(a, b, direction) {
    const mul = direction === "asc" ? 1 : -1;
    const aEmpty = a === null || a === "";
    const bEmpty = b === null || b === "";
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    if (typeof a === "number" && typeof b === "number") {
      return (a - b) * mul;
    }
    return String(a).localeCompare(String(b), "ko", { numeric: true }) * mul;
  }

  function sortRows(rows) {
    if (!sortColumn || !sortDirection) {
      return [...rows].sort((a, b) => a.id - b.id);
    }
    return [...rows].sort((a, b) =>
      compareSortValues(
        getSortValue(a, sortColumn),
        getSortValue(b, sortColumn),
        sortDirection,
      ),
    );
  }

  function updateHeaderSortIndicators() {
    headerRow.querySelectorAll("th.sortable").forEach((th) => {
      const key = th.dataset.sortKey;
      th.classList.remove("sorted-asc", "sorted-desc");
      const indicator = th.querySelector(".sort-indicator");
      if (!indicator) return;

      if (key === sortColumn && sortDirection === "asc") {
        th.classList.add("sorted-asc");
        indicator.textContent = "▲";
      } else if (key === sortColumn && sortDirection === "desc") {
        th.classList.add("sorted-desc");
        indicator.textContent = "▼";
      } else {
        indicator.textContent = "";
      }
    });
  }

  function onHeaderSort(columnKey) {
    if (sortColumn !== columnKey) {
      sortColumn = columnKey;
      sortDirection = "asc";
    } else if (sortDirection === "asc") {
      sortDirection = "desc";
    } else {
      sortColumn = null;
      sortDirection = null;
    }
    updateHeaderSortIndicators();
    applyClientFilters();
  }

  /** 엑셀 열2: 2026-06-02_134333 → 2026-06-02 */
  function normalizeCol2Input(value) {
    if (value == null || value === "") return null;
    let s = String(value).trim();
    if (!s) return null;
    const under = s.indexOf("_");
    if (under > 0) s = s.slice(0, under).trim();
    return s || null;
  }

  function parseCol2Date(value) {
    const normalized = normalizeCol2Input(value);
    if (normalized == null) return null;
    const s = normalized;
    if (!s) return null;

    if (/^\d+(\.\d+)?$/.test(s)) {
      const serial = parseFloat(s);
      if (serial > 20000 && serial < 100000) {
        const utc = (serial - 25569) * 86400 * 1000;
        const d = new Date(utc);
        if (!Number.isNaN(d.getTime())) return d;
      }
    }

    const dateStr = s.replace(/\./g, "-").replace(/\//g, "-");
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function formatCol2Date(value) {
    const d = parseCol2Date(value);
    if (!d) return value == null || String(value).trim() === "" ? "" : String(value);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  function parseTags(tagStr) {
    if (tagStr == null || String(tagStr).trim() === "") return [];
    return [
      ...new Set(
        String(tagStr)
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ];
  }

  function serializeTags(tags) {
    if (!tags.length) return null;
    return tags.join(", ");
  }

  function normAuthor(value) {
    return value == null ? "" : String(value).trim();
  }

  function normPlatform(value) {
    return value == null ? "" : String(value).trim();
  }

  function normCol4Url(value) {
    if (value == null) return null;
    const s = String(value).trim();
    return s || null;
  }

  function rowMatchesAuthorPlatform(row, author, platform) {
    return normAuthor(row.col_10) === author && normPlatform(row.col_1) === platform;
  }

  function isReportPhase() {
    return activePhase === "report";
  }

  function getPhaseMetaValues() {
    return isReportPhase() ? STATUSES : CATEGORIES;
  }

  function getPhaseMetaField() {
    return isReportPhase() ? "status" : "category";
  }

  function isStatusEmpty(value) {
    return value == null || String(value).trim() === "";
  }

  function rowInActivePhase(row) {
    const empty = isStatusEmpty(row.meta?.status);
    return isReportPhase() ? !empty : empty;
  }

  function normalizeStatus(value) {
    const s = value == null ? "" : String(value).trim();
    if (!s) return "";
    return STATUSES.includes(s) ? s : "기타";
  }

  function updatePhaseToolbarUi() {
    if (btnPhaseClassification) {
      btnPhaseClassification.classList.toggle("active", !isReportPhase());
    }
    if (btnPhaseReport) {
      btnPhaseReport.classList.toggle("active", isReportPhase());
    }
    if (btnCategoryBulk) {
      btnCategoryBulk.textContent = isReportPhase() ? "상태" : "분류";
    }
    if (categoryFiltersEl) {
      categoryFiltersEl.setAttribute(
        "aria-label",
        isReportPhase() ? "상태 필터" : "분류 필터",
      );
    }
    if (categoryBulkModalTitle) {
      categoryBulkModalTitle.textContent = isReportPhase() ? "상태 변경" : "분류 변경";
    }
    if (btnReportSubmit) {
      btnReportSubmit.hidden = isReportPhase();
    }
  }

  async function setActivePhase(phase) {
    if (phase !== "classification" && phase !== "report") return;
    if (activePhase === phase) return;
    activePhase = phase;
    activeListFilter = "전체";
    closeCategoryBulkModal();
    closeDetailModal();
    updatePhaseToolbarUi();
    await refreshDashboard();
  }

  function parseImageUrls(value) {
    if (value == null) return [];
    const s = String(value).trim();
    if (!s) return [];
    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map((u) => String(u).trim()).filter(Boolean);
        }
      } catch {
        /* ignore */
      }
    }
    return s
      .split(/[,|\n]+/)
      .map((u) => u.trim())
      .filter(Boolean);
  }

  function fillSelectOptions(selectEl, options, emptyLabel) {
    const current = selectEl.value;
    selectEl.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = emptyLabel || "전체";
    selectEl.appendChild(optAll);
    for (const { value, label } of options) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      selectEl.appendChild(opt);
    }
    if ([...selectEl.options].some((o) => o.value === current)) {
      selectEl.value = current;
    }
  }

  function col2DayIso(value) {
    const d = parseCol2Date(value);
    return d ? d.toISOString().slice(0, 10) : null;
  }

  function rowInCol2DateRange(row, fromIso, toIso) {
    if (!fromIso && !toIso) return true;
    const day = col2DayIso(row.col_2);
    if (!day) return false;
    if (fromIso && day < fromIso) return false;
    if (toIso && day > toIso) return false;
    return true;
  }

  function getCol2FilterRange() {
    let from = filterCol2From.value || "";
    let to = filterCol2To.value || "";
    if (from && to && from > to) {
      [from, to] = [to, from];
      filterCol2From.value = from;
      filterCol2To.value = to;
    }
    return { from, to };
  }

  function populateFilterOptions(rows) {
    const col1Set = new Set();
    const tagSet = new Set();

    for (const row of rows) {
      const v1 = row.col_1 == null ? "" : String(row.col_1).trim();
      if (v1) col1Set.add(v1);

      for (const t of parseTags(row.meta?.tag)) tagSet.add(t);
    }

    const col1Opts = [...col1Set].sort((a, b) => a.localeCompare(b, "ko")).map((v) => ({
      value: v,
      label: v,
    }));
    const tagOpts = [...tagSet].sort((a, b) => a.localeCompare(b, "ko")).map((v) => ({
      value: v,
      label: v,
    }));
    if (rows.some((r) => !String(r.meta?.tag ?? "").trim())) {
      tagOpts.unshift({ value: "__empty__", label: "(태그 없음)" });
    }

    fillSelectOptions(filterCol1, col1Opts);
    fillSelectOptions(filterTag, tagOpts);
  }

  function rowMatchesSearch(row, query) {
    const parts = [
      row.id,
      row.col_1,
      row.col_2,
      formatCol2Date(row.col_2),
      row.col_5,
      row.col_10,
      row.meta?.tag,
      row.meta?.category,
      row.meta?.status,
      row.meta?.memo,
    ];
    const haystack = parts
      .filter((p) => p != null && String(p).trim() !== "")
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  }

  function applyClientFilters() {
    let rows = allLoadedRows;

    const v1 = filterCol1.value;
    const vTag = filterTag.value;
    const { from: col2From, to: col2To } = getCol2FilterRange();
    const q = searchInput.value.trim().toLowerCase();

    if (v1) {
      rows = rows.filter((r) => String(r.col_1 ?? "").trim() === v1);
    }
    if (vTag) {
      if (vTag === "__empty__") {
        rows = rows.filter((r) => parseTags(r.meta?.tag).length === 0);
      } else {
        rows = rows.filter((r) => parseTags(r.meta?.tag).includes(vTag));
      }
    }
    if (col2From || col2To) {
      rows = rows.filter((r) => rowInCol2DateRange(r, col2From, col2To));
    }
    if (q) {
      rows = rows.filter((r) => rowMatchesSearch(r, q));
    }

    rows = rows.filter(rowInActivePhase);

    rows = sortRows(rows);
    displayedRows = rows;
    renderRows(rows);
    filterResultCount.textContent = `${rows.length}건 표시`;
  }

  function clearFilters() {
    filterCol1.value = "";
    filterTag.value = "";
    filterCol2From.value = "";
    filterCol2To.value = "";
    searchInput.value = "";
    applyClientFilters();
  }

  function getSelectedIds() {
    return Array.from(tbody.querySelectorAll(".row-check:checked")).map((el) =>
      Number(el.dataset.id),
    );
  }

  function updateSelectionUi() {
    const ids = getSelectedIds();
    const n = ids.length;
    selectionInfo.textContent = `${n}건 선택`;
    btnDelete.disabled = n === 0;
    btnTagAdd.disabled = n === 0;
    btnCategoryBulk.disabled = n === 0;
    if (btnReportSubmit && !isReportPhase()) {
      btnReportSubmit.disabled = n === 0;
    }
    if (btnDataView) btnDataView.disabled = n === 0;

    tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
      const id = Number(tr.dataset.id);
      tr.classList.toggle("row-selected", ids.includes(id));
    });

    const allChecks = tbody.querySelectorAll(".row-check");
    const headerCheck = headerRow.querySelector("#checkSelectAll");
    if (headerCheck && allChecks.length) {
      headerCheck.checked = n > 0 && n === allChecks.length;
      headerCheck.indeterminate = n > 0 && n < allChecks.length;
    } else if (headerCheck) {
      headerCheck.checked = false;
      headerCheck.indeterminate = false;
    }
  }

  function onSelectAllChange(e) {
    const checked = e.target.checked;
    tbody.querySelectorAll(".row-check").forEach((cb) => {
      cb.checked = checked;
    });
    updateSelectionUi();
  }

  function onRowCheckChange() {
    updateSelectionUi();
  }

  function getMetaFromRow(row) {
    let meta = row.dataset_record_meta;
    if (Array.isArray(meta)) meta = meta[0];
    if (!meta) {
      return { category: DEFAULT_CATEGORY, status: null, tag: null, memo: null };
    }
    return meta;
  }

  function normalizeRecord(row) {
    const meta = getMetaFromRow(row);
    const out = { id: row.id, meta };
    for (const col of DISPLAY_COLUMNS) {
      if (col.key !== "tag") out[col.key] = row[col.key];
    }
    out.col_4 = row.col_4;
    out.col_7 = row.col_7;
    out.tag = meta.tag;
    return out;
  }

  function col4OpenUrl(value) {
    const u = normCol4Url(value);
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    return `https://${u}`;
  }

  function cellHtml(col, row) {
    if (col.key === "id") {
      return `<td class="num">${escapeHtml(row.id)}</td>`;
    }
    if (col.key === "col_1") {
      const platform = row[col.key] == null ? "" : String(row[col.key]).trim();
      const url = col4OpenUrl(row.col_4);
      if (!platform) {
        return '<td class="cell-platform"><span class="tag-empty">—</span></td>';
      }
      if (!url) {
        return `<td class="cell-platform">${escapeHtml(platform)}</td>`;
      }
      return `<td class="cell-platform"><a class="btn-platform-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(platform)}</a></td>`;
    }
    if (col.key === "col_5") {
      const title = row[col.key] == null ? "" : String(row[col.key]);
      if (!title.trim()) {
        return '<td class="cell-title"><span class="tag-empty">—</span></td>';
      }
      return `<td class="cell-title"><button type="button" class="btn-title-link">${escapeHtml(title)}</button></td>`;
    }
    if (col.key === "col_10") {
      const author = row[col.key] == null ? "" : String(row[col.key]).trim();
      if (!author) {
        return '<td class="cell-author"><span class="tag-empty">—</span></td>';
      }
      const platform = normPlatform(row.col_1);
      return `<td class="cell-author"><button type="button" class="btn-author-link" data-author="${escapeHtml(author)}" data-platform="${escapeHtml(platform)}">${escapeHtml(author)}</button></td>`;
    }
    if (col.key === "tag") {
      const tags = parseTags(row.meta?.tag ?? row.tag);
      if (!tags.length) {
        return '<td class="tag-cell"><span class="tag-empty">—</span></td>';
      }
      const badges = tags
        .map((t) => `<span class="tag-badge">${escapeHtml(t)}</span>`)
        .join("");
      return `<td class="tag-cell"><span class="tag-badges">${badges}</span></td>`;
    }
    if (col.type === "date" || col.key === "col_2") {
      const formatted = formatCol2Date(row[col.key]);
      if (!formatted) {
        return '<td class="date-cell"><span class="tag-empty">—</span></td>';
      }
      return `<td class="date-cell">${escapeHtml(formatted)}</td>`;
    }
    return `<td>${escapeHtml(row[col.key])}</td>`;
  }

  function renderListFilters() {
    categoryFiltersEl.innerHTML = "";
    const values = getPhaseMetaValues();
    const items = ["전체", ...values];
    for (const item of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-btn" + (item === activeListFilter ? " active" : "");
      btn.textContent = `${item} (${listCounts[item] ?? 0})`;
      btn.addEventListener("click", async () => {
        activeListFilter = item;
        renderListFilters();
        await loadData();
      });
      categoryFiltersEl.appendChild(btn);
    }
  }

  async function loadListCounts() {
    const { count: total, error: countErr } = await supabase
      .from("dataset_records")
      .select("*", { count: "exact", head: true });

    if (countErr) {
      setStatus("집계 실패: " + countErr.message, "error");
      return;
    }

    const { data: metaRows, error: metaErr } = await supabase
      .from("dataset_record_meta")
      .select("category, status");

    if (metaErr) {
      setStatus(
        "집계 실패: " +
          metaErr.message +
          " (SQL: 20250603000004_dataset_record_meta.sql 실행)",
        "error",
      );
      return;
    }

    const values = getPhaseMetaValues();
    listCounts = { 전체: 0 };
    for (const v of values) listCounts[v] = 0;

    let phaseTotal = 0;
    if (isReportPhase()) {
      for (const row of metaRows || []) {
        if (isStatusEmpty(row.status)) continue;
        const st = normalizeStatus(row.status);
        if (!st) continue;
        listCounts[st]++;
        phaseTotal++;
      }
    } else {
      for (const row of metaRows || []) {
        if (!isStatusEmpty(row.status)) continue;
        const cat = row.category;
        if (CATEGORIES.includes(cat)) listCounts[cat]++;
        else listCounts["기타"]++;
        phaseTotal++;
      }
      const orphan = (total ?? 0) - (metaRows || []).length;
      if (orphan > 0) {
        listCounts[DEFAULT_CATEGORY] += orphan;
        phaseTotal += orphan;
      }
    }

    listCounts["전체"] = phaseTotal;
    renderListFilters();
  }

  async function deleteSelected() {
    const ids = getSelectedIds();
    if (!ids.length) {
      setStatus("삭제할 행을 선택하세요.", "error");
      return;
    }
    if (!confirm(`선택한 ${ids.length}건을 삭제할까요?`)) return;

    btnDelete.disabled = true;
    setStatus("삭제 중…", "info");
    const { error } = await supabase.from("dataset_records").delete().in("id", ids);
    btnDelete.disabled = false;

    if (error) {
      setStatus("삭제 실패: " + error.message, "error");
      return;
    }
    setStatus(`${ids.length}건 삭제 완료`, "ok");
    await refreshDashboard();
  }

  function setTagModalStatus(message, type) {
    tagModalStatus.textContent = message;
    tagModalStatus.className = "modal-status" + (type ? " " + type : "");
  }

  function setAuthorModalStatus(message, type) {
    authorModalStatus.textContent = message;
    authorModalStatus.className = "modal-status" + (type ? " " + type : "");
  }

  function openAuthorModal(authorName, platform) {
    const name = normAuthor(authorName);
    if (!name) return;
    const plat = normPlatform(platform);
    authorModalAuthorName = name;
    authorModalPlatformValue = plat;
    authorModalName.textContent = name;
    if (authorModalPlatform) {
      authorModalPlatform.textContent = plat
        ? `플랫폼: ${plat}`
        : "플랫폼: (없음)";
    }
    setAuthorModalStatus("");
    authorModal.classList.add("open");
  }

  function setAuthorModalButtonsDisabled(disabled) {
    authorModalActionButtons().forEach((btn) => {
      btn.disabled = disabled;
    });
  }

  function closeAuthorModal() {
    authorModal.classList.remove("open");
    authorModalAuthorName = "";
    authorModalPlatformValue = "";
    setAuthorModalStatus("");
    setAuthorModalButtonsDisabled(false);
  }

  function setDetailAuthorDisplay(author, platform) {
    const name = normAuthor(author);
    const plat = normPlatform(platform);
    if (!name) {
      detailAuthor.textContent = "—";
      detailAuthor.classList.add("is-empty");
      detailAuthor.disabled = true;
      delete detailAuthor.dataset.platform;
      return;
    }
    detailAuthor.textContent = name;
    detailAuthor.dataset.platform = plat;
    detailAuthor.classList.remove("is-empty");
    detailAuthor.disabled = false;
  }

  function patchAuthorCategoryInCache(authorName, platform, category) {
    const author = normAuthor(authorName);
    const plat = normPlatform(platform);
    const touch = (row) => {
      if (!rowMatchesAuthorPlatform(row, author, plat)) return;
      row.meta = { ...row.meta, category };
    };
    allLoadedRows.forEach(touch);
    displayedRows.forEach(touch);
  }

  async function fetchRecordIdsByAuthorPlatform(authorName, platform) {
    const author = normAuthor(authorName);
    const plat = normPlatform(platform);
    const { data, error } = await supabase
      .from("dataset_records")
      .select("id, col_1, col_10");
    if (error) throw error;
    return (data || [])
      .filter((r) => rowMatchesAuthorPlatform(r, author, plat))
      .map((r) => r.id);
  }

  async function applyAuthorCategoryClient(authorName, platform, category) {
    const author = normAuthor(authorName);
    const plat = normPlatform(platform);
    const now = new Date().toISOString();

    const { error: authorErr } = await supabase.from("dataset_authors").upsert(
      {
        platform: plat,
        author_name: author,
        list_type: category,
        updated_at: now,
      },
      { onConflict: "platform,author_name" },
    );
    if (authorErr) throw authorErr;

    const ids = await fetchRecordIdsByAuthorPlatform(author, plat);
    if (!ids.length) return 0;

    const chunkSize = 200;
    let updated = 0;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { error: updateErr } = await supabase
        .from("dataset_record_meta")
        .update({ category, updated_at: now })
        .in("record_id", chunk);
      if (updateErr) {
        const upserts = chunk.map((record_id) => ({
          record_id,
          category,
          updated_at: now,
        }));
        const { error: upsertErr } = await supabase
          .from("dataset_record_meta")
          .upsert(upserts, { onConflict: "record_id" });
        if (upsertErr) throw upsertErr;
      }
      updated += chunk.length;
    }
    return updated;
  }

  async function applyAuthorCategory(authorName, platform, category) {
    if (!AUTHOR_LIST_CATEGORIES.includes(category)) return;
    const author = normAuthor(authorName);
    const plat = normPlatform(platform);
    if (!author) return;

    setAuthorModalButtonsDisabled(true);
    setAuthorModalStatus("적용 중…", "info");

    let affected = 0;
    const { data, error } = await supabase.rpc("apply_author_category", {
      p_author_name: author,
      p_platform: plat,
      p_category: category,
    });

    if (error) {
      const rpcMissing =
        error.code === "PGRST202" ||
        /apply_author_category/i.test(error.message || "") ||
        /function/i.test(error.message || "") ||
        /arguments/i.test(error.message || "");
      if (!rpcMissing) {
        setAuthorModalButtonsDisabled(false);
        setAuthorModalStatus(
          "적용 실패: " +
            error.message +
            " (20250603000008 SQL 실행)",
          "error",
        );
        return;
      }
      try {
        affected = await applyAuthorCategoryClient(author, plat, category);
      } catch (clientErr) {
        setAuthorModalButtonsDisabled(false);
        setAuthorModalStatus(clientErr?.message || String(clientErr), "error");
        return;
      }
    } else {
      affected = typeof data === "number" ? data : Number(data) || 0;
    }

    patchAuthorCategoryInCache(author, plat, category);
    const detailRecordId =
      detailModal.classList.contains("open") && detailIndex >= 0
        ? displayedRows[detailIndex]?.id
        : null;
    if (detailModal.classList.contains("open") && detailIndex >= 0) {
      const current = displayedRows[detailIndex];
      if (current && rowMatchesAuthorPlatform(current, author, plat)) {
        detailDraft.category = category;
        renderDetailCategories();
        detailSnapshot = getDetailSnapshot();
      }
    }
    setAuthorModalButtonsDisabled(false);
    closeAuthorModal();
    const scopeLabel = plat ? `「${plat}」·「${author}」` : `「${author}」(플랫폼 없음)`;
    setStatus(`${scopeLabel} → ${category} (${affected}건 반영)`, "ok");
    await refreshTableAfterCategoryChange();
    syncDetailModalAfterTableRefresh(detailRecordId);
  }

  async function resetAuthorListClient(author, platform) {
    const { error } = await supabase
      .from("dataset_authors")
      .delete()
      .eq("platform", platform)
      .eq("author_name", author);
    if (error) throw error;
    return true;
  }

  async function resetAuthorList(authorName, platform) {
    const author = normAuthor(authorName);
    const plat = normPlatform(platform);
    if (!author) return;

    const scopeLabel = plat ? `「${plat}」·「${author}」` : `「${author}」(플랫폼 없음)`;
    if (
      !confirm(
        `${scopeLabel} 작성자 관리 등록을 초기화(삭제)할까요?\n(데이터 분류 값은 그대로 유지됩니다.)`,
      )
    ) {
      return;
    }

    setAuthorModalButtonsDisabled(true);
    setAuthorModalStatus("삭제 중…", "info");

    let deleted = false;
    const { data, error } = await supabase.rpc("reset_author_list", {
      p_author_name: author,
      p_platform: plat,
    });

    if (error) {
      const rpcMissing =
        error.code === "PGRST202" ||
        /reset_author_list/i.test(error.message || "") ||
        /function/i.test(error.message || "");
      if (!rpcMissing) {
        setAuthorModalButtonsDisabled(false);
        setAuthorModalStatus(
          "삭제 실패: " + error.message + " (20250603000009 SQL 실행)",
          "error",
        );
        return;
      }
      try {
        await resetAuthorListClient(author, plat);
        deleted = true;
      } catch (clientErr) {
        setAuthorModalButtonsDisabled(false);
        setAuthorModalStatus(clientErr?.message || String(clientErr), "error");
        return;
      }
    } else {
      deleted = data === true || data === 1;
    }

    setAuthorModalButtonsDisabled(false);
    closeAuthorModal();
    setStatus(
      deleted
        ? `${scopeLabel} 작성자 관리 초기화 완료`
        : `${scopeLabel} 등록된 작성자 관리 없음`,
      deleted ? "ok" : "info",
    );
  }

  function collectTagsForRows(ids) {
    const merged = new Set();
    for (const id of ids) {
      const row = allLoadedRows.find((r) => r.id === id);
      if (row) parseTags(row.meta?.tag).forEach((t) => merged.add(t));
    }
    return [...merged].sort((a, b) => a.localeCompare(b, "ko"));
  }

  function renderTagModalChips() {
    tagChipList.innerHTML = "";
    tagChipList.classList.remove("empty-hint");

    if (!tagModalWorkingTags.length) {
      tagChipList.textContent = "태그 없음";
      tagChipList.classList.add("empty-hint");
      return;
    }

    for (const tag of tagModalWorkingTags) {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      const label = document.createElement("span");
      label.textContent = tag;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", `${tag} 삭제`);
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => {
        tagModalWorkingTags = tagModalWorkingTags.filter((t) => t !== tag);
        renderTagModalChips();
      });
      chip.appendChild(label);
      chip.appendChild(removeBtn);
      tagChipList.appendChild(chip);
    }
  }

  function openTagModal() {
    const ids = getSelectedIds();
    if (!ids.length) {
      setStatus("태그를 편집할 행을 선택하세요.", "error");
      return;
    }

    tagModalTargetIds = ids;
    tagModalWorkingTags = collectTagsForRows(ids);
    tagModalInfo.textContent = `선택 ${ids.length}건 · 완료 시 동일한 태그 목록이 적용됩니다.`;
    tagInput.value = "";
    setTagModalStatus("");
    renderTagModalChips();
    tagModal.classList.add("open");
    tagInput.focus();
  }

  function closeTagModal() {
    tagModal.classList.remove("open");
    tagModalTargetIds = [];
    tagModalWorkingTags = [];
    tagInput.value = "";
    setTagModalStatus("");
  }

  function addTagFromInput() {
    const value = tagInput.value.trim();
    if (!value) return;
    if (!tagModalWorkingTags.includes(value)) {
      tagModalWorkingTags.push(value);
      tagModalWorkingTags.sort((a, b) => a.localeCompare(b, "ko"));
      renderTagModalChips();
    }
    tagInput.value = "";
    tagInput.focus();
  }

  function setCategoryBulkModalStatus(message, type) {
    categoryBulkModalStatus.textContent = message;
    categoryBulkModalStatus.className = "modal-status" + (type ? " " + type : "");
  }

  function renderCategoryBulkButtons() {
    categoryBulkButtons.innerHTML = "";
    for (const value of getPhaseMetaValues()) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-btn";
      btn.textContent = value;
      btn.addEventListener("click", () => {
        applyBulkMeta(value).catch((err) => {
          setCategoryBulkModalStatus(err?.message || String(err), "error");
        });
      });
      categoryBulkButtons.appendChild(btn);
    }
  }

  function openCategoryBulkModal() {
    const ids = getSelectedIds();
    const label = isReportPhase() ? "상태" : "분류";
    if (!ids.length) {
      setStatus(`${label}를 변경할 행을 선택하세요.`, "error");
      return;
    }
    categoryBulkTargetIds = ids;
    categoryBulkModalInfo.textContent =
      `선택 ${ids.length}건 · ${label}를 누르면 바로 적용됩니다.`;
    setCategoryBulkModalStatus("");
    renderCategoryBulkButtons();
    categoryBulkModal.classList.add("open");
  }

  function closeCategoryBulkModal() {
    categoryBulkModal.classList.remove("open");
    categoryBulkTargetIds = [];
    setCategoryBulkModalStatus("");
    categoryBulkButtons.innerHTML = "";
  }

  function patchMetaInCache(ids, field, value) {
    const idSet = new Set(ids);
    const touch = (row) => {
      if (!idSet.has(row.id)) return;
      row.meta = { ...row.meta, [field]: value };
    };
    allLoadedRows.forEach(touch);
    displayedRows.forEach(touch);
  }

  async function applyBulkMeta(value) {
    const values = getPhaseMetaValues();
    const field = getPhaseMetaField();
    const label = isReportPhase() ? "상태" : "분류";
    if (!categoryBulkTargetIds.length || !values.includes(value)) return;

    categoryBulkButtons.querySelectorAll("button").forEach((btn) => {
      btn.disabled = true;
    });
    setCategoryBulkModalStatus("적용 중…", "info");

    const ids = [...categoryBulkTargetIds];
    const now = new Date().toISOString();
    const payload = { [field]: value, updated_at: now };
    const { error } = await supabase
      .from("dataset_record_meta")
      .update(payload)
      .in("record_id", ids);

    if (error) {
      const upserts = ids.map((record_id) => ({
        record_id,
        category: DEFAULT_CATEGORY,
        status: null,
        updated_at: now,
        [field]: value,
      }));
      const { error: upsertErr } = await supabase
        .from("dataset_record_meta")
        .upsert(upserts, { onConflict: "record_id" });
      if (upsertErr) {
        categoryBulkButtons.querySelectorAll("button").forEach((btn) => {
          btn.disabled = false;
        });
        setCategoryBulkModalStatus(
          "적용 실패: " + upsertErr.message + " (20250603000004 SQL 확인)",
          "error",
        );
        return;
      }
    }

    patchMetaInCache(ids, field, value);
    const count = ids.length;
    closeCategoryBulkModal();
    setStatus(`${label} 변경: ${value} (${count}건)`, "ok");
    renderRows(displayedRows);
    await loadListCounts();
  }

  async function saveTagModal() {
    if (!tagModalTargetIds.length) return;

    const tag = serializeTags(tagModalWorkingTags);
    btnTagModalSave.disabled = true;
    setTagModalStatus("저장 중…", "info");

    const { error } = await supabase
      .from("dataset_record_meta")
      .update({ tag, updated_at: new Date().toISOString() })
      .in("record_id", tagModalTargetIds);

    if (error) {
      const upserts = tagModalTargetIds.map((record_id) => ({
        record_id,
        tag,
        category: DEFAULT_CATEGORY,
      }));
      const { error: upsertErr } = await supabase
        .from("dataset_record_meta")
        .upsert(upserts, { onConflict: "record_id" });
      btnTagModalSave.disabled = false;
      if (upsertErr) {
        setTagModalStatus(
          "저장 실패: " + upsertErr.message + " (20250603000004 SQL 확인)",
          "error",
        );
        return;
      }
    }

    const count = tagModalTargetIds.length;
    btnTagModalSave.disabled = false;
    closeTagModal();
    setStatus(tag ? `태그 저장 (${count}건)` : `태그 제거 (${count}건)`, "ok");
    await refreshDashboard();
  }

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = "status" + (type ? " status-" + type : "");
  }

  function setModalStatus(message, type) {
    modalStatus.textContent = message;
    modalStatus.className = "modal-status" + (type ? " " + type : "");
  }

  function openUploadModal() {
    clearSelectedFile();
    replaceCheck.checked = false;
    setModalStatus("");
    uploadModal.classList.add("open");
    dropZone.focus();
  }

  function closeUploadModal() {
    uploadModal.classList.remove("open");
    clearSelectedFile();
    setModalStatus("");
    btnUpload.disabled = false;
  }

  function countCategoriesForInsertedRows(rows, authorMap) {
    const counts = {};
    for (const row of rows) {
      const category = categoryForRecordFromAuthorMap(row, authorMap);
      counts[category] = (counts[category] || 0) + 1;
    }
    return counts;
  }

  function closeUploadResultModal() {
    uploadResultModal?.classList.remove("open");
  }

  function openUploadResultModal(result) {
    if (!uploadResultModal || !uploadResultCategoryList) return;

    const counts = result.categoryCounts || {};
    const parts = [`신규 ${result.inserted}건 추가`];
    if (result.skippedDb > 0) parts.push(`URL 중복 ${result.skippedDb}건 제외`);
    if (result.skippedFile > 0) parts.push(`파일 내 중복 ${result.skippedFile}건 제외`);
    if (result.replaced) parts.push("기존 데이터 교체");
    if (uploadResultSummary) {
      uploadResultSummary.textContent = parts.join(" · ");
    }

    const items = [];
    for (const cat of CATEGORIES) {
      const n = counts[cat];
      if (n > 0) items.push({ cat, n });
    }
    for (const [cat, n] of Object.entries(counts)) {
      if (!CATEGORIES.includes(cat) && n > 0) items.push({ cat, n });
    }

    uploadResultCategoryList.innerHTML = items.length
      ? items
          .map(
            ({ cat, n }) =>
              `<li><span>${escapeHtml(cat)}</span><span class="count">${n}건</span></li>`,
          )
          .join("")
      : `<li><span>분류 정보 없음</span><span class="count">0건</span></li>`;

    uploadResultModal.classList.add("open");
    btnUploadResultOk?.focus();
  }

  function setDetailModalStatus(message, type) {
    detailModalStatus.textContent = message;
    detailModalStatus.className = "modal-status" + (type ? " " + type : "");
  }

  function getDetailSnapshot() {
    const tag = serializeTags(parseTags(detailTag.value)) ?? "";
    const snap = {
      tag,
      memo: detailMemo.value.trim(),
    };
    if (isReportPhase()) {
      snap.status = detailDraft.status;
    } else {
      snap.category = detailDraft.category;
    }
    return JSON.stringify(snap);
  }

  function isDetailDirty() {
    return getDetailSnapshot() !== detailSnapshot;
  }

  function patchRowMeta(id, patch) {
    const update = (row) => {
      if (!row || row.id !== id) return;
      row.meta = { ...row.meta, ...patch };
      if ("tag" in patch) row.tag = patch.tag;
    };
    const cached = allLoadedRows.find((r) => r.id === id);
    update(cached);
    update(displayedRows[detailIndex]);
  }

  function setDataViewModalStatus(message, type) {
    dataViewModalStatus.textContent = message;
    dataViewModalStatus.className = "modal-status" + (type ? " " + type : "");
  }

  function dataViewCellValue(record, col) {
    const meta = getMetaFromRow(record);
    if (col.meta) {
      const v = meta[col.key];
      return v == null ? "" : String(v);
    }
    if (col.key === "id") return record.id == null ? "" : String(record.id);
    if (col.key === "col_2") {
      const formatted = formatCol2Date(record.col_2);
      return formatted || (record.col_2 == null ? "" : String(record.col_2));
    }
    const v = record[col.key];
    return v == null ? "" : String(v);
  }

  function resetDataViewColumnSelection() {
    dataViewSelectedColKeys = new Set();
  }

  function getDataViewSelectedColumns() {
    return getDataViewColumns().filter((c) => dataViewSelectedColKeys.has(c.key));
  }

  function dataViewRowsToMatrix(rows, columns) {
    const cols = columns ?? getDataViewColumns();
    const header = cols.map((c) => c.label);
    const body = rows.map((record) => cols.map((col) => dataViewCellValue(record, col)));
    return { cols, header, body };
  }

  function matrixToTsv(header, body) {
    const escape = (s) => {
      const t = String(s ?? "").replace(/\r?\n/g, " ");
      if (/[\t"\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
      return t;
    };
    const lines = [header.map(escape).join("\t"), ...body.map((row) => row.map(escape).join("\t"))];
    return lines.join("\n");
  }

  function renderDataViewTable(rows) {
    const allCols = getDataViewColumns();
    const { cols, header, body } = dataViewRowsToMatrix(rows, allCols);
    dataViewHead.innerHTML =
      "<tr>" +
      cols
        .map((col, i) => {
          const thCls = col.key === "id" ? ' class="num"' : "";
          const checked = dataViewSelectedColKeys.has(col.key) ? " checked" : "";
          return (
            `<th${thCls}>` +
            `<div class="data-view-col-check-wrap">` +
            `<input type="checkbox" class="data-view-col-check" data-col-key="${escapeHtml(col.key)}"${checked} aria-label="${escapeHtml(header[i])} 열 포함" />` +
            `</div>` +
            `<span class="data-view-col-name">${escapeHtml(header[i])}</span>` +
            `</th>`
          );
        })
        .join("") +
      "</tr>";
    if (!body.length) {
      dataViewBody.innerHTML = `<tr><td colspan="${cols.length}" class="empty">데이터 없음</td></tr>`;
      return;
    }
    dataViewBody.innerHTML = body
      .map(
        (rowCells, ri) =>
          `<tr data-row-index="${ri}">` +
          cols
            .map((col, ci) => {
              const cls = col.key === "id" ? ' class="num"' : "";
              return `<td${cls}>${escapeHtml(rowCells[ci])}</td>`;
            })
            .join("") +
          "</tr>",
      )
      .join("");
  }

  function closeDataViewModal() {
    dataViewModal.classList.remove("open");
    dataViewRows = [];
    dataViewSelectedColKeys = new Set();
    dataViewHead.innerHTML = "";
    dataViewBody.innerHTML = "";
    setDataViewModalStatus("");
  }

  async function copyDataViewToClipboard(columns) {
    if (!dataViewRows.length) return;
    if (!columns.length) {
      setDataViewModalStatus("복사할 열을 체크하세요.", "error");
      return;
    }
    const { header, body } = dataViewRowsToMatrix(dataViewRows, columns);
    const tsv = matrixToTsv(header, body);
    try {
      await navigator.clipboard.writeText(tsv);
      setDataViewModalStatus(
        `클립보드에 복사했습니다 (${columns.length}열 · ${dataViewRows.length}행)`,
        "ok",
      );
    } catch {
      setDataViewModalStatus("복사 실패 — 표에서 직접 드래그·복사해 주세요.", "error");
    }
  }

  async function copyDataViewSelectedColumns() {
    await copyDataViewToClipboard(getDataViewSelectedColumns());
  }

  async function copyDataViewAll() {
    await copyDataViewToClipboard(getDataViewColumns());
  }

  async function openDataViewModal() {
    const ids = getSelectedIds();
    if (!ids.length) {
      setStatus("볼 데이터를 선택하세요.", "error");
      return;
    }

    dataViewModalInfo.textContent = `선택 ${ids.length}건 · 열 체크 후 복사 또는 전체 복사`;
    setDataViewModalStatus("불러오는 중…", "info");
    resetDataViewColumnSelection();
    dataViewHead.innerHTML = "";
    dataViewBody.innerHTML = "";
    dataViewModal.classList.add("open");

    const colList = COL_KEYS.join(", ");
    const { data, error } = await supabase
      .from("dataset_records")
      .select(
        `id, ${colList}, dataset_record_meta (category, status, tag, memo)`,
      )
      .in("id", ids)
      .order("id", { ascending: true });

    if (error) {
      setDataViewModalStatus("조회 실패: " + error.message, "error");
      return;
    }

    dataViewRows = data || [];
    renderDataViewTable(dataViewRows);
    setDataViewModalStatus(`${dataViewRows.length}건`, "ok");
  }

  async function applyReportStatus(recordIds, options = {}) {
    const { silent = false, closeDetail = false } = options;
    const ids = [...new Set(recordIds.filter(Boolean))];
    if (!ids.length) return;

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("dataset_record_meta")
      .update({ status: DEFAULT_STATUS, updated_at: now })
      .in("record_id", ids);

    if (error) {
      const upserts = ids.map((record_id) => ({
        record_id,
        category: DEFAULT_CATEGORY,
        status: DEFAULT_STATUS,
        updated_at: now,
      }));
      const { error: upsertErr } = await supabase
        .from("dataset_record_meta")
        .upsert(upserts, { onConflict: "record_id" });
      if (upsertErr) throw upsertErr;
    }

    patchMetaInCache(ids, "status", DEFAULT_STATUS);
    if (closeDetail) closeDetailModal();
    await refreshDashboard();
    if (!silent) {
      setStatus(`신고 완료: ${ids.length}건 → ${DEFAULT_STATUS}`, "ok");
    }
  }

  function renderDetailCategories() {
    detailCategoriesEl.innerHTML = "";
    const values = getPhaseMetaValues();
    const field = getPhaseMetaField();
    for (const value of values) {
      const btn = document.createElement("button");
      btn.type = "button";
      const active = detailDraft[field] === value;
      btn.className = "category-btn" + (active ? " active" : "");
      btn.textContent = value;
      btn.addEventListener("click", () => {
        detailDraft[field] = value;
        renderDetailCategories();
      });
      detailCategoriesEl.appendChild(btn);
    }
    if (!isReportPhase() && detailIndex >= 0) {
      const row = displayedRows[detailIndex];
      if (row && isStatusEmpty(row.meta?.status)) {
        const reportBtn = document.createElement("button");
        reportBtn.type = "button";
        reportBtn.className = "btn btn-report";
        reportBtn.textContent = "신고하기";
        reportBtn.addEventListener("click", () => {
          applyReportStatus([row.id], { closeDetail: true }).catch((err) => {
            setDetailModalStatus(err?.message || String(err), "error");
          });
        });
        detailCategoriesEl.appendChild(reportBtn);
      }
    }
    detailCategoriesEl.setAttribute(
      "aria-label",
      isReportPhase() ? "상태" : "분류",
    );
  }

  function updateDetailNavState() {
    detailNavPrev.disabled = detailIndex <= 0;
    detailNavNext.disabled = detailIndex < 0 || detailIndex >= displayedRows.length - 1;
  }

  function renderDetailImage() {
    const row = displayedRows[detailIndex];
    if (!row) return;
    const urls = parseImageUrls(row.col_7);
    const multi = urls.length > 1;

    detailImgPrev.disabled = !multi;
    detailImgNext.disabled = !multi;

    if (!urls.length) {
      detailImage.hidden = true;
      detailImage.removeAttribute("src");
      detailImageEmpty.hidden = false;
      return;
    }

    if (detailImageIndex >= urls.length) detailImageIndex = 0;
    if (detailImageIndex < 0) detailImageIndex = urls.length - 1;

    detailImageEmpty.hidden = true;
    detailImage.hidden = false;
    detailImage.alt = `이미지 ${detailImageIndex + 1}/${urls.length}`;
    detailImage.src = urls[detailImageIndex];
  }

  function navigateDetailImage(delta) {
    const row = displayedRows[detailIndex];
    if (!row) return;
    const urls = parseImageUrls(row.col_7);
    if (urls.length <= 1) return;
    detailImageIndex = (detailImageIndex + delta + urls.length) % urls.length;
    renderDetailImage();
  }

  function setDetailUrlDisplay(col4) {
    const href = col4OpenUrl(col4);
    const label = normCol4Url(col4);
    if (!href || !detailUrlLink || !detailUrlEmpty) return;
    detailUrlLink.href = href;
    detailUrlLink.textContent = label || href;
    detailUrlLink.hidden = false;
    detailUrlEmpty.hidden = true;
  }

  function clearDetailUrlDisplay() {
    if (!detailUrlLink || !detailUrlEmpty) return;
    detailUrlLink.hidden = true;
    detailUrlLink.removeAttribute("href");
    detailUrlLink.textContent = "";
    detailUrlEmpty.hidden = false;
  }

  function fillDetailForm() {
    const row = displayedRows[detailIndex];
    if (!row) return;

    detailImageIndex = 0;
    const category = row.meta?.category;
    detailDraft.category = CATEGORIES.includes(category) ? category : DEFAULT_CATEGORY;
    detailDraft.status = isStatusEmpty(row.meta?.status)
      ? ""
      : normalizeStatus(row.meta?.status);

    detailTitle.textContent = row.col_5 == null ? "" : String(row.col_5);
    if (col4OpenUrl(row.col_4)) {
      setDetailUrlDisplay(row.col_4);
    } else {
      clearDetailUrlDisplay();
    }
    setDetailAuthorDisplay(row.col_10, row.col_1);
    const dateLabel = formatCol2Date(row.col_2);
    detailDate.textContent = dateLabel || "—";
    detailTag.value = serializeTags(parseTags(row.meta?.tag)) || "";
    detailMemo.value = row.meta?.memo ? String(row.meta.memo) : "";

    renderDetailCategories();
    renderDetailImage();
    updateDetailNavState();
    detailSnapshot = getDetailSnapshot();
    setDetailModalStatus("");
  }

  function openDetailAtIndex(index) {
    if (index < 0 || index >= displayedRows.length) return;
    if (!detailModal.classList.contains("open")) {
      detailCategoryRefreshPending = false;
    }
    detailIndex = index;
    fillDetailForm();
    detailModal.classList.add("open");
    if (detailModalTitle) {
      detailModalTitle.textContent = `상세 (${index + 1} / ${displayedRows.length})`;
    }
  }

  async function openDetailById(id) {
    const index = displayedRows.findIndex((r) => r.id === id);
    if (index < 0) return;
    if (
      detailModal.classList.contains("open") &&
      detailIndex >= 0 &&
      index !== detailIndex
    ) {
      if (!(await autoSaveDetailIfDirty())) return;
    }
    openDetailAtIndex(index);
  }

  async function navigateDetail(delta) {
    if (detailIndex < 0) return;
    const fromIndex = detailIndex;
    if (!(await autoSaveDetailIfDirty())) return;
    if (!detailModal.classList.contains("open")) return;
    const next = fromIndex + delta;
    if (next < 0 || next >= displayedRows.length) return;
    openDetailAtIndex(next);
  }

  function closeDetailModal() {
    detailModal.classList.remove("open");
    detailIndex = -1;
    detailImageIndex = 0;
    detailSnapshot = "";
    setDetailModalStatus("");
    detailImage.hidden = true;
    detailImage.removeAttribute("src");
    detailImageEmpty.hidden = false;
  }

  async function requestCloseDetail() {
    if (!(await autoSaveDetailIfDirty())) return;
    const needTableRefresh = detailCategoryRefreshPending;
    closeDetailModal();
    if (needTableRefresh) {
      detailCategoryRefreshPending = false;
      await refreshTableAfterCategoryChange();
    }
  }

  async function autoSaveDetailIfDirty() {
    if (!detailModal.classList.contains("open") || detailIndex < 0) return true;
    if (!isDetailDirty()) return true;
    return saveDetailModal({ silent: true });
  }

  async function saveDetailModal(options = {}) {
    const { silent = false } = options;
    if (detailIndex < 0 || !displayedRows[detailIndex]) return true;
    if (!isDetailDirty()) {
      if (!silent) setDetailModalStatus("변경 사항 없음", "info");
      return true;
    }

    const row = displayedRows[detailIndex];
    const tag = serializeTags(parseTags(detailTag.value));
    const memo = detailMemo.value.trim() || null;
    const payload = {
      tag,
      memo,
      updated_at: new Date().toISOString(),
    };
    const categoryChanged =
      !isReportPhase() && rowCategory(row) !== normalizeCategoryValue(detailDraft.category);
    if (isReportPhase()) {
      payload.status = detailDraft.status;
    } else {
      payload.category = detailDraft.category;
    }

    btnDetailSave.disabled = true;
    detailNavPrev.disabled = true;
    detailNavNext.disabled = true;
    if (!silent) setDetailModalStatus("저장 중…", "info");

    let { error } = await supabase
      .from("dataset_record_meta")
      .update(payload)
      .eq("record_id", row.id);

    if (error) {
      const { error: upsertErr } = await supabase
        .from("dataset_record_meta")
        .upsert([{ record_id: row.id, ...payload }], { onConflict: "record_id" });
      error = upsertErr;
    }

    btnDetailSave.disabled = false;

    if (error) {
      setDetailModalStatus(
        "저장 실패: " + error.message + " (20250603000004 SQL 확인)",
        "error",
      );
      if (detailModal.classList.contains("open")) updateDetailNavState();
      return false;
    }

    patchRowMeta(row.id, payload);
    detailSnapshot = getDetailSnapshot();
    if (!silent) {
      setDetailModalStatus("저장되었습니다.", "ok");
      setStatus("상세 저장 완료", "ok");
    } else {
      setDetailModalStatus("");
    }
    if (categoryChanged) {
      detailCategoryRefreshPending = true;
    }
    renderRows(displayedRows);
    if (!categoryChanged) {
      populateFilterOptions(allLoadedRows);
      await loadListCounts();
    }
    if (detailModal.classList.contains("open")) updateDetailNavState();
    return true;
  }

  function initClient() {
    if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) {
      setStatus(
        "config.js 가 없거나 비어 있습니다. Supabase URL·anon key 를 넣고 GitHub Pages 에도 배포하세요.",
        "error",
      );
      return false;
    }
    if (
      cfg.supabaseAnonKey.includes("YOUR_ANON_KEY") ||
      cfg.supabaseUrl.includes("YOUR_PROJECT")
    ) {
      setStatus("config.js 에 실제 Supabase anon key 를 입력하세요.", "error");
      return false;
    }
    supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    return true;
  }

  function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderRows(rows) {
    tbody.innerHTML = "";
    if (!rows.length) {
      const emptyMsg = allLoadedRows.length
        ? "조건에 맞는 데이터가 없습니다."
        : "데이터가 없습니다. 데이터 추가로 엑셀을 업로드하세요.";
      tbody.innerHTML = `<tr><td colspan="${TABLE_COLUMN_COUNT}" class="empty">${emptyMsg}</td></tr>`;
      updateSelectionUi();
      return;
    }
    const frag = document.createDocumentFragment();
    for (const row of rows) {
      const tr = document.createElement("tr");
      tr.dataset.id = String(row.id);
      const cells = TABLE_COLUMNS.map((col) => {
        if (col.type === "checkbox") {
          return `<td class="col-check"><input type="checkbox" class="row-check" data-id="${escapeHtml(row.id)}" /></td>`;
        }
        return cellHtml(col, row);
      });
      tr.innerHTML = cells.join("");
      tr.querySelector(".row-check")?.addEventListener("change", onRowCheckChange);
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
    updateSelectionUi();
  }

  function buildRecordsSelect() {
    const colSet = new Set(
      DISPLAY_COLUMNS.filter((c) => c.key !== "tag").map((c) => c.key),
    );
    colSet.add("col_4");
    colSet.add("col_7");
    const recordCols = [...colSet].join(", ");
    const metaCols = "category, status, tag, memo";
    return `id, ${recordCols}, dataset_record_meta!inner (${metaCols})`;
  }

  function applyPhaseScopeToQuery(query) {
    if (isReportPhase()) {
      return query.not("dataset_record_meta.status", "is", null).neq(
        "dataset_record_meta.status",
        "",
      );
    }
    return query.or("status.is.null,status.eq.", {
      foreignTable: "dataset_record_meta",
    });
  }

  function applyListFilterToQuery(query) {
    if (activeListFilter === "전체") return query;
    const field = getPhaseMetaField();
    const col = `dataset_record_meta.${field}`;
    return query.eq(col, activeListFilter);
  }

  async function loadData() {
    if (!supabase) return;
    setStatus("불러오는 중…", "info");
    btnRefresh.disabled = true;

    let query = supabase
      .from("dataset_records")
      .select(buildRecordsSelect())
      .order("id", { ascending: true })
      .limit(5000);

    query = applyPhaseScopeToQuery(query);
    query = applyListFilterToQuery(query);

    const { data, error } = await query;

    btnRefresh.disabled = false;
    if (error) {
      const msg =
        "조회 실패: " +
        error.message +
        " (dataset_record_meta SQL 미실행 시 Supabase SQL Editor에서 20250603000004 실행)";
      setStatus(msg, "error");
      showTableError(msg);
      return;
    }
    allLoadedRows = (data || []).map(normalizeRecord);
    populateFilterOptions(allLoadedRows);
    applyClientFilters();
    const filterLabel = activeListFilter === "전체" ? "" : ` · ${activeListFilter}`;
    setStatus(`조회 완료${filterLabel}`, "ok");
  }

  async function refreshDashboard() {
    await loadListCounts();
    await loadData();
  }

  function normalizeCategoryValue(value) {
    const s = value == null ? "" : String(value).trim();
    return CATEGORIES.includes(s) ? s : DEFAULT_CATEGORY;
  }

  function rowCategory(row) {
    return normalizeCategoryValue(row?.meta?.category);
  }

  /** 분류 변경 후 상단 필터·표 목록 동기화 (activeListFilter는 loadData에서 적용) */
  async function refreshTableAfterCategoryChange() {
    await loadListCounts();
    await loadData();
    populateFilterOptions(allLoadedRows);
  }

  function syncDetailModalAfterTableRefresh(recordId) {
    if (!detailModal.classList.contains("open") || recordId == null) return;
    const newIndex = displayedRows.findIndex((r) => r.id === recordId);
    if (newIndex < 0) {
      closeDetailModal();
      return;
    }
    detailIndex = newIndex;
    fillDetailForm();
    if (detailModalTitle) {
      detailModalTitle.textContent = `상세 (${newIndex + 1} / ${displayedRows.length})`;
    }
    updateDetailNavState();
  }

  function showTableError(message) {
    tbody.innerHTML = `<tr><td colspan="${TABLE_COLUMN_COUNT}" class="empty">${escapeHtml(message)}</td></tr>`;
    filterResultCount.textContent = "";
    updateSelectionUi();
  }

  function sheetRowToRecord(row) {
    const rec = {};
    for (const key of COL_KEYS) {
      const v = row[COL_KEYS.indexOf(key)];
      if (key === "col_2") {
        rec.col_2 = normalizeCol2Input(v);
      } else {
        rec[key] = v === undefined || v === null || v === "" ? null : String(v).trim();
      }
    }
    return rec;
  }

  const HEADER_CELL_PATTERNS = [
    /^col[_\s-]?\d*$/i,
    /^column\s*\d*$/i,
    /^field\s*\d*$/i,
    /^열\s*\d*$/i,
    /^항목\s*\d*$/,
    /^id$/i,
    /^no\.?$/i,
    /^#$/,
    /^번호$/,
    /^순번$/,
    /^이름$/,
    /^name$/i,
    /^날짜$/,
    /^date$/i,
    /^비고$/,
    /^메모$/,
    /^remark$/i,
    /^태그$/i,
    /^tag$/i,
  ];

  function rowCells(row, max = 10) {
    const out = [];
    for (let i = 0; i < max; i++) {
      const v = row?.[i];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        out.push(String(v).trim());
      }
    }
    return out;
  }

  function isNumericCell(value) {
    const s = String(value).trim().replace(/,/g, "");
    if (s === "") return false;
    return !Number.isNaN(Number(s));
  }

  function isHeaderRow(row) {
    const cells = rowCells(row);
    if (!cells.length) return false;

    for (const cell of cells) {
      const lower = cell.toLowerCase();
      if (HEADER_CELL_PATTERNS.some((p) => p.test(cell) || p.test(lower))) {
        return true;
      }
    }

    // 첫 행이 전부 글자(숫자 아님)이고 2칸 이상이면 헤더로 간주
    if (cells.length >= 2 && cells.every((c) => !isNumericCell(c))) {
      return true;
    }

    return false;
  }

  function firstRowLooksLikeData(row) {
    const first = row?.[0];
    if (first === undefined || first === null || String(first).trim() === "") {
      return false;
    }
    return isNumericCell(first);
  }

  function skipFirstRow(rows) {
    if (!rows.length) return false;
    const first = rows[0];
    if (isHeaderRow(first)) return true;
    // 1행이 데이터 형태가 아니면 헤더로 보고 건너뜀 (일반 엑셀)
    if (!firstRowLooksLikeData(first)) return true;
    return false;
  }

  function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          const start = rows.length && skipFirstRow(rows) ? 1 : 0;
          const records = [];
          for (let i = start; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row.some((c) => c !== "" && c != null)) continue;
            records.push(sheetRowToRecord(row));
          }
          resolve({ records });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
      reader.readAsArrayBuffer(file);
    });
  }

  const UPLOAD_FETCH_TIMEOUT_MS = 120000;
  const URL_DEDUP_RPC_CHUNK = 200;
  const URL_DEDUP_SELECT_CHUNK = 12;
  const UPLOAD_INSERT_CHUNK = 100;

  function withUploadTimeout(promise, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                `${label}: ${UPLOAD_FETCH_TIMEOUT_MS / 1000}초 초과. Supabase·네트워크를 확인하세요.`,
              ),
            ),
          UPLOAD_FETCH_TIMEOUT_MS,
        );
      }),
    ]);
  }

  function addCol4UrlsToSet(rows, existing) {
    for (const row of rows || []) {
      const raw = row && typeof row === "object" ? row.col_4 : row;
      const u = normCol4Url(raw);
      if (u) existing.add(u);
    }
  }

  async function findExistingCol4UrlsViaSelect(chunk, existing) {
    const { data, error } = await withUploadTimeout(
      supabase.from("dataset_records").select("col_4").in("col_4", chunk),
      "URL 중복 확인",
    );
    if (error) throw error;
    addCol4UrlsToSet(data, existing);
  }

  async function findExistingCol4Urls(urlsToCheck, onProgress) {
    const existing = new Set();
    const unique = [...new Set(urlsToCheck)];
    if (!unique.length) return existing;

    let rpcAvailable = true;
    const totalChunks = Math.ceil(unique.length / URL_DEDUP_RPC_CHUNK);

    for (let i = 0; i < unique.length; i += URL_DEDUP_RPC_CHUNK) {
      const chunk = unique.slice(i, i + URL_DEDUP_RPC_CHUNK);
      const chunkNo = Math.floor(i / URL_DEDUP_RPC_CHUNK) + 1;
      onProgress?.(`URL 중복 확인 중… (${chunkNo}/${totalChunks})`);

      if (rpcAvailable) {
        const { data, error } = await withUploadTimeout(
          supabase.rpc("find_existing_col4_urls", { urls: chunk }),
          "URL 중복 확인",
        );
        if (!error) {
          addCol4UrlsToSet(data, existing);
          continue;
        }
        const missingRpc =
          error.code === "PGRST202" ||
          /find_existing_col4_urls/i.test(error.message || "") ||
          /function.*does not exist/i.test(error.message || "");
        if (!missingRpc) throw error;
        rpcAvailable = false;
      }

      for (let j = 0; j < chunk.length; j += URL_DEDUP_SELECT_CHUNK) {
        const sub = chunk.slice(j, j + URL_DEDUP_SELECT_CHUNK);
        await findExistingCol4UrlsViaSelect(sub, existing);
      }
    }

    return existing;
  }

  function filterNewRowsByCol4Url(rows, existingUrls) {
    const seenInBatch = new Set();
    const toInsert = [];
    let skippedDb = 0;
    let skippedFile = 0;

    for (const row of rows) {
      const url = normCol4Url(row.col_4);
      if (!url) {
        toInsert.push(row);
        continue;
      }
      if (existingUrls.has(url)) {
        skippedDb += 1;
        continue;
      }
      if (seenInBatch.has(url)) {
        skippedFile += 1;
        continue;
      }
      seenInBatch.add(url);
      toInsert.push(row);
    }

    return { toInsert, skippedDb, skippedFile };
  }

  async function loadAuthorListMap() {
    const map = new Map();
    const { data, error } = await supabase
      .from("dataset_authors")
      .select("platform, author_name, list_type");
    if (error) throw error;
    for (const row of data || []) {
      const key = `${normPlatform(row.platform)}\0${normAuthor(row.author_name)}`;
      if (AUTHOR_LIST_CATEGORIES.includes(row.list_type)) {
        map.set(key, row.list_type);
      }
    }
    return map;
  }

  function categoryForRecordFromAuthorMap(row, authorMap) {
    const author = normAuthor(row.col_10);
    if (!author) return DEFAULT_CATEGORY;
    const key = `${normPlatform(row.col_1)}\0${author}`;
    return authorMap.get(key) || DEFAULT_CATEGORY;
  }

  function tagForPlatform(platform) {
    const key = normPlatform(platform).toLowerCase();
    return PLATFORM_TAG_MAP[key] ?? null;
  }

  async function ensureMetaTagsForRows(rows) {
    const byTag = new Map();
    for (const row of rows) {
      if (row.id == null) continue;
      const tag = tagForPlatform(row.col_1);
      if (!tag) continue;
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(row.id);
    }
    if (!byTag.size) return;

    const now = new Date().toISOString();
    for (const [tag, ids] of byTag) {
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const { error } = await supabase
          .from("dataset_record_meta")
          .update({ tag, updated_at: now })
          .in("record_id", chunk);
        if (error) {
          const upserts = chunk.map((record_id) => ({
            record_id,
            tag,
            category: DEFAULT_CATEGORY,
            updated_at: now,
          }));
          const { error: upsertErr } = await supabase
            .from("dataset_record_meta")
            .upsert(upserts, { onConflict: "record_id" });
          if (upsertErr) throw upsertErr;
        }
      }
    }
  }

  async function ensureMetaCategoriesForRows(rows, authorMap) {
    const byCategory = new Map();
    for (const row of rows) {
      if (row.id == null) continue;
      const category = categoryForRecordFromAuthorMap(row, authorMap);
      if (category === DEFAULT_CATEGORY) continue;
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push(row.id);
    }
    if (!byCategory.size) return;

    const now = new Date().toISOString();
    for (const [category, ids] of byCategory) {
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        await supabase
          .from("dataset_record_meta")
          .update({ category, updated_at: now })
          .in("record_id", chunk);
      }
    }
  }

  async function uploadRows(rows, onProgress) {
    if (!supabase) {
      throw new Error("Supabase 연결이 없습니다. config.js 의 anon key 를 확인하세요.");
    }

    const replaced = replaceCheck.checked;

    if (replaced) {
      onProgress?.("기존 데이터 삭제 중…");
      const { error: delError } = await withUploadTimeout(
        supabase.from("dataset_records").delete().gte("id", 0),
        "기존 데이터 삭제",
      );
      if (delError) {
        throw new Error(
          "기존 데이터 삭제 실패: " +
            delError.message +
            " (SQL Editor에서 migrations/20250603000001_dataset_records_anon_write.sql 실행 필요)",
        );
      }
    }

    const fileUrls = rows.map((r) => normCol4Url(r.col_4)).filter(Boolean);
    const existingUrls = replaced
      ? new Set()
      : await findExistingCol4Urls(fileUrls, onProgress);
    const { toInsert, skippedDb, skippedFile } = filterNewRowsByCol4Url(rows, existingUrls);

    if (!toInsert.length) {
      return {
        inserted: 0,
        skippedDb,
        skippedFile,
        replaced,
        totalInFile: rows.length,
        categoryCounts: {},
      };
    }

    let authorMap = new Map();
    try {
      authorMap = await loadAuthorListMap();
    } catch {
      authorMap = new Map();
    }

    const insertChunks = Math.ceil(toInsert.length / UPLOAD_INSERT_CHUNK);
    let inserted = 0;
    const insertedRows = [];
    const categoryCounts = {};

    for (let i = 0; i < toInsert.length; i += UPLOAD_INSERT_CHUNK) {
      const chunkNo = Math.floor(i / UPLOAD_INSERT_CHUNK) + 1;
      onProgress?.(`저장 중… (${chunkNo}/${insertChunks}, ${toInsert.length}행)`);
      const chunk = toInsert.slice(i, i + UPLOAD_INSERT_CHUNK);
      const { data, error } = await withUploadTimeout(
        supabase.from("dataset_records").insert(chunk).select("id, col_1, col_10"),
        "데이터 저장",
      );
      if (error) {
        throw new Error(
          error.message +
            " (업로드 권한 없으면 SQL Editor에서 20250603000001_dataset_records_anon_write.sql 실행)",
        );
      }
      const created = data || [];
      inserted += created.length;
      insertedRows.push(...created);

      const chunkCounts = countCategoriesForInsertedRows(created, authorMap);
      for (const [cat, n] of Object.entries(chunkCounts)) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + n;
      }

      const createdForMeta = created.map((r) => ({
        id: r.id,
        col_1: r.col_1,
        col_10: r.col_10,
      }));
      await ensureMetaTagsForRows(createdForMeta);
      if (authorMap.size > 0) {
        await ensureMetaCategoriesForRows(createdForMeta, authorMap);
      }
    }

    return {
      inserted,
      skippedDb,
      skippedFile,
      replaced,
      totalInFile: rows.length,
      categoryCounts,
    };
  }

  function isAcceptedFile(file) {
    const name = (file?.name || "").toLowerCase();
    return ACCEPT_EXT.some((ext) => name.endsWith(ext));
  }

  function setSelectedFile(file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    dropZoneFileName.textContent = file.name;
    dropZoneFileName.hidden = false;
  }

  function clearSelectedFile() {
    fileInput.value = "";
    dropZoneFileName.textContent = "";
    dropZoneFileName.hidden = true;
  }

  function pickFile() {
    fileInput.click();
  }

  async function processUpload(file) {
    if (!file) {
      setModalStatus("엑셀 파일(.xlsx, .xls, .csv)을 선택하세요.", "error");
      return;
    }
    if (!isAcceptedFile(file)) {
      setModalStatus("지원 형식: .xlsx, .xls, .csv", "error");
      return;
    }
    setSelectedFile(file);
    btnUpload.disabled = true;
    setModalStatus("엑셀 파싱 중…", "info");
    try {
      const parsed = await parseExcelFile(file);
      const rows = parsed.records ?? parsed;
      if (!rows.length) {
        setModalStatus(
          "업로드할 데이터 행이 없습니다. (A~J열 1행 헤더 + 데이터)",
          "error",
        );
        return;
      }
      setModalStatus(`${rows.length}행 업로드 준비…`, "info");
      const result = await uploadRows(rows, (msg) => setModalStatus(msg, "info"));
      const parts = [`신규 ${result.inserted}건 추가`];
      if (result.skippedDb > 0) parts.push(`URL 중복 ${result.skippedDb}건 제외`);
      if (result.skippedFile > 0) parts.push(`파일 내 중복 ${result.skippedFile}건 제외`);
      if (result.replaced) parts.push("기존 데이터 교체");
      const msg = `업로드 완료: ${parts.join(" · ")}`;
      setStatus(msg, result.inserted > 0 ? "ok" : "info");
      closeUploadModal();
      await refreshDashboard();
      if (result.inserted > 0) {
        openUploadResultModal(result);
      } else {
        setModalStatus(msg, "info");
      }
    } catch (err) {
      setModalStatus(err.message || String(err), "error");
    } finally {
      btnUpload.disabled = false;
    }
  }

  function onUpload() {
    processUpload(fileInput.files?.[0]);
  }

  function onFileInputChange() {
    const file = fileInput.files?.[0];
    if (file) {
      if (!isAcceptedFile(file)) {
        setModalStatus("지원 형식: .xlsx, .xls, .csv", "error");
        clearSelectedFile();
        return;
      }
      setSelectedFile(file);
      setModalStatus(`선택됨: ${file.name} — 업로드 버튼을 누르세요.`, "info");
    }
  }

  function onDrop(e) {
    e.preventDefault();
    dragDepth = 0;
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer?.files?.[0];
    if (file) processUpload(file);
  }

  function onDragEnter(e) {
    e.preventDefault();
    dragDepth += 1;
    dropZone.classList.add("drag-over");
  }

  function onDragLeave(e) {
    e.preventDefault();
    dragDepth -= 1;
    if (dragDepth <= 0) {
      dragDepth = 0;
      dropZone.classList.remove("drag-over");
    }
  }

  function onDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }

  btnRefresh.addEventListener("click", refreshDashboard);
  btnAddData.addEventListener("click", openUploadModal);
  btnPhaseClassification.addEventListener("click", () => {
    setActivePhase("classification").catch((err) => {
      setStatus(err?.message || String(err), "error");
    });
  });
  btnPhaseReport.addEventListener("click", () => {
    setActivePhase("report").catch((err) => {
      setStatus(err?.message || String(err), "error");
    });
  });
  updatePhaseToolbarUi();
  filterCol1.addEventListener("change", applyClientFilters);
  filterTag.addEventListener("change", applyClientFilters);
  function openDatePicker(input) {
    if (!input) return;
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        /* fallback */
      }
    }
    input.focus();
    input.click();
  }

  document.querySelectorAll(".btn-calendar").forEach((btn) => {
    const id = btn.getAttribute("data-date-for");
    const input = id ? document.getElementById(id) : null;
    if (!input) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openDatePicker(input);
    });
    input.addEventListener("click", () => openDatePicker(input));
  });

  filterCol2From.addEventListener("change", applyClientFilters);
  filterCol2To.addEventListener("change", applyClientFilters);
  searchInput.addEventListener("input", applyClientFilters);
  btnClearFilters.addEventListener("click", clearFilters);
  btnUpload.addEventListener("click", onUpload);
  btnModalClose.addEventListener("click", closeUploadModal);
  btnModalCancel.addEventListener("click", closeUploadModal);
  uploadModal.addEventListener("click", (e) => {
    if (e.target === uploadModal) closeUploadModal();
  });
  btnUploadResultClose?.addEventListener("click", closeUploadResultModal);
  btnUploadResultOk?.addEventListener("click", closeUploadResultModal);
  uploadResultModal?.addEventListener("click", (e) => {
    if (e.target === uploadResultModal) closeUploadResultModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && detailModal.classList.contains("open")) {
      e.preventDefault();
      requestCloseDetail().catch((err) => {
        setDetailModalStatus(err?.message || String(err), "error");
      });
      return;
    }
    if (e.key === "Escape" && uploadResultModal?.classList.contains("open")) {
      closeUploadResultModal();
      return;
    }
    if (e.key === "Escape" && uploadModal.classList.contains("open")) {
      closeUploadModal();
    }
    if (e.key === "Escape" && authorModal.classList.contains("open")) {
      closeAuthorModal();
      return;
    }
    if (e.key === "Escape" && dataViewModal.classList.contains("open")) {
      closeDataViewModal();
      return;
    }
    if (e.key === "Escape" && categoryBulkModal.classList.contains("open")) {
      closeCategoryBulkModal();
      return;
    }
    if (e.key === "Escape" && tagModal.classList.contains("open")) {
      closeTagModal();
    }
    if (!detailModal.classList.contains("open")) return;
    if (e.target.matches("input, textarea")) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      navigateDetail(-1).catch((err) => {
        setDetailModalStatus(err?.message || String(err), "error");
      });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      navigateDetail(1).catch((err) => {
        setDetailModalStatus(err?.message || String(err), "error");
      });
    }
  });
  tbody.addEventListener("click", (e) => {
    const titleBtn = e.target.closest(".btn-title-link");
    if (titleBtn) {
      e.stopPropagation();
      const tr = titleBtn.closest("tr[data-id]");
      if (!tr) return;
      openDetailById(Number(tr.dataset.id)).catch((err) => {
        setDetailModalStatus(err?.message || String(err), "error");
      });
      return;
    }
    const authorBtn = e.target.closest(".btn-author-link");
    if (authorBtn) {
      e.stopPropagation();
      openAuthorModal(authorBtn.dataset.author || authorBtn.textContent, authorBtn.dataset.platform);
    }
  });
  btnAuthorModalClose.addEventListener("click", closeAuthorModal);
  btnAuthorModalCancel.addEventListener("click", closeAuthorModal);
  detailAuthor.addEventListener("click", () => {
    if (detailAuthor.classList.contains("is-empty")) return;
    openAuthorModal(detailAuthor.textContent, detailAuthor.dataset.platform);
  });
  btnAuthorBlacklist.addEventListener("click", () => {
    if (!authorModalAuthorName) return;
    applyAuthorCategory(authorModalAuthorName, authorModalPlatformValue, "블랙리스트").catch((err) => {
      setAuthorModalStatus(err?.message || String(err), "error");
      setAuthorModalButtonsDisabled(false);
    });
  });
  btnAuthorWhitelist.addEventListener("click", () => {
    if (!authorModalAuthorName) return;
    applyAuthorCategory(authorModalAuthorName, authorModalPlatformValue, "화이트리스트").catch((err) => {
      setAuthorModalStatus(err?.message || String(err), "error");
      setAuthorModalButtonsDisabled(false);
    });
  });
  btnAuthorIgnore.addEventListener("click", () => {
    if (!authorModalAuthorName) return;
    applyAuthorCategory(authorModalAuthorName, authorModalPlatformValue, "무시").catch((err) => {
      setAuthorModalStatus(err?.message || String(err), "error");
      setAuthorModalButtonsDisabled(false);
    });
  });
  btnAuthorReset.addEventListener("click", () => {
    if (!authorModalAuthorName) return;
    resetAuthorList(authorModalAuthorName, authorModalPlatformValue).catch((err) => {
      setAuthorModalStatus(err?.message || String(err), "error");
      setAuthorModalButtonsDisabled(false);
    });
  });
  authorModal.addEventListener("click", (e) => {
    if (e.target === authorModal) closeAuthorModal();
  });
  btnDetailClose.addEventListener("click", () => {
    requestCloseDetail().catch((err) => {
      setDetailModalStatus(err?.message || String(err), "error");
    });
  });
  btnDetailCancel.addEventListener("click", () => {
    requestCloseDetail().catch((err) => {
      setDetailModalStatus(err?.message || String(err), "error");
    });
  });
  btnDetailSave.addEventListener("click", () => {
    saveDetailModal().catch((err) => {
      setDetailModalStatus(err?.message || String(err), "error");
    });
  });
  detailNavPrev.addEventListener("click", () => {
    navigateDetail(-1).catch((err) => {
      setDetailModalStatus(err?.message || String(err), "error");
    });
  });
  detailNavNext.addEventListener("click", () => {
    navigateDetail(1).catch((err) => {
      setDetailModalStatus(err?.message || String(err), "error");
    });
  });
  detailImgPrev.addEventListener("click", () => navigateDetailImage(-1));
  detailImgNext.addEventListener("click", () => navigateDetailImage(1));
  detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) {
      requestCloseDetail().catch((err) => {
        setDetailModalStatus(err?.message || String(err), "error");
      });
    }
  });
  btnDelete.addEventListener("click", deleteSelected);
  btnTagAdd.addEventListener("click", openTagModal);
  btnCategoryBulk.addEventListener("click", openCategoryBulkModal);
  btnReportSubmit.addEventListener("click", () => {
    const ids = getSelectedIds();
    if (!ids.length) {
      setStatus("신고할 행을 선택하세요.", "error");
      return;
    }
    applyReportStatus(ids).catch((err) => {
      setStatus(err?.message || String(err), "error");
    });
  });
  btnDataView.addEventListener("click", () => {
    openDataViewModal().catch((err) => {
      setDataViewModalStatus(err?.message || String(err), "error");
    });
  });
  btnDataViewCopy.addEventListener("click", () => {
    copyDataViewSelectedColumns().catch((err) => {
      setDataViewModalStatus(err?.message || String(err), "error");
    });
  });
  btnDataViewCopyAll.addEventListener("click", () => {
    copyDataViewAll().catch((err) => {
      setDataViewModalStatus(err?.message || String(err), "error");
    });
  });
  dataViewHead.addEventListener("change", (e) => {
    const cb = e.target.closest(".data-view-col-check");
    if (!cb) return;
    const key = cb.dataset.colKey;
    if (!key) return;
    if (cb.checked) dataViewSelectedColKeys.add(key);
    else dataViewSelectedColKeys.delete(key);
  });
  btnDataViewModalClose.addEventListener("click", closeDataViewModal);
  btnDataViewModalCancel.addEventListener("click", closeDataViewModal);
  dataViewModal.addEventListener("click", (e) => {
    if (e.target === dataViewModal) closeDataViewModal();
  });
  btnCategoryBulkModalClose.addEventListener("click", closeCategoryBulkModal);
  btnCategoryBulkModalCancel.addEventListener("click", closeCategoryBulkModal);
  categoryBulkModal.addEventListener("click", (e) => {
    if (e.target === categoryBulkModal) closeCategoryBulkModal();
  });
  btnTagChipAdd.addEventListener("click", addTagFromInput);
  tagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTagFromInput();
    }
  });
  btnTagModalClose.addEventListener("click", closeTagModal);
  btnTagModalCancel.addEventListener("click", closeTagModal);
  btnTagModalSave.addEventListener("click", saveTagModal);
  tagModal.addEventListener("click", (e) => {
    if (e.target === tagModal) closeTagModal();
  });
  fileInput.addEventListener("change", onFileInputChange);
  dropZone.addEventListener("click", pickFile);
  dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pickFile();
    }
  });
  dropZone.addEventListener("dragenter", onDragEnter);
  dropZone.addEventListener("dragleave", onDragLeave);
  dropZone.addEventListener("dragover", onDragOver);
  dropZone.addEventListener("drop", onDrop);

  buildTableChrome();

  if (initClient()) {
    refreshDashboard().catch((err) => {
      const msg = err?.message || String(err);
      setStatus(msg, "error");
      showTableError(msg);
    });
  } else {
    showTableError("config.js 에 Supabase URL·anon key 를 확인하세요.");
  }
})();
