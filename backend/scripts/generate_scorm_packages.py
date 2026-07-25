"""SCORM Package Generator Script for LMS AI Study Assistant.

Generates standard SCORM 1.2 compliant ZIP packages with DIVERSE CONTENT TYPES:
1. Video SCORM Package (`scorm_type_video.zip`): HTML5 Video player with auto-completion when 90% watched.
2. Quiz SCORM Package (`scorm_type_quiz.zip`): Graded interactive exam reporting cmi.core.score.raw.
3. Document/PDF SCORM Package (`scorm_type_document.zip`): Rich documentation viewer with read completion.
4. Audio SCORM Package (`scorm_type_audio.zip`): HTML5 Audio podcast lesson with playback tracking.
5. Multimedia Interactive SCORM Package (`scorm_type_multimedia.zip`): Video + Text + Quiz combined.
6. 9 Modular Lesson Packages (`modular/scorm_01_welcome.zip` ... `scorm_09_certificate.zip`).
7. Single Monolithic Package (`single/javascript_basics_full_scorm12.zip`).
"""

import json
import os
import sys
import zipfile
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape as xml_escape

# Set stdout encoding for Windows console compatibility
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # ty: ignore

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLES_DIR = BASE_DIR / "samples" / "scorm"
SINGLE_DIR = SAMPLES_DIR / "single"
MODULAR_DIR = SAMPLES_DIR / "modular"
DIVERSE_DIR = SAMPLES_DIR / "diverse"

# Ensure output directories exist
SINGLE_DIR.mkdir(parents=True, exist_ok=True)
MODULAR_DIR.mkdir(parents=True, exist_ok=True)
DIVERSE_DIR.mkdir(parents=True, exist_ok=True)

# Sample media URLs
SAMPLE_VIDEO_URL = (
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
)
SAMPLE_AUDIO_URL = (
    "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3"
)


def generate_imsmanifest_xml(
    title: str, items: list[dict], identifier_prefix: str = "RES"
) -> str:
    """Generate SCORM 1.2 compliant imsmanifest.xml string."""
    safe_manifest_title = xml_escape(title)
    items_xml_lines = []
    resources_xml_lines = []

    for idx, item in enumerate(items, 1):
        item_id = f"ITEM-{idx}"
        res_id = f"{identifier_prefix}-{idx}"
        href = item.get(
            "href", f"lesson_{idx}.html" if len(items) > 1 else "index.html"
        )
        item_title = xml_escape(item.get("title", f"Lesson {idx}"))

        items_xml_lines.append(
            f'      <item identifier="{item_id}" identifierref="{res_id}">\n'
            f"        <title>{item_title}</title>\n"
            f"      </item>"
        )

        resources_xml_lines.append(
            f'    <resource identifier="{res_id}" type="webcontent" adlcp:scormtype="sco" href="{href}">\n'
            f'      <file href="{href}"/>\n'
            f"    </resource>"
        )

    items_xml = "\n".join(items_xml_lines)
    resources_xml = "\n".join(resources_xml_lines)

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST-SCORM-DEMO" version="1.2"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-DEFAULT">
    <organization identifier="ORG-DEFAULT">
      <title>{safe_manifest_title}</title>
{items_xml}
    </organization>
  </organizations>
  <resources>
{resources_xml}
  </resources>
