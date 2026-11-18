// Kleiner Helfer zum Erzeugen von DOM-Elementen.
// Texte werden immer als Text (nicht als HTML) eingefügt – sicher gegen
// versehentliches HTML in den Fragedateien.
//
//   el('button', { class: 'knopf', onclick: () => … }, 'Beschriftung')
export function el(tag, eigenschaften = {}, ...kinder) {
  const element = document.createElement(tag);
  for (const [name, wert] of Object.entries(eigenschaften)) {
    if (wert == null || wert === false) continue;
    if (name.startsWith('on')) element.addEventListener(name.slice(2), wert);
    else if (name === 'class') element.className = wert;
    else element.setAttribute(name, wert === true ? '' : wert);
  }
  for (const kind of kinder.flat()) {
    if (kind == null || kind === false) continue;
    element.append(kind instanceof Node ? kind : String(kind));
  }
  return element;
}
