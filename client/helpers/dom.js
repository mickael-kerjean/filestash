export function screenHeight(withMenuBar){
    const $breadcrumb = document.querySelector(".component_breadcrumb");
    let size = document.body.offsetHeight;
    if($breadcrumb){ size -= $breadcrumb.offsetHeight; }
    return size;
}

export function screenHeightWithMenubar(){
    const $breadcrumb = document.querySelector(".component_breadcrumb");
    const $menubar = document.querySelector(".component_menubar");
    let size = document.body.offsetHeight;
    if($breadcrumb){ size -= $breadcrumb.offsetHeight; }
    if($menubar){ size -= $menubar.offsetHeight; }
    return size;
}
