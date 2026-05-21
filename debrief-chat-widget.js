(function () {
  "use strict";

  var booted = false;
  var viewerObserver = null;

  function isViewerReady() {
    var appCard = document.getElementById("appCard");
    return Boolean(appCard && !appCard.classList.contains("hidden"));
  }

  function stopObserver() {
    if (viewerObserver) {
      viewerObserver.disconnect();
      viewerObserver = null;
    }
  }

  function bootWidget() {
    if (booted || document.getElementById("debrief-chat-root")) return;
    booted = true;

    var root = document.createElement("div");
    root.id = "debrief-chat-root";
    document.body.appendChild(root);

    var API_URL = "/api/chat";
    var WELCOME = "Hi, I'm the Debrief assistant. I can help you understand the app, connect Telegram, or send your first training note. What would you like help with?";
    var QUICK_REPLIES = [
      { label: "How does it work?", text: "How does Debrief work?" },
      { label: "Connect Telegram", text: "Walk me through connecting Telegram." },
      { label: "First note", text: "How do I send my first debrief note?" },
      { label: "Pricing", text: "How much does Debrief cost?" },
      { label: "Missing notes", text: "My Telegram notes are not showing up." },
    ];

    var css = [
      "#debrief-chat-root{pointer-events:none!important;}",
      "#dchat-btn,#dchat-window{pointer-events:all!important;}",
      "#dchat-btn{position:fixed!important;right:24px!important;bottom:24px!important;width:62px!important;height:62px!important;border-radius:50%!important;background:linear-gradient(135deg,#ffca76,#c66d34)!important;color:#17110a!important;border:0!important;cursor:pointer!important;box-shadow:0 14px 38px rgba(198,109,52,.42)!important;font:900 24px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:0!important;margin:0!important;transition:transform .2s,box-shadow .2s!important;}",
      "#dchat-btn:hover{transform:scale(1.07)!important;box-shadow:0 18px 48px rgba(198,109,52,.52)!important;}",
      "#dchat-window{position:fixed!important;right:24px!important;bottom:94px!important;width:370px!important;height:min(560px,calc(100vh - 116px))!important;border:1px solid rgba(255,255,255,.16)!important;border-radius:18px!important;background:#11131a!important;color:#f7f4ee!important;box-shadow:0 28px 80px rgba(0,0,0,.45)!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;z-index:2147483646!important;opacity:0!important;transform:translateY(12px) scale(.98)!important;transition:opacity .22s,transform .22s!important;pointer-events:none!important;}",
      "#dchat-window.dopen{opacity:1!important;transform:translateY(0) scale(1)!important;pointer-events:all!important;}",
      "#dchat-header{display:flex!important;align-items:center!important;gap:11px!important;padding:14px 16px!important;background:linear-gradient(135deg,#191b24,#282331)!important;border-bottom:1px solid rgba(255,255,255,.1)!important;}",
      "#dchat-avatar{width:40px!important;height:40px!important;border-radius:12px!important;background:linear-gradient(135deg,#ffca76,#c66d34)!important;color:#17110a!important;display:flex!important;align-items:center!important;justify-content:center!important;font-weight:900!important;}",
      "#dchat-title h3{margin:0!important;font-size:15px!important;color:#fff!important;}#dchat-title p{margin:3px 0 0!important;font-size:12px!important;color:#b8bdc9!important;}",
      "#dchat-x{margin-left:auto!important;background:transparent!important;border:0!important;color:#f7f4ee!important;cursor:pointer!important;font-size:20px!important;padding:4px!important;opacity:.7!important;}",
      "#dchat-msgs{flex:1!important;min-height:0!important;overflow-y:auto!important;padding:14px 12px!important;display:flex!important;flex-direction:column!important;gap:10px!important;background:#0d0f15!important;}",
      ".dm{display:flex!important;gap:8px!important;max-width:88%!important;}.dm.dbot{align-self:flex-start!important;}.dm.duser{align-self:flex-end!important;flex-direction:row-reverse!important;}",
      ".dm-av{width:28px!important;height:28px!important;border-radius:9px!important;background:linear-gradient(135deg,#ffca76,#c66d34)!important;color:#17110a!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:12px!important;font-weight:900!important;flex-shrink:0!important;align-self:flex-end!important;}",
      ".dm-b{padding:9px 13px!important;border-radius:16px!important;font-size:14px!important;line-height:1.55!important;max-width:100%!important;word-break:break-word!important;}.dm.dbot .dm-b{background:#1d202a!important;color:#f7f4ee!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:16px 16px 16px 5px!important;}.dm.duser .dm-b{background:linear-gradient(135deg,#ffca76,#c66d34)!important;color:#17110a!important;border-radius:16px 16px 5px 16px!important;font-weight:700!important;}",
      ".dm-b a{color:#ffca76!important;text-decoration:underline!important;}.dm.duser .dm-b a{color:#17110a!important;}",
      ".dtyp{display:flex!important;gap:4px!important;padding:10px 13px!important;background:#1d202a!important;border-radius:16px 16px 16px 5px!important;align-self:flex-start!important;}.dtyp span{width:7px!important;height:7px!important;background:#ffca76!important;border-radius:50%!important;animation:db 1.2s infinite!important;opacity:.65!important;}.dtyp span:nth-child(2){animation-delay:.2s!important;}.dtyp span:nth-child(3){animation-delay:.4s!important;}@keyframes db{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}",
      "#dqr{display:flex!important;flex-wrap:wrap!important;gap:6px!important;padding:2px 4px 8px!important;}.dqr-btn{background:#151821!important;border:1px solid rgba(255,202,118,.45)!important;color:#ffca76!important;border-radius:999px!important;padding:6px 10px!important;font-size:12px!important;line-height:1.35!important;cursor:pointer!important;font-family:inherit!important;}.dqr-btn:hover{background:#ffca76!important;color:#17110a!important;}",
      "#dchat-input-row{display:flex!important;gap:8px!important;padding:11px 12px!important;background:#11131a!important;border-top:1px solid rgba(255,255,255,.1)!important;}#dchat-in{flex:1!important;min-width:0!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:999px!important;padding:10px 14px!important;background:#080a0f!important;color:#f7f4ee!important;font-size:14px!important;outline:0!important;font-family:inherit!important;}#dchat-in:focus{border-color:#ffca76!important;}#dchat-go{min-width:54px!important;height:40px!important;border-radius:999px!important;border:0!important;background:linear-gradient(135deg,#ffca76,#c66d34)!important;color:#17110a!important;cursor:pointer!important;font-weight:900!important;display:flex!important;align-items:center!important;justify-content:center!important;}#dchat-go:disabled{opacity:.45!important;cursor:default!important;}",
      "#dchat-foot{text-align:center!important;padding:6px!important;font-size:11px!important;color:#7e879a!important;background:#11131a!important;}",
      "@media(max-width:480px){#dchat-window{right:0!important;bottom:0!important;width:100%!important;height:92vh!important;border-radius:18px 18px 0 0!important;}#dchat-btn{right:16px!important;bottom:16px!important;}}",
    ].join("");

    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    root.innerHTML =
      '<button id="dchat-btn" aria-label="Open Debrief help">?</button>' +
      '<div id="dchat-window" role="dialog" aria-label="Debrief Chat Assistant">' +
      '<div id="dchat-header"><div id="dchat-avatar">D</div><div id="dchat-title"><h3>Debrief Assistant</h3><p>Setup and first-note help</p></div><button id="dchat-x" aria-label="Close">x</button></div>' +
      '<div id="dchat-msgs"></div>' +
      '<div id="dchat-input-row"><input id="dchat-in" type="text" placeholder="Ask about setup, Telegram, pricing..." maxlength="500"><button id="dchat-go" aria-label="Send">Send</button></div>' +
      '<div id="dchat-foot">Debrief beta assistant</div>' +
      '</div>';

    var open = false;
    var loading = false;
    var history = [];
    var btn = document.getElementById("dchat-btn");
    var win = document.getElementById("dchat-window");
    var close = document.getElementById("dchat-x");
    var msgs = document.getElementById("dchat-msgs");
    var input = document.getElementById("dchat-in");
    var sendButton = document.getElementById("dchat-go");

    function escapeHtml(text) {
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function format(text) {
      var safe = escapeHtml(text);
      safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      safe = safe.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
      return safe.replace(/\n/g, "<br>");
    }

    function scroll() {
      msgs.scrollTop = msgs.scrollHeight;
    }

    function addBot(text) {
      var row = document.createElement("div");
      row.className = "dm dbot";
      row.innerHTML = '<div class="dm-av">D</div><div class="dm-b">' + format(text) + "</div>";
      msgs.appendChild(row);
      scroll();
    }

    function addUser(text) {
      var row = document.createElement("div");
      row.className = "dm duser";
      row.innerHTML = '<div class="dm-b">' + escapeHtml(text) + "</div>";
      msgs.appendChild(row);
      scroll();
    }

    function addQuickReplies() {
      var wrap = document.createElement("div");
      wrap.id = "dqr";
      QUICK_REPLIES.forEach(function (reply) {
        var item = document.createElement("button");
        item.className = "dqr-btn";
        item.type = "button";
        item.textContent = reply.label;
        item.addEventListener("click", function () {
          var quick = document.getElementById("dqr");
          if (quick) quick.remove();
          input.value = reply.text;
          send();
        });
        wrap.appendChild(item);
      });
      msgs.appendChild(wrap);
      scroll();
    }

    function showTyping() {
      var typing = document.createElement("div");
      typing.id = "dtyp";
      typing.className = "dtyp";
      typing.innerHTML = "<span></span><span></span><span></span>";
      msgs.appendChild(typing);
      scroll();
    }

    function hideTyping() {
      var typing = document.getElementById("dtyp");
      if (typing) typing.remove();
    }

    function toggle() {
      open = !open;
      win.classList.toggle("dopen", open);
      btn.textContent = open ? "×" : "?";
      if (open && msgs.childElementCount === 0) {
        addBot(WELCOME);
        addQuickReplies();
      }
      if (open) window.setTimeout(function () { input.focus(); }, 220);
    }

    async function send() {
      var text = input.value.trim();
      if (!text || loading) return;
      input.value = "";
      loading = true;
      sendButton.disabled = true;
      var quick = document.getElementById("dqr");
      if (quick) quick.remove();
      addUser(text);
      history.push({ role: "user", content: text });
      showTyping();

      try {
        var response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });
        hideTyping();
        var data = await response.json();
        if (response.status === 429) {
          addBot("You've sent a lot of messages. Please wait a bit before trying again.");
          return;
        }
        if (!response.ok) throw new Error(data.error || "Chat request failed");
        var reply = data.reply || "Sorry, I could not get a response. Please try again.";
        addBot(reply);
        history.push({ role: "assistant", content: reply });
        if (history.length > 20) history = history.slice(-20);
      } catch (_error) {
        hideTyping();
        addBot("I could not reach the assistant right now. You can still use Sign Up, Log In, or Telegram setup from the page.");
      } finally {
        loading = false;
        sendButton.disabled = false;
        input.focus();
      }
    }

    btn.addEventListener("click", toggle);
    close.addEventListener("click", toggle);
    sendButton.addEventListener("click", send);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        send();
      }
    });
  }

  function init() {
    if (booted || document.getElementById("debrief-chat-root")) return;
    if (!window.__debriefViewerReady) return;
    if (isViewerReady()) {
      stopObserver();
      bootWidget();
      return;
    }

    var appCard = document.getElementById("appCard");
    if (!appCard || viewerObserver) return;

    viewerObserver = new MutationObserver(function () {
      if (isViewerReady()) {
        stopObserver();
        bootWidget();
      }
    });

    viewerObserver.observe(appCard, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
