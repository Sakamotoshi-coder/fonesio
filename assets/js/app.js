/* Fonesio · 配额展示基础版
 * 数据为前端模拟：每次载入随机生成，随后按"签约占用"节奏动态递减。
 */
(function () {
  "use strict";

  const REGIONS = [
    "北京", "上海", "天津", "重庆",
    "广东", "江苏", "浙江", "山东", "河南", "四川",
    "湖北", "湖南", "福建", "安徽", "河北", "江西",
    "陕西", "辽宁", "山西", "云南", "贵州", "广西",
    "黑龙江", "吉林", "内蒙古", "新疆", "甘肃", "海南",
    "宁夏", "青海", "西藏", "香港", "澳门", "台湾"
  ];

  const SUFFIX = /(壮族自治区|回族自治区|维吾尔自治区|特别行政区|自治区|省|市)$/;

  const MIN_QUOTA = 1;
  const MAX_QUOTA = 10;

  const cardsEl = document.getElementById("cards");
  const formEl = document.getElementById("search");
  const fieldEl = document.getElementById("searchField");
  const hintEl = document.getElementById("searchHint");
  const toastEl = document.getElementById("toast");

  /** 名额区间 1–10，偏向低位以制造紧迫感 */
  function seedQuota() {
    const r = Math.random();
    if (r < 0.38) return rand(1, 3);    // 紧急
    if (r < 0.74) return rand(4, 6);    // 紧张
    return rand(7, MAX_QUOTA);          // 即将售罄 / 名额有限
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function tagFor(count) {
    if (count <= 3) return { text: "紧急！仅剩 " + count + " 个", cls: "tag--urgent" };
    if (count <= 6) return { text: "名额紧张", cls: "tag--tight" };
    if (count <= 9) return { text: "即将告罄", cls: "tag--soon" };
    return { text: "名额有限", cls: "tag--soon" };
  }

  /** 告罄程度越高，标签流光越快（秒数越小） */
  function flowDuration(count) {
    if (count <= 2) return "0.7s";
    if (count <= 4) return "1s";
    if (count <= 6) return "1.4s";
    if (count <= 8) return "1.9s";
    return "2.5s";
  }

  /** 状态：{ name, count, node, countNode, tagNode } */
  const states = REGIONS.map(function (name) {
    return { name: name, count: seedQuota(), node: null, countNode: null, tagNode: null };
  });

  /* 按紧急程度排序，让"告急"的省份自然浮到前面 */
  states.sort(function (a, b) { return a.count - b.count; });

  function buildCard(state) {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.name = state.name;

    // 左：定位图标 + 地区名
    const idBox = document.createElement("span");
    idBox.className = "card__id";
    const pin = document.createElement("span");
    pin.className = "card__pin";
    pin.innerHTML =
      '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">' +
      '<path d="M12 21s7-5.6 7-11.2A7 7 0 1 0 5 9.8C5 15.4 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<circle cx="12" cy="9.8" r="2.4" fill="currentColor"/></svg>';
    const name = document.createElement("h3");
    name.className = "card__name";
    name.textContent = state.name;
    idBox.appendChild(pin);
    idBox.appendChild(name);

    // 中：剩余名额 + DIN 数字
    const quota = document.createElement("span");
    quota.className = "card__quota";
    const label = document.createElement("span");
    label.className = "card__label";
    label.textContent = "剩余名额";

    const count = document.createElement("span");
    count.className = "card__count";
    const numWrap = document.createElement("span");
    numWrap.className = "card__num-wrap";
    const num = document.createElement("span");
    num.className = "card__num";
    num.textContent = state.count;
    numWrap.appendChild(num);
    const unit = document.createElement("span");
    unit.className = "card__unit";
    unit.textContent = "个";
    count.appendChild(numWrap);
    count.appendChild(unit);
    quota.appendChild(label);
    quota.appendChild(count);

    const tag = document.createElement("span");
    tag.className = "tag";

    // 右：箭头
    const chevron = document.createElement("span");
    chevron.className = "card__chevron";
    chevron.innerHTML =
      '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
      '<path d="M9 5.5 L15.5 12 L9 18.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    card.appendChild(idBox);
    card.appendChild(quota);
    card.appendChild(tag);
    card.appendChild(chevron);

    state.node = card;
    state.countNode = num;
    state.tagNode = tag;
    paint(state);
    return card;
  }

  function paint(state) {
    if (!state.countNode) return;
    const tag = tagFor(state.count);
    state.tagNode.textContent = tag.text;
    state.tagNode.className = "tag " + tag.cls;
    state.tagNode.style.setProperty("--flow-dur", flowDuration(state.count));
  }

  /** 数字切换：旧值向上滑出、新值从下方滑入（老虎机式） */
  function rollNumber(state, value) {
    const old = state.countNode;
    const wrap = old.parentNode;
    const next = document.createElement("span");
    next.className = "card__num is-incoming";
    next.textContent = value;
    wrap.appendChild(next);

    // 位数变化（9 → 10）时按较宽的一方临时撑开容器，避免新值被裁切或折行
    const width = Math.max(old.getBoundingClientRect().width, next.scrollWidth);
    wrap.style.width = width + "px";

    const EASE = "cubic-bezier(.22, .61, .36, 1)";
    const DURATION = 340;

    old.animate(
      [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-105%)", opacity: 0 }],
      { duration: DURATION, easing: EASE, fill: "forwards" }
    );

    const incoming = next.animate(
      [{ transform: "translateY(105%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
      { duration: DURATION, easing: EASE, fill: "forwards" }
    );

    incoming.onfinish = function () {
      if (old.parentNode) old.remove();
      next.classList.remove("is-incoming");
      next.style.position = "";
      next.style.left = "";
      next.style.top = "";
      wrap.style.width = "";
      state.countNode = next;
    };
  }

  /** 统一入口：改数值 + 滚动数字 + 刷新状态标签 */
  function setCount(state, value) {
    state.count = value;
    rollNumber(state, value);
    paint(state);
  }

  function render() {
    const frag = document.createDocumentFragment();
    states.forEach(function (s) { frag.appendChild(buildCard(s)); });
    cardsEl.appendChild(frag);
  }

  /* ---------------- 动态更新：模拟"名额被抢占" ---------------- */
  function tick() {
    const pool = states.filter(function (s) { return s.count > MIN_QUOTA; });
    const floor = states.filter(function (s) { return s.count <= MIN_QUOTA; });

    // 少量"补放"：让已经见底的省份偶尔回补，页面不会长期全停在 1
    if (floor.length && Math.random() < 0.22) {
      const back = floor[rand(0, floor.length - 1)];
      setCount(back, rand(2, 5));
      shake(back);
    }

    if (!pool.length) return;

    const hits = rand(1, Math.min(3, pool.length));
    const touched = new Set();

    for (let i = 0; i < hits; i++) {
      const s = pool[rand(0, pool.length - 1)];
      if (!s || touched.has(s.name)) continue;
      touched.add(s.name);

      // 大部分时候递减；小概率"补放"名额，避免数字只降不升显得假
      let next;
      if (Math.random() < 0.86) {
        next = Math.max(MIN_QUOTA, s.count - 1);
      } else if (s.count < MAX_QUOTA) {
        next = s.count + 1;
      } else {
        next = Math.max(MIN_QUOTA, s.count - 1);
      }
      setCount(s, next);
      shake(s);
    }
  }

  /** 数字变化时贴片左右快速抖动，模拟闹钟响铃的紧迫感 */
  function shake(state) {
    const node = state.node;
    if (!node) return;
    node.classList.remove("is-shake");
    void node.offsetWidth;
    node.classList.add("is-shake");
  }

  /* ---------------- 搜索 ---------------- */
  function normalize(text) {
    return String(text).trim().replace(/\s+/g, "").replace(SUFFIX, "");
  }

  function clearFound() {
    Array.prototype.forEach.call(cardsEl.querySelectorAll(".is-found"), function (el) {
      el.classList.remove("is-found");
    });
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-on");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
  }

  function search(term) {
    const key = normalize(term);
    clearFound();
    hintEl.hidden = true;

    if (!key) {
      showToast("请输入省份名称后再查询");
      return;
    }

    const hit = states.find(function (s) { return s.name.indexOf(key) === 0 || s.name.indexOf(key) > -1; });

    if (!hit) {
      showToast("暂无「" + key + "」的配额信息");
      return;
    }

    hit.node.classList.add("is-found");
    hit.node.scrollIntoView({ behavior: "smooth", block: "center" });
    hintEl.textContent = hit.name + "：当前剩余 " + hit.count + " 个名额";
    hintEl.hidden = false;
  }

  formEl.addEventListener("submit", function (e) {
    e.preventDefault();
    search(fieldEl.value);
  });

  fieldEl.addEventListener("input", function () {
    if (fieldEl.value === "") {
      clearFound();
      hintEl.hidden = true;
    }
  });

  // 点击页面其它任意位置（或按 Esc）退出选中模式
  document.addEventListener("click", function (e) {
    if (!document.querySelector(".card.is-found")) return;
    if (e.target.closest(".card.is-found")) return; // 点中已选中的卡片本身不退出
    if (e.target.closest("#search")) return;        // 搜索区内的点击交给查询逻辑
    clearFound();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") clearFound();
  });

  /* ---------------- 回到顶部 ---------------- */
  const toTopEl = document.getElementById("toTop");

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function syncToTop() {
    if (!toTopEl) return;
    toTopEl.classList.toggle("is-on", window.scrollY > 360);
  }

  if (toTopEl) {
    window.addEventListener("scroll", syncToTop, { passive: true });
    toTopEl.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
    syncToTop();
  }

  render();
  setInterval(tick, 3000);

  // 调试钩子：仅在 URL 带 ?debug=1 时暴露，便于验证数字滚动等交互
  if (new URLSearchParams(window.location.search).has("debug")) {
    window.fonesioDebug = { states: states, setCount: setCount };
  }
})();