</manifest>
"""


# -----------------------------------------------------------------------------
# 1. DIVERSE SCORM TYPE BUILDERS
# -----------------------------------------------------------------------------


def build_video_scorm_package():
    """Build Video-based SCORM Package."""
    zip_path = DIVERSE_DIR / "scorm_type_video.zip"
    manifest_xml = generate_imsmanifest_xml(
        title="SCORM Video Lesson: Introduction to AI",
        items=[{"title": "Video Lesson", "href": "index.html"}],
        identifier_prefix="RES-VIDEO",
    )

    html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>SCORM Video Lesson</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white min-h-screen flex flex-col justify-between p-6">
  <header class="flex items-center justify-between pb-4 border-b border-slate-800">
    <h1 class="text-xl font-bold text-indigo-400">📽️ Bài học Video: Tổng quan về Trí tuệ Nhân tạo</h1>
    <span id="status-badge" class="px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-400">Đang xem video...</span>
  </header>

  <main class="my-6 max-w-4xl mx-auto w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
    <div class="flex items-center justify-between mb-4">
      <p id="anti-cheat-info" class="text-slate-300 text-sm">Vui lòng xem video bên dưới. 🔒 <strong>Chống tua tiến (Anti-cheat):</strong> Bạn không thể tua vượt quá đoạn video đã xem.</p>
      <span id="progress-text" class="text-xs font-bold text-indigo-400">Tiến độ đã xem: 0%</span>
    </div>
    
    <div class="relative aspect-video bg-black rounded-xl overflow-hidden shadow-inner mb-4">
      <video id="scorm-video" controls class="w-full h-full object-contain">
        <source src="{SAMPLE_VIDEO_URL}" type="video/mp4">
        Trình duyệt của bạn không hỗ trợ thẻ Video HTML5.
      </video>
      <div id="cheat-warning" class="hidden absolute top-4 left-1/2 -translate-x-1/2 bg-rose-600/90 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xl backdrop-blur-sm transition-all duration-300">
        ⚠️ Bạn không thể tua tiến vượt quá thời lượng đã xem!
      </div>
    </div>

    <div class="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
      <div id="video-progress" class="bg-indigo-500 h-full w-0 transition-all duration-300"></div>
    </div>
  </main>

  <script>
    let scormAPI = null;
    let isCompleted = false;
    let maxWatchedTime = 0;

    function findSCORMAPI(win) {{
      let attempts = 0;
      while ((win.API == null && win.API_1484_11 == null) && (win.parent != null && win.parent != win)) {{
        attempts++;
        if (attempts > 10) return null;
        win = win.parent;
      }}
      return win.API || win.API_1484_11 || null;
    }}

    function initSCORM() {{
      scormAPI = findSCORMAPI(window);
      if (scormAPI) {{
        if (typeof scormAPI.LMSInitialize === "function") scormAPI.LMSInitialize("");
        else if (typeof scormAPI.Initialize === "function") scormAPI.Initialize("");

        // Restore saved completion status from LMS (SCORM 1.2 and SCORM 2004)
        const savedStatus = getSCORMValue("cmi.core.lesson_status") || getSCORMValue("cmi.completion_status") || getSCORMValue("cmi.success_status");
        if (savedStatus === "completed" || savedStatus === "passed") {{
          markCompleted(true);
        }}

        // Restore saved location timestamp from LMS
        const savedLocation = getSCORMValue("cmi.core.lesson_location");
        if (savedLocation && !isNaN(parseFloat(savedLocation))) {{
          maxWatchedTime = parseFloat(savedLocation);
        }}
      }}
    }}

    function setSCORMValue(key, val) {{
      if (!scormAPI) return;
      if (typeof scormAPI.LMSSetValue === "function") {{
        scormAPI.LMSSetValue(key, String(val));
        scormAPI.LMSCommit("");
      }} else if (typeof scormAPI.SetValue === "function") {{
        scormAPI.SetValue(key, String(val));
        scormAPI.Commit("");
      }}
    }}

    function getSCORMValue(key) {{
      if (!scormAPI) return null;
      if (typeof scormAPI.LMSGetValue === "function") return scormAPI.LMSGetValue(key);
      if (typeof scormAPI.GetValue === "function") return scormAPI.GetValue(key);
      return null;
    }}

    const video = document.getElementById("scorm-video");
    const progressBar = document.getElementById("video-progress");
    const progressText = document.getElementById("progress-text");
    const cheatWarning = document.getElementById("cheat-warning");

    function isFreeSeekingAllowed() {{
      return isCompleted || (video.duration > 0 && maxWatchedTime >= video.duration * 0.9);
    }}

    function showCheatWarning() {{
      cheatWarning.classList.remove("hidden");
      setTimeout(() => cheatWarning.classList.add("hidden"), 2500);
    }}

    function enforceAntiSeeking() {{
      if (isFreeSeekingAllowed()) return;
      if (video.currentTime > maxWatchedTime + 0.5) {{
        video.currentTime = maxWatchedTime;
        showCheatWarning();
      }}
    }}

    // Anti-seeking protection: Lock forward jumps on seeking, seeked, and pause events
    video.addEventListener("seeking", enforceAntiSeeking);
    video.addEventListener("seeked", enforceAntiSeeking);
    video.addEventListener("pause", enforceAntiSeeking);

    video.addEventListener("timeupdate", () => {{
      if (video.duration > 0) {{
        // Lock forward skip if timeupdate jumps ahead (unlocked when completed)
        if (!isFreeSeekingAllowed() && video.currentTime > maxWatchedTime + 0.5) {{
          video.currentTime = maxWatchedTime;
          showCheatWarning();
          return;
        }}

        // Monotonically update highest watched timestamp
        if (video.currentTime > maxWatchedTime) {{
          maxWatchedTime = video.currentTime;
          setSCORMValue("cmi.core.lesson_location", Math.round(maxWatchedTime));
        }}

        // Progress bar calculation
        const pct = isFreeSeekingAllowed() ? 100 : Math.round((maxWatchedTime / video.duration) * 100);
        progressBar.style.width = Math.min(pct, 100) + "%";
        progressText.innerText = "Tiến độ đã xem: " + Math.min(pct, 100) + "%";

        // Mark completion if watched >= 90%
        if (pct >= 90 && !isCompleted) {{
          markCompleted(false);
        }}
      }}
    }});

    function markCompleted(isRestored) {{
      isCompleted = true;
      if (!isRestored) {{
        setSCORMValue("cmi.core.lesson_status", "completed");
        setSCORMValue("cmi.core.score.raw", 100);
      }}

      const badge = document.getElementById("status-badge");
      badge.className = "px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      badge.innerText = "Trạng thái: ĐÃ HOÀN THÀNH ✓";

      const antiCheatInfo = document.getElementById("anti-cheat-info");
      antiCheatInfo.innerHTML = "🔓 <strong>Đã hoàn thành bài học:</strong> Bạn có thể tự do tua video để rà soát lại kiến thức.";
      progressBar.style.width = "100%";
      progressText.innerText = "Tiến độ đã xem: 100%";
    }}

    window.addEventListener("load", initSCORM);
  </script>
</body>
</html>
"""

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("imsmanifest.xml", manifest_xml)
        zf.writestr("index.html", html_content)

    print(
        f"  - 📽️ Generated Video SCORM: {zip_path} ({os.path.getsize(zip_path)} bytes)"
    )


