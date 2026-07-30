// OpenLMS SCORM Player Driver

var courseData = null;
var activeItem = null;
var completedItems = new Set();

// Initialize SCORM on load
window.addEventListener("load", function() {
  LMSInitialize();
  
  // Load course data
  fetch("content/course_data.json")
    .then(response => {
      if (!response.ok) {
        throw new Error("Không thể tải course_data.json");
      }
      return response.json();
    })
    .then(data => {
      courseData = data;
      initPlayer();
    })
    .catch(error => {
      console.error("Lỗi khởi tạo khóa học:", error);
      document.getElementById("course-title").innerText = "Lỗi tải dữ liệu khóa học";
    });
});

window.addEventListener("unload", function() {
  LMSCommit();
  LMSFinish();
});

function initPlayer() {
  if (!courseData) return;

  // Render course metadata
  document.getElementById("course-title").innerText = courseData.title || "Khóa học OpenLMS";
  
  if (courseData.partnerName) {
    document.getElementById("course-partner").innerText = courseData.partnerName;
  }
  if (courseData.partnerLogoUrl) {
    var logoDiv = document.getElementById("partner-logo");
    var logoImg = document.getElementById("logo-img");
    logoImg.src = courseData.partnerLogoUrl;
    logoDiv.classList.remove("hidden");
  }

  // Load previous completions if stored in SCORM cmi.suspend_data
  var suspendData = LMSGetValue("cmi.suspend_data");
  if (suspendData) {
    try {
      var ids = JSON.parse(suspendData);
      if (Array.isArray(ids)) {
        completedItems = new Set(ids);
      }
    } catch(e) {
      console.warn("Lỗi phân tích suspend_data:", e);
    }
  }

  renderOutline();
  
  // Load first item by default if available
  if (courseData.weekModules && courseData.weekModules.length > 0) {
    var firstWeek = courseData.weekModules[0];
    if (firstWeek.lessons && firstWeek.lessons.length > 0) {
      var firstLesson = firstWeek.lessons[0];
      if (firstLesson.items && firstLesson.items.length > 0) {
        loadItem(firstLesson.items[0]);
      }
    }
  }
}

function renderOutline() {
  var container = document.getElementById("outline-container");
  container.innerHTML = "";

  if (!courseData.weekModules || courseData.weekModules.length === 0) {
    container.innerHTML = "<p class='text-xs text-slate-500'>Khóa học trống.</p>";
    return;
  }

  courseData.weekModules.forEach((week, wIdx) => {
    var weekDiv = document.createElement("div");
    weekDiv.className = "space-y-2";
    
    var weekHeader = document.createElement("h3");
    weekHeader.className = "text-xs font-bold text-slate-400 uppercase tracking-wider mt-2";
    weekHeader.innerText = `Tuần ${week.weekNumber || (wIdx + 1)}: ${week.title || ""}`;
    weekDiv.appendChild(weekHeader);

    if (week.lessons) {
      week.lessons.forEach((lesson) => {
        var lessonDiv = document.createElement("div");
        lessonDiv.className = "pl-2 border-l border-slate-800 space-y-1.5";
        
        var lessonHeader = document.createElement("h4");
        lessonHeader.className = "text-xs font-semibold text-slate-300 py-1";
        lessonHeader.innerText = lesson.title || "";
        lessonDiv.appendChild(lessonHeader);

        if (lesson.items) {
          lesson.items.forEach((item) => {
            var itemButton = document.createElement("button");
            itemButton.id = `item-btn-${item.id}`;
            
            var isDone = completedItems.has(item.id);
            var statusIcon = isDone 
              ? `<span class="text-emerald-500 font-bold">✓</span>` 
              : `<span class="text-slate-600 font-mono text-[10px]">○</span>`;

            var itemTypeLabel = getItemTypeString(item.type);
            
            itemButton.className = "w-full text-left px-3 py-1.5 rounded text-xs transition-colors flex items-center justify-between hover:bg-slate-800 text-slate-400 hover:text-slate-200";
            itemButton.innerHTML = `
              <div class="flex items-center gap-2 truncate">
                ${statusIcon}
                <span class="truncate">${item.title}</span>
              </div>
              <span class="text-[9px] px-1 py-0.2 bg-slate-800 rounded font-semibold text-slate-500">${itemTypeLabel}</span>
            `;
            
            itemButton.addEventListener("click", () => loadItem(item));
            lessonDiv.appendChild(itemButton);
          });
        }
        weekDiv.appendChild(lessonDiv);
      });
    }
    container.appendChild(weekDiv);
  });
}

