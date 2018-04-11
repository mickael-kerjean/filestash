export function screenHeight(){
    const $breadcrumb = document.querySelector(".component_breadcrumb");
    const $menubar = document.querySelector(".component_menubar");
    let size = document.body.clientHeight;
    if($breadcrumb){ size -= $breadcrumb.clientHeight; }
    if($menubar){ size -= $menubar.clientHeight; }
    return size;
}
