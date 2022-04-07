const body = document.querySelector('body');
const verticalNavBar = document.querySelector('#verticalNavBar');

window.onload = function(){
    const header_height = window.getComputedStyle(document.querySelector('header')).height;
    body.style.marginTop = header_height;
    if (verticalNavBar) verticalNavBar.style.top = header_height;

    for(let div of document.getElementsByClassName("anchor")) {
        div.style.top = "-" + header_height;
    };
};