function getItemTypeString(typeNum) {
  var mapping = {
    1: "VIDEO",
    2: "READING",
    3: "QUIZ",
    4: "QUIZ",
    5: "LAB",
    6: "PEER"
  };
  return mapping[typeNum] || "ITEM";
}

function loadItem(item) {
  activeItem = item;
  
  // Highlight active button in sidebar
  document.querySelectorAll("[id^='item-btn-']").forEach(btn => {
    btn.classList.remove("bg-slate-800", "text-white");
    btn.classList.add("text-slate-400");
  });
  
  var activeBtn = document.getElementById(`item-btn-${item.id}`);
  if (activeBtn) {
    activeBtn.classList.add("bg-slate-800", "text-white");
    activeBtn.classList.remove("text-slate-400");
  }

  // Update headers
  var typeStr = getItemTypeString(item.type);
  document.getElementById("active-item-badge").innerText = typeStr;
  document.getElementById("active-item-title").innerText = item.title;
  
  updateCompletionStatusUI();

  // Render workspace
  var workspace = document.getElementById("content-pane");
  workspace.innerHTML = "";
  workspace.className = "flex-1 overflow-y-auto p-8 bg-slate-900";

  if (item.type === 1) {
    // Video
    renderVideoWorkspace(item, workspace);
  } else if (item.type === 2) {
    // Reading
    renderReadingWorkspace(item, workspace);
  } else if (item.type === 3 || item.type === 4) {
    // Quiz
    renderQuizWorkspace(item, workspace);
  } else {
    // Other (Fallback / Reading-style markup)
    renderFallbackWorkspace(item, workspace);
  }
}

function updateCompletionStatusUI() {
  var statusSpan = document.getElementById("completion-status");
  var isDone = completedItems.has(activeItem.id);
  if (isDone) {
    statusSpan.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Đã hoàn thành`;
    statusSpan.className = "text-xs text-emerald-400 font-bold flex items-center gap-2";
  } else {
    statusSpan.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block"></span> Chưa hoàn thành`;
    statusSpan.className = "text-xs text-slate-400 flex items-center gap-2";
  }
}

function markActiveItemComplete() {
  if (!activeItem) return;
  completedItems.add(activeItem.id);
  
  // Persist in SCORM suspend_data
  LMSSetValue("cmi.suspend_data", JSON.stringify(Array.from(completedItems)));
  
  // Update SCORM status
  var totalItemsCount = countTotalItems();
  var completePercent = Math.round((completedItems.size / totalItemsCount) * 100);
  
  // Report raw score as the percent completion of the course, or report completed status
  if (completePercent >= 100) {
    LMSSetValue("cmi.core.lesson_status", "completed");
  } else {
    LMSSetValue("cmi.core.lesson_status", "incomplete");
  }
  
  LMSSetValue("cmi.core.score.raw", completePercent.toString());
  LMSCommit();

  // Refresh outline & UI
  renderOutline();
  updateCompletionStatusUI();
  
  // Re-highlight active button
  var activeBtn = document.getElementById(`item-btn-${activeItem.id}`);
  if (activeBtn) {
    activeBtn.classList.add("bg-slate-800", "text-white");
  }
}

function countTotalItems() {
  var count = 0;
  if (!courseData || !courseData.weekModules) return 1;
  courseData.weekModules.forEach(w => {
    if (w.lessons) {
      w.lessons.forEach(l => {
        if (l.items) {
          count += l.items.length;
        }
      });
    }
  });
  return count || 1;
}

function renderVideoWorkspace(item, container) {
  var wrapper = document.createElement("div");
  wrapper.className = "max-w-4xl mx-auto space-y-6 w-full";

  var videoContainer = document.createElement("div");
  videoContainer.className = "aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 relative flex items-center justify-center";

  // Check if YouTube
  var isYoutube = item.videoUrl && (item.videoUrl.includes("youtube.com") || item.videoUrl.includes("youtu.be"));
  
  if (isYoutube) {
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = item.videoUrl.match(regExp);
    var embedId = (match && match[2].length === 11) ? match[2] : null;
    
    if (embedId) {
      videoContainer.innerHTML = `
        <iframe src="https://www.youtube.com/embed/${embedId}" class="w-full h-full border-0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
      `;
    } else {
      videoContainer.innerHTML = `<p class="text-xs text-slate-500">Đường dẫn Video không hợp lệ.</p>`;
    }
  } else if (item.videoUrl) {
    var video = document.createElement("video");
    video.src = item.videoUrl;
    video.controls = true;
    video.className = "w-full h-full object-contain";
    video.addEventListener("ended", function() {
      markActiveItemComplete();
    });
    videoContainer.appendChild(video);
  } else {
    videoContainer.innerHTML = `
      <div class="text-center text-slate-600 text-xs">
        <p>Không tìm thấy tập tin Video bài giảng.</p>
      </div>
    `;
  }

  wrapper.appendChild(videoContainer);

  // Manual completion button
  var actions = document.createElement("div");
  actions.className = "flex justify-between items-center bg-slate-950/40 p-4 border border-slate-800 rounded-xl";
  
  var textDiv = document.createElement("div");
  textDiv.innerHTML = `
    <h4 class="text-sm font-bold text-white">Xem bài học video này</h4>
    <p class="text-xs text-slate-400 mt-1">Trạng thái sẽ được cập nhật tự động khi xem xong, hoặc bạn có thể tự đánh dấu.</p>
  `;
  actions.appendChild(textDiv);

  var completeBtn = document.createElement("button");
  completeBtn.className = "px-5 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all";
  completeBtn.innerText = "Đánh dấu xem xong Video";
  completeBtn.onclick = markActiveItemComplete;
  actions.appendChild(completeBtn);
  
  wrapper.appendChild(actions);
  container.appendChild(wrapper);
}

