// Make the collapsible content accessible
let myLabels = document.querySelectorAll('.lbl-toggle');

Array.from(myLabels).forEach(label => {
  label.addEventListener('keydown', e => {
    // 32 === spacebar
    // 13 === enter
    if (e.which === 32 || e.which === 13) {
      e.preventDefault();
      label.click();
    };
  });
});

// Search helpers from https://github.com/onweru/compose
const rootURL = window.location.protocol + "//" + window.location.host;
const searchFieldClass = '.search_field';
const searchClass = '.search';
const quickLinks = '{{ T "quick_links" }}';
const searchResultsLabel = '{{ T "search_results_label" }}';
const shortSearchQuery = '{{ T "short_search_query" }}'
const typeToSearch = '{{ T "type_to_search" }}';
const noMatchesFound = '{{ T "no_matches" }}';

function createEl(element = 'div') {
  return document.createElement(element);
}

function emptyEl(el) {
  while(el.firstChild)
  el.removeChild(el.firstChild);
}

function wrapText(text, context, wrapper = 'mark') {
  let open = `<${wrapper}>`;
  let close = `</${wrapper}>`;
  let escapedOpen = `%3C${wrapper}%3E`;
  let escapedClose = `%3C/${wrapper}%3E`;
  function wrap(context) {
    let c = context.innerHTML;
    let pattern = new RegExp(text, "gi");
    let matches = text.length ? c.match(pattern) : null;

    if(matches) {
      matches.forEach(function(matchStr){
        c = c.replaceAll(matchStr, `${open}${matchStr}${close}`);
        context.innerHTML = c;
      });

      const images = elems('img', context);

      if(images) {
        images.forEach(image => {
          image.src = image.src.replaceAll(open, '').replaceAll(close, '').replaceAll(escapedOpen, '').replaceAll(escapedClose, '');
        });
      }
    }
  }

  const contents = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "code", "td"];

  contents.forEach(function(c){
    const cs = elems(c, context);
    if(cs.length) {
      cs.forEach(function(cx, index){
        if(cx.children.length >= 1) {
          Array.from(cx.children).forEach(function(child){
            wrap(child);
          })
          wrap(cx);
        } else {
          wrap(cx);
        }
        // sanitize urls and ids
      });
    }
  });

  const hyperLinks = elems('a');
  if(hyperLinks) {
    hyperLinks.forEach(function(link){
      link.href = link.href.replaceAll(encodeURI(open), "").replaceAll(encodeURI(close), "");
    });
  }
}
