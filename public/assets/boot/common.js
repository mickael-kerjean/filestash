export function $error(msg) {
    const $code = document.createElement("code");
    $code.style.display = "block";
    $code.style.margin = "20px 0";
    $code.style.fontSize = "1.3rem";
    $code.style.padding = "0 10% 0 10%";
    $code.textContent = msg;

    const $img = document.createElement("img");
    $img.setAttribute("src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABQAQMAAADcLOLWAAAABlBMVEUAAABTU1OoaSf/AAAAAXRSTlMAQObYZgAAAFlJREFUeF69zrERgCAQBdElMqQEOtHSuNIohRIMjfjO6DDmB7jZy5YgySQVYDIakIHD1kBPC9Bra5G2Ans0N7iAcOLF+EHvXySpjSBWCDI/3nIdBDihr8m4AcKdbn96jpAHAAAAAElFTkSuQmCC");
    $img.style.display = "block";
    $img.style.padding = "20vh 10% 0 10%";

    document.body.innerHTML = "";
    document.body.appendChild($img);
    document.body.appendChild($code);
}
