Document.prototype.replaceChildren = replaceChildren;
DocumentFragment.prototype.replaceChildren = replaceChildren;
Element.prototype.replaceChildren = replaceChildren;

function replaceChildren(...new_children) {
  const { childNodes } = this;
  while (childNodes.length) {
    childNodes[0].remove();
  }
  this.append(...new_children);
}
