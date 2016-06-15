/**
 * Created by josh on 6/14/16.
 */

console.log("loading common.js");


function onClick(id, cb) {
    var elem = document.getElementById(id);
    elem.addEventListener('click',cb);
}
function syncDom(id, value) {
    var elem = document.getElementById(id);
    elem.innerHTML = (typeof value !== 'undefined')?value.toString():'undefined';
}

function styleDom(id, key, value) {
    var elem = document.getElementById(id);
    elem.style[key] = value;
}

function getDom(id, value) {
    var elem = document.getElementById(id);
    return elem.value;
}

function processLocation() {
    if(document.location.search) {
        var parms = {};
        document.location.search.substring(1).split("&").forEach(function(chunk){
            var parts =  chunk.split('=');
            parms[parts[0]] = parts[1];
        });
    } else {
        parms = {};
    }
    return parms;
}
