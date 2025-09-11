(() => {
  const $ = (s) => document.querySelector(s),
    pad = (n) => n.toString().padStart(2, "0"),
    tfmt = (s) => `${pad((s / 60) | 0)}:${pad((s | 0) % 60)}`,
    getPt = (e) => e?.changedTouches?.[0] ?? e?.touches?.[0] ?? e;

  const fx = $("#fx"),
    ctx = fx.getContext("2d"),
    wrap = $("#wrap");
  const audio = $("#audio"),
    toggleBig = $("#toggleBig"),
    scrub = $("#scrub"),
    nav = $("#nav");
  const titleEl = $("#trackTitle"),
    elapsed = $("#elapsed"),
    total = $("#total");

  let tracks = [
      "Steve Lacy Dark Red.mp3",
      "TVBUU_-_MOVE_Prod_SPLITMIND_(new.muzikavsem.org).mp3",
      "j-hope_-_more_(muztune.me).mp3",
      "t-pain_feat_teddy_verseti_-_church_shag_vpered_2__(z3.fm).mp3",
    ],
    idx = -1,
    rot = 0,
    wantVol = 1,
    pendPlay = false;

  const baseDir = new URL(".", location.href);
  const mapUrl = (s) =>
    /^https?:/i.test(s) ? s : new URL(encodeURI(s), baseDir).toString();
  const nameOf = (u) => {
    try {
      return decodeURIComponent(u.split("/").pop() || u);
    } catch {
      return u;
    }
  };
  const setTitle = () => {
    titleEl.textContent = nameOf(tracks[idx] || "—");
  };

  async function safePlay() {
    try {
      audio.autoplay = true;
      audio.playsInline = true;
      await audio.play();
      toggleBig.textContent = "⏸";
      audio.muted = false;
      audio.volume = wantVol;
    } catch {
      pendPlay = true;
    }
  }
  function playAt(i) {
    idx = (i + tracks.length) % tracks.length;
    audio.src = mapUrl(tracks[idx]);
    setTitle();
    audio.muted = true;
    pendPlay = true;
    audio.load();
    pulse(nav);
  }
  function step(n) {
    if (!tracks.length) return;
    playAt(idx < 0 ? 0 : idx + n);
  }
  function toggle() {
    if (audio.paused) {
      pendPlay = true;
      safePlay();
    } else {
      audio.pause();
      toggleBig.textContent = "▶️";
    }
  }

  audio.addEventListener("canplay", () => {
    if (pendPlay) {
      pendPlay = false;
      safePlay();
    }
  });
  audio.addEventListener("play", () => {
    toggleBig.textContent = "⏸";
  });
  audio.addEventListener("pause", () => {
    toggleBig.textContent = "▶️";
  });
  audio.addEventListener("ended", () => step(1));
  audio.addEventListener("error", () => step(1));
  audio.addEventListener("timeupdate", () => {
    const d = audio.duration || 0,
      c = audio.currentTime || 0;
    elapsed.textContent = tfmt(c);
    total.textContent = tfmt(d || 0);
  });

  const CAS_W = 736,
    CAS_H = 1313;

  function fitCanvas() {
    const dpr = window.devicePixelRatio || 1,
      r = wrap.getBoundingClientRect();
    fx.width = r.width * dpr;
    fx.height = r.height * dpr;
    fx.style.width = r.width + "px";
    fx.style.height = r.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function imageRectInWrap() {
    const r = wrap.getBoundingClientRect(),
      wrapW = r.width,
      wrapH = r.height,
      wrapRatio = wrapW / wrapH,
      imgRatio = CAS_W / CAS_H;
    let w, h, x, y;
    if (wrapRatio > imgRatio) {
      h = wrapH;
      w = h * imgRatio;
      x = (wrapW - w) / 2;
      y = 0;
    } else {
      w = wrapW;
      h = w / imgRatio;
      x = 0;
      y = (wrapH - h) / 2;
    }
    return { x, y, w, h };
  }
  function holeGeom() {
    const img = imageRectInWrap(),
      cs = getComputedStyle(document.documentElement);
    const cx =
      img.x + (img.w * parseFloat(cs.getPropertyValue("--hole-x"))) / 100;
    const rr = (img.w * parseFloat(cs.getPropertyValue("--hole-r"))) / 100;
    const cy1 =
      img.y + (img.h * parseFloat(cs.getPropertyValue("--hole-top"))) / 100;
    const cy2 =
      img.y + (img.h * parseFloat(cs.getPropertyValue("--hole-bot"))) / 100;
    return { cx, cy1, cy2, rr };
  }
  function drawReel(x, y, rad, spin, progress) {
    const ring = rad * 0.92,
      inner = rad * 0.4,
      spokes = 8;
    ctx.beginPath();
    ctx.arc(x, y, ring + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, ring, -Math.PI / 2, -Math.PI / 2 + progress * 2 * Math.PI);
    ctx.strokeStyle = "#ff2ea6";
    ctx.lineWidth = 4;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ff2ea6";
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    for (let i = 0; i < spokes; i++) {
      const a = i * ((2 * Math.PI) / spokes);
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(inner, 0);
      ctx.lineTo(ring, 0);
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, inner * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.fill();
    ctx.restore();
  }
  function loop() {
    const { cx, cy1, cy2, rr } = holeGeom(),
      d = audio.duration || 0,
      c = audio.currentTime || 0,
      p = d ? c / d : 0;
    const v =
      (audio.paused ? 0 : 1) * (0.06 + 0.18 * (1 - Math.abs(0.5 - p) * 2));
    rot += v;
    ctx.clearRect(0, 0, fx.width, fx.height);
    drawReel(cx, cy1, rr, rot, p);
    drawReel(cx, cy2, rr, -rot, p);
    requestAnimationFrame(loop);
  }
  addEventListener("resize", fitCanvas);

  const pulse = (el) => {
    el.classList.add("swiping");
    setTimeout(() => el.classList.remove("swiping"), 600);
  };
  const activate = (el) => {
    el.classList.add("active");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("active"), 300);
  };

  // СКРАБ (ліва зона) — вертикальний
  (() => {
    let sy = 0,
      last = 0;
    const rate = 0.2;
    const down = (e) => {
      const p = getPt(e);
      if (!p) return;
      sy = p.clientY;
      last = audio.currentTime;
      activate(scrub);
    };
    const move = (e) => {
      if (!sy) return;
      const p = getPt(e);
      if (!p) return;
      const dy = p.clientY - sy;
      if (audio.duration) {
        audio.currentTime = Math.min(
          audio.duration,
          Math.max(0, last - dy * rate),
        );
      }
      activate(scrub);
    };
    const up = () => {
      sy = 0;
      pulse(scrub);
    };
    scrub.addEventListener("pointerdown", down);
    scrub.addEventListener("pointermove", move);
    scrub.addEventListener("pointerup", up);
    scrub.addEventListener("touchstart", down, { passive: true });
    scrub.addEventListener("touchmove", move, { passive: true });
    scrub.addEventListener("touchend", up);
  })();

  // ГОРИЗОНТАЛЬНИЙ СВАЙП ТРЕКІВ — по правій зоні та глобально (окрім лівої)
  (() => {
    const TH = 24;
    const bindSwipe = (el) => {
      let sx = 0,
        sy = 0,
        x1 = 0,
        y1 = 0,
        active = false;
      const down = (e) => {
        const p = getPt(e);
        if (!p) return;
        sx = p.clientX;
        sy = p.clientY;
        x1 = sx;
        y1 = sy;
        activate(el);
      };
      const move = (e) => {
        if (!sx) return;
        const p = getPt(e);
        if (!p) return;
        x1 = p.clientX;
        y1 = p.clientY;
        const dx = x1 - sx,
          dy = y1 - sy;
        if (!active && Math.hypot(dx, dy) > TH) active = true;
        if (active && Math.abs(dx) > Math.abs(dy)) e.preventDefault?.();
      };
      const up = () => {
        if (!sx) return;
        const dx = x1 - sx,
          dy = y1 - sy;
        if (Math.abs(dx) > TH && Math.abs(dx) > Math.abs(dy)) {
          dx < 0 ? step(1) : step(-1);
          pulse(el);
        }
        sx = sy = 0;
        active = false;
      };
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("touchstart", down, { passive: true });
      el.addEventListener("touchmove", move, { passive: false });
      el.addEventListener("touchend", up);
    };
    bindSwipe(nav); // права смуга
    bindSwipe(wrap); // глобально
    // не перехоплюємо старт у лівій зоні:
    scrub.addEventListener("pointerdown", (e) => e.stopPropagation());
    scrub.addEventListener("touchstart", (e) => e.stopPropagation());
  })();

  toggleBig.onclick = () => toggle();

  function kick() {
    audio.muted = true;
    safePlay();
  }
  document.addEventListener("pointerdown", () => kick(), { once: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && (audio.paused || audio.muted))
      kick();
  });

  (function init() {
    fitCanvas();
    loop();
    playAt(0);
  })();
})();