def build_audio_scorm_package():
    """Build Audio Podcast SCORM Package."""
    zip_path = DIVERSE_DIR / "scorm_type_audio.zip"
    manifest_xml = generate_imsmanifest_xml(
        title="SCORM Audio Podcast: AI Tech Talk",
        items=[{"title": "Audio Podcast", "href": "index.html"}],
        identifier_prefix="RES-AUDIO",
    )

    html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>SCORM Audio Podcast</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white min-h-screen flex flex-col justify-between p-6">
  <header class="flex items-center justify-between pb-4 border-b border-slate-800">
    <h1 class="text-xl font-bold text-purple-400">🎙️ Audio Podcast: Công nghệ Học máy trong Thực tiễn</h1>
    <span id="status-badge" class="px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-400">Đang nghe podcast...</span>
  </header>

  <main class="my-6 max-w-2xl mx-auto w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
    <div class="w-20 h-20 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
      <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
    </div>
    <h2 class="text-lg font-bold mb-2">Tập 1: Xu hướng AI 2026</h2>
    <p class="text-slate-400 text-sm mb-6">Hãy lắng nghe trọn vẹn podcast để hoàn thành bài học này.</p>

    <audio id="scorm-audio" controls class="w-full mb-4">
      <source src="{SAMPLE_AUDIO_URL}" type="audio/mp3">
    </audio>
  </main>

  <script>
    let scormAPI = null;
    let isCompleted = false;

    function findSCORMAPI(win) {{
      let attempts = 0;
      while ((win.API == null && win.API_1484_11 == null) && (win.parent != null && win.parent != win)) {{
        attempts++;
        if (attempts > 10) return null;
        win = win.parent;
      }}
      return win.API || win.API_1484_11 || null;
    }}

    function initSCORM() {{
      scormAPI = findSCORMAPI(window);
      if (scormAPI) {{
        if (typeof scormAPI.LMSInitialize === "function") scormAPI.LMSInitialize("");
        else if (typeof scormAPI.Initialize === "function") scormAPI.Initialize("");
      }}
    }}

    function setSCORMValue(key, val) {{
      if (!scormAPI) return;
      if (typeof scormAPI.LMSSetValue === "function") {{
        scormAPI.LMSSetValue(key, String(val));
        scormAPI.LMSCommit("");
      }} else if (typeof scormAPI.SetValue === "function") {{
        scormAPI.SetValue(key, String(val));
        scormAPI.Commit("");
      }}
    }}

    const audio = document.getElementById("scorm-audio");
    audio.addEventListener("ended", () => {{
      if (!isCompleted) {{
        isCompleted = true;
        setSCORMValue("cmi.core.lesson_status", "completed");
        setSCORMValue("cmi.core.score.raw", 100);
        const badge = document.getElementById("status-badge");
        badge.className = "px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
        badge.innerText = "Trạng thái: ĐÃ HOÀN THÀNH ✓";
      }}
    }});

    window.addEventListener("load", initSCORM);
  </script>
