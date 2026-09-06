// Numbers every block of a post so readers can say "line 42" and mean it.
//
// A number is assigned per semantic block rather than per rendered line: a
// wrapped line moves with the viewport, a paragraph does not. Each number is
// a link to #L<n>, so a reader can click one and copy an exact reference.
(function () {
  "use strict";

  // Numbered as a single unit; not walked into.
  var NUMBERED = {
    P: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1,
    BLOCKQUOTE: 1, PRE: 1, TABLE: 1, FIGURE: 1, DL: 1, DETAILS: 1
  };
  // Walked into without taking a number of their own.
  var TRANSPARENT = { UL: 1, OL: 1, DIV: 1, SECTION: 1, ARTICLE: 1 };
  // Neither numbered nor walked.
  var IGNORED = { SCRIPT: 1, STYLE: 1, BUTTON: 1, HR: 1, NAV: 1, ASIDE: 1, BR: 1, FORM: 1 };

  // Blocks that must not have anything injected inside them: text inside <pre>
  // would end up in copied code, and a stray child in <table> is invalid HTML.
  function needsWrapper(el) {
    return el.tagName === "PRE" || el.tagName === "TABLE";
  }

  function opaqueDiv(el) {
    // A highlighted code block is one block, not a container of blocks.
    return el.classList.contains("highlight") || el.classList.contains("no-lineno-children");
  }

  function hasContent(el) {
    return (
      el.textContent.trim().length > 0 ||
      el.querySelector("img, svg, video, iframe, pre") !== null
    );
  }

  function collect(node, out) {
    var children = node.children;
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      var tag = el.tagName;

      if (IGNORED[tag] || el.classList.contains("no-lineno")) continue;

      if (tag === "LI") {
        if (hasContent(el)) out.push(el);
        // Pick up nested lists only. Walking the whole item would also number
        // the <p> that a loose list wraps its text in, duplicating the item.
        for (var j = 0; j < el.children.length; j++) {
          var child = el.children[j];
          if (child.tagName === "UL" || child.tagName === "OL") collect(child, out);
        }
        continue;
      }

      if (TRANSPARENT[tag]) {
        if (tag !== "DIV" && tag !== "SECTION") collect(el, out);
        else if (opaqueDiv(el)) { if (hasContent(el)) out.push(el); }
        else collect(el, out);
        continue;
      }

      if (NUMBERED[tag]) {
        if (hasContent(el)) out.push(el);
        continue;
      }

      collect(el, out);
    }
  }

  function attach(el, n) {
    var a = document.createElement("a");
    a.className = "lineno";
    a.id = "L" + n;
    a.href = "#L" + n;
    a.textContent = n;
    a.setAttribute("aria-label", "Link to block " + n);

    var block = el;
    if (needsWrapper(el)) {
      var wrap = document.createElement("div");
      wrap.className = "lineno-wrap";
      el.parentNode.insertBefore(wrap, el);
      wrap.appendChild(el);
      wrap.insertBefore(a, el);
      block = wrap;
    } else {
      el.insertBefore(a, el.firstChild);
    }
    block.classList.add("lineno-block");
  }

  function syncTarget() {
    var previous = document.querySelector(".lineno-target");
    if (previous) previous.classList.remove("lineno-target");

    if (!/^#L\d+$/.test(location.hash)) return null;
    var anchor = document.getElementById(location.hash.slice(1));
    if (!anchor || !anchor.classList.contains("lineno")) return null;

    anchor.parentNode.classList.add("lineno-target");
    return anchor;
  }

  function run() {
    if (!document.body.classList.contains("with-line-numbers")) return;
    var main = document.querySelector("main");
    if (!main) return;

    var blocks = [];
    collect(main, blocks);
    for (var i = 0; i < blocks.length; i++) attach(blocks[i], i + 1);

    // The anchors did not exist when the browser resolved the incoming hash,
    // so scroll to it now that they do.
    var target = syncTarget();
    if (target) target.scrollIntoView();

    window.addEventListener("hashchange", syncTarget);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