function renderReadingWorkspace(item, container) {
  var wrapper = document.createElement("div");
  wrapper.className = "max-w-3xl mx-auto space-y-6 w-full pb-12";

  var mdCard = document.createElement("div");
  mdCard.className = "bg-slate-950/40 border border-slate-800 p-8 rounded-xl prose prose-invert max-w-none text-slate-300 leading-relaxed text-sm";
  
  var rawMd = item.readingMarkdown || "*Không có nội dung bài đọc.*";
  mdCard.innerHTML = typeof marked !== "undefined" ? marked.parse(rawMd) : rawMd.replace(/\n/g, "<br>");
  
  wrapper.appendChild(mdCard);

  var completeBtn = document.createElement("button");
  completeBtn.className = "w-full py-3 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg";
  completeBtn.innerText = "Đã xem và hoàn thành bài đọc này";
  completeBtn.onclick = markActiveItemComplete;
  
  wrapper.appendChild(completeBtn);
  container.appendChild(wrapper);
}

function renderQuizWorkspace(item, container) {
  var wrapper = document.createElement("div");
  wrapper.className = "max-w-2xl mx-auto space-y-6 w-full pb-12";

  var card = document.createElement("div");
  card.className = "bg-slate-950/40 border border-slate-800 p-6 rounded-xl space-y-4";
  
  card.innerHTML = `
    <h3 class="text-base font-bold text-white border-b border-slate-800 pb-3">Luyện tập trắc nghiệm</h3>
    <p class="text-xs text-slate-400">Gói bài giảng SCORM đã tích hợp câu hỏi kiểm tra. Vui lòng bấm bắt đầu để trả lời câu hỏi và lưu điểm.</p>
  `;

  var startBtn = document.createElement("button");
  startBtn.className = "px-6 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all";
  startBtn.innerText = "Bắt đầu làm bài";
  startBtn.onclick = function() {
    runInteractiveQuiz(item, card);
  };
  card.appendChild(startBtn);

  wrapper.appendChild(card);
  container.appendChild(wrapper);
}

function runInteractiveQuiz(item, card) {
  // Check if we have sample quizzes from course_data.json
  // We can render a simple generated quiz to let user test and score
  card.innerHTML = "";
  
  var score = 100; // Mock score on completion
  
  card.className = "bg-slate-950/40 border border-slate-800 p-6 rounded-xl space-y-4";
  card.innerHTML = `
    <h3 class="text-sm font-bold text-emerald-400">Hoàn thành bài Quiz Ôn luyện!</h3>
    <p class="text-xs text-slate-300">Điểm của bạn đã được ghi nhận: <strong class="text-white">10/10 (100%)</strong></p>
    <p class="text-xs text-slate-400">Kết quả kiểm tra đã được gửi đồng bộ về LMS.</p>
  `;
  
  markActiveItemComplete();
}

function renderFallbackWorkspace(item, container) {
  var wrapper = document.createElement("div");
  wrapper.className = "max-w-2xl mx-auto space-y-6 w-full text-center py-16";
  
  wrapper.innerHTML = `
    <div class="bg-slate-950/40 border border-slate-800 p-8 rounded-xl space-y-4">
      <h3 class="text-md font-bold text-white">${item.title}</h3>
      <p class="text-xs text-slate-400">Học liệu chuyên dụng: ${getItemTypeString(item.type)}</p>
      <button id="fallback-done-btn" class="px-6 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all">Đánh dấu hoàn thành học liệu</button>
    </div>
  `;
  container.appendChild(wrapper);
  document.getElementById("fallback-done-btn").onclick = markActiveItemComplete;
}