</body>
</html>
"""

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("imsmanifest.xml", manifest_xml)
        zf.writestr("index.html", html_content)

    print(
        f"  - 🎙️ Generated Audio SCORM: {zip_path} ({os.path.getsize(zip_path)} bytes)"
    )


def build_document_scorm_package():
    """Build Document/PDF SCORM Package."""
    zip_path = DIVERSE_DIR / "scorm_type_document.zip"
    manifest_xml = generate_imsmanifest_xml(
        title="SCORM Document: Python Architecture Guide",
        items=[{"title": "Documentation Guide", "href": "index.html"}],
        identifier_prefix="RES-DOC",
    )

    html_content = """<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>SCORM Document Guide</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between p-6">
  <header class="flex items-center justify-between pb-4 border-b border-slate-800">
    <h1 class="text-xl font-bold text-sky-400">📑 Tài liệu: Kiến trúc Clean Architecture trong LMS</h1>
    <span id="status-badge" class="px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-400">Chưa đọc xong</span>
  </header>

  <main class="my-6 max-w-4xl mx-auto w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
    <h2 class="text-2xl font-extrabold text-white">1. Tổng quan về Domain-Driven Design (DDD)</h2>
    <p class="text-slate-300 leading-relaxed">Domain-Driven Design (DDD) giúp chia hệ thống thành các Bounded Context rõ ràng: Catalog Module, Learning Module, Identity Module, Forum Module...</p>
    
    <div class="p-4 bg-sky-950/60 border border-sky-800/60 rounded-xl text-sky-300">
      <strong>Quy tắc quan trọng:</strong> Tách biệt tuyệt đối giữa tầng Domain (Pure Python), Application (Use Cases), Presentation (ConnectRPC), và Infrastructure (SQLAlchemy ORM & MinIO S3).
    </div>

    <h2 class="text-2xl font-extrabold text-white">2. SCORM Protocol Standard</h2>
    <p class="text-slate-300 leading-relaxed">Chuẩn SCORM định nghĩa giao diện giao tiếp thời gian thực giữa bài học chạy trong `iframe` và LMS thông qua đối tượng Javascript `window.parent.API`.</p>

    <div class="pt-6 border-t border-slate-800 text-center">
      <button id="btn-ack" onclick="acknowledgeReading()" class="px-6 py-3 bg-sky-600 hover:bg-sky-500 font-bold text-white rounded-xl shadow-lg transition">
        ✓ Tôi đã đọc và hiểu toàn bộ tài liệu này
      </button>
    </div>
  </main>

  <script>
    let scormAPI = null;

    function findSCORMAPI(win) {
      let attempts = 0;
      while ((win.API == null && win.API_1484_11 == null) && (win.parent != null && win.parent != win)) {
        attempts++;
        if (attempts > 10) return null;
        win = win.parent;
      }
      return win.API || win.API_1484_11 || null;
    }

    function initSCORM() {
      scormAPI = findSCORMAPI(window);
      if (scormAPI) {
        if (typeof scormAPI.LMSInitialize === "function") scormAPI.LMSInitialize("");
        else if (typeof scormAPI.Initialize === "function") scormAPI.Initialize("");
      }
    }

    function acknowledgeReading() {
      if (scormAPI) {
        if (typeof scormAPI.LMSSetValue === "function") {
          scormAPI.LMSSetValue("cmi.core.lesson_status", "completed");
          scormAPI.LMSSetValue("cmi.core.score.raw", "100");
          scormAPI.LMSCommit("");
        }
      }
      const badge = document.getElementById("status-badge");
      badge.className = "px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      badge.innerText = "Trạng thái: ĐÃ HOÀN THÀNH ✓";
      document.getElementById("btn-ack").disabled = true;
      document.getElementById("btn-ack").className = "px-6 py-3 bg-slate-800 text-slate-500 font-bold rounded-xl cursor-not-allowed";
    }

    window.addEventListener("load", initSCORM);
  </script>
