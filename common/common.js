/**
 * Created by josh on 6/14/16.
 */

function pick(arr) {
    return arr[Math.floor(Math.random()*arr.length)];
}

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



function Anim(props) {
    this.delay = props.at;
    if(!this.delay) this.delay = 0;
    this.startTime = -1;
    this.propertyName = props.prop;
    this.target = props.target;
    this.startValue = props.from;
    this.endValue = props.to;
    this.value = props.value;
    this.duration = props.dur;
    this.fun = props.fun;
    this.style = props.style;
    this.STATES = {
        NOT_STARTED:0,
        PLAYING: 1,
        STOPPED: 2
    };
    this.state = this.STATES.NOT_STARTED;
    this.start = function(time) {
        this.startTime = time;
        this.state = this.STATES.PLAYING;
    };
    this.update = function(time) {
        var diff = time - this.startTime - this.delay;
        if(diff < 0) return;

        if(!this.duration) {
            if(typeof this.target == 'string') {
                var elem = document.getElementById(this.target);
                if(!elem) throw new Error('cannot find dom element ' + this.target);
                if(this.propertyName) {
                    //console.log('evaluating the string version', this.target, this.propertyName, this.value);
                    elem[this.propertyName] = this.value;
                }
                if(this.style) {
                    //console.log("doing the style version", this.style, this.value);
                    elem.style[this.style] = this.value;
                }
                this.state = this.STATES.STOPPED;
                return;
            }
        }

        var t = diff/this.duration;
        if(t > 1) {
            this.finish(time);
            return;
        }
        if(this.fun) {
            //console.log("execute the function once");
            this.fun();
            this.state = this.STATES.STOPPED;
            return;
        }
        var newValue = (this.endValue-this.startValue)*t + this.startValue;
        //console.log(newValue);
        this.target[this.propertyName] = newValue;
    }
    this.finish = function(time) {
        this.state = this.STATES.STOPPED;
        this.target[this.propertyName] = this.endValue;
    }
}

var GLOBAL_ANIMS = [];


function doAnim() {
    var args = Array.prototype.slice.call(arguments);
    args.forEach(function(an) {
        GLOBAL_ANIMS.push(new Anim(an));
    });
}


function updateAnims() {
    var time = new Date().getTime();
    //remove dead animations first w/ a filter
    //if(anim.state == anim.STATES.STOPPED) {
    //}
    GLOBAL_ANIMS.forEach(function(anim) {
        if(anim.state == anim.STATES.NOT_STARTED) {
            anim.start(time);
        }
        if(anim.state == anim.STATES.PLAYING) {
            anim.update(time);
        }
    })
}
