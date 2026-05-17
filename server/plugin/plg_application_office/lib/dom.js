import { createElement } from "../../../lib/skeleton/index.js";

export const $toolbar = {
    underline: createElement(`
        <span class="texteditor">
            <svg class="component_icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
                <line x1="4" y1="21" x2="20" y2="21"></line>
            </svg>
        </span>
    `),
    italic: createElement(`
        <span class="texteditor">
            <svg class="component_icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="4" x2="10" y2="4"></line>
                <line x1="14" y1="20" x2="5" y2="20"></line>
                <line x1="15" y1="4" x2="9" y2="20"></line>
            </svg>
        </span>
    `),
    bold: createElement(`
        <span class="texteditor">
            <svg class="component_icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
            </svg>
        </span>
    `),
    strike: createElement(`
        <span class="texteditor">
            <svg class="component_icon" style="width: 15px;" height="800px" width="800px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 335 335" xml:space="preserve">
                <path fill="currentColor" d="M335,152.5H168.849c-51.776-8.496-83.471-15.845-83.471-53.723C85.377,59.084,129.616,45,167.5,45c40.518,0,70.98,14.602,79.5,38.106l28.204-10.223c-6.792-18.74-21.263-33.998-41.847-44.125C215.059,19.758,192.286,15,167.5,15C100.436,15,55.377,48.668,55.377,98.777c0,22.519,7.594,40.513,22.602,53.723H0v30h166.393c51.633,8.48,83.23,15.876,83.23,53.723c0,39.693-44.239,53.777-82.123,53.777c-40.531,0-70.997-14.609-79.506-38.127l-28.21,10.209c6.785,18.75,21.254,34.018,41.843,44.15C119.927,315.239,142.706,320,167.5,320c67.064,0,112.123-33.668,112.123-83.777c0-22.515-7.585-40.509-22.575-53.723H335V152.5z"/>
            </svg>
        </span>
    `),
    alignment: createElement(`
        <span class="texteditor">
            <select class="fontawesome">
                <option value="left">&#xf036;</option>
                <option value="right">&#xf038;</option>
                <option value="justify">&#xf039;</option>
                <option value="center">&#xf037;</option>
            </select>
        </span>
    `),
    title: createElement(`
        <span class="texteditor">
            <select>
                <option value="normal">Normal text</option>
                <option value="title">Title</option>
                <option value="head1">Heading 1</option>
                <option value="head2">Heading 2</option>
                <option value="head3">Heading 3</option>
            </select>
        </span>
   `),
    bullet: createElement(`
        <span class="texteditor">
            <select class="fontawesome">
                <option value="normal">&#xf0c9;</option>
                <option value="ul">&#xf0ca;</option>
                <option value="ol">&#xf0cb;</option>
            </select>
        </span>
   `),
    size: createElement(`
        <span class="texteditor">
            <input type="number" min="1" max="99" />
        </span>
    `),
    color: createElement(`
        <span class="texteditor picker">
            <svg style="fill:#000000" class="component_icon" xmlns="http://www.w3.org/2000/svg" width="800px" height="800px" viewBox="0 0 24 24" fill="none">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" />
            </svg>
            <input type="color" />
        </span>
    `),
};