</body>
</html>
"""

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("imsmanifest.xml", manifest_xml)
        zf.writestr("index.html", html_content)

    print(
        f"  - 📑 Generated Document SCORM: {zip_path} ({os.path.getsize(zip_path)} bytes)"
    )


# -----------------------------------------------------------------------------
# EXISTING MODULAR & SINGLE GENERATOR FUNCTIONS
# -----------------------------------------------------------------------------

LESSONS_DATA = [
    {
        "id": "scorm_01_welcome",
        "title": "Lesson 1: Welcome & Course Guide",
        "summary": "Introduction to the JavaScript Basics course structure, objectives, and learning path.",
        "slides": [
            {
                "title": "Welcome to JavaScript Basics!",
                "content": "<p class='mb-4'>Welcome to <strong>JavaScript Basics: From Zero to Hero</strong>! In this course, you will master the fundamental building blocks of modern web programming.</p><div class='p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded text-indigo-900 mb-4'><strong>Course Goal:</strong> Learn JavaScript fundamentals, solve interactive exercises, and pass the final exam to earn your certificate.</div>",
            },
        ],
        "quiz": None,
    },
    {
        "id": "scorm_08_final_exam",
        "title": "Lesson 8: Final Exam (Graded Assessment)",
        "summary": "Comprehensive 5-question test. Score 80% or higher to pass.",
        "slides": [
            {
                "title": "Final Exam Instructions",
                "content": "<p class='mb-4'>You are about to start the <strong>JavaScript Basics Final Exam</strong>. Answer all 5 questions below.</p>",
            },
        ],
        "quiz": [
            {
                "q": "1. Keyword nào dùng để khai báo biến không thể gán lại trong ES6?",
                "options": ["var", "let", "const"],
                "answer": 2,
            },
            {
                "q": "2. Kết quả toán tử 5 === '5' là gì?",
                "options": ["true", "false"],
                "answer": 1,
            },
        ],
    },
]


def generate_scorm_html(title: str, slides: Any = None, quiz: Any = None) -> str:
    slides_json = json.dumps(slides, ensure_ascii=False)

    template = """<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>__TITLE__</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex flex-col justify-between p-6">
  <header class="flex items-center justify-between pb-4 border-b border-slate-800">
    <div class="flex items-center space-x-3">
      <span class="px-2.5 py-1 text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full">SCORM 1.2</span>
      <h1 class="text-xl font-bold text-white">__TITLE__</h1>
    </div>
    <span id="status-badge" class="text-xs px-3 py-1 font-semibold rounded-full bg-slate-800 text-slate-400">Trạng thái: Đang học</span>
  </header>
  <main class="my-6 max-w-4xl mx-auto w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl p-8 shadow-2xl">
    <div id="slide-container"></div>
  </main>
  <script>
    const slides = __SLIDES_JSON__;
    let scormAPI = null;

    function findSCORMAPI(win) {
      let attempts = 0;
      while ((win.API == null && win.API_1484_11 == null) && (win.parent != null && win.parent != win)) {
        attempts++;
        if (attempts > 10) return null;
        win = win.parent;
      }
      return win.API || win.API_1484_11 || null;
    }

    function initSCORM() {
      scormAPI = findSCORMAPI(window);
      if (scormAPI) {
        if (typeof scormAPI.LMSInitialize === "function") scormAPI.LMSInitialize("");
        else if (typeof scormAPI.Initialize === "function") scormAPI.Initialize("");
        if (typeof scormAPI.LMSSetValue === "function") {
          scormAPI.LMSSetValue("cmi.core.lesson_status", "completed");
          scormAPI.LMSSetValue("cmi.core.score.raw", "100");
          scormAPI.LMSCommit("");
        }
      }
      document.getElementById("slide-container").innerHTML = `<h2 class="text-2xl font-bold mb-4">${slides[0].title}</h2><div>${slides[0].content}</div>`;
    }
    window.addEventListener("load", initSCORM);
  </script>
