export function screenHeight(){
    const $breadcrumb = document.querySelector(".breadcrumb");
    let size = document.body.clientHeight;
    if($breadcrumb){
        size -= $breadcrumb.clientHeight;
    }
    return size;
}