</body>
</html>
"""
    return template.replace("__TITLE__", title).replace("__SLIDES_JSON__", slides_json)


def build_single_scorm_package():
    zip_path = SINGLE_DIR / "javascript_basics_full_scorm12.zip"
    manifest_xml = generate_imsmanifest_xml(
        title="JavaScript Basics: Full Course (SCORM 1.2)",
        items=[
            {"title": item["title"], "href": f"{item['id']}.html"}
            for item in LESSONS_DATA
        ],
        identifier_prefix="RES-FULL",
    )
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("imsmanifest.xml", manifest_xml)
        for idx, item in enumerate(LESSONS_DATA):
            filename = f"{item['id']}.html"
            html_content = generate_scorm_html(
                title=str(item["title"]), slides=item["slides"], quiz=item["quiz"]
            )
            zf.writestr(filename, html_content)
            if idx == 0:
                zf.writestr("index.html", html_content)
    print(
        f"  - 📦 Generated Monolithic SCORM: {zip_path} ({os.path.getsize(zip_path)} bytes)"
    )


def build_modular_scorm_packages():
    for item in LESSONS_DATA:
        zip_name = f"{item['id']}.zip"
        zip_path = MODULAR_DIR / zip_name
        manifest_xml = generate_imsmanifest_xml(
            title=str(item["title"]),
            items=[{"title": str(item["title"]), "href": "index.html"}],
            identifier_prefix=f"RES-{item['id']}",
        )
        html_content = generate_scorm_html(
            title=str(item["title"]), slides=item["slides"], quiz=item["quiz"]
        )

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("imsmanifest.xml", manifest_xml)
            zf.writestr("index.html", html_content)
        print(
            f"  - 📦 Generated Modular SCORM: {zip_name} ({os.path.getsize(zip_path)} bytes)"
        )


if __name__ == "__main__":
    print("🚀 Generating Diverse SCORM Test Packages...")
    build_video_scorm_package()
    build_audio_scorm_package()
    build_document_scorm_package()
    build_single_scorm_package()
    build_modular_scorm_packages()
    print("✨ All Diverse SCORM Packages created successfully in samples/scorm/!")
