/**
 * Created by josh on 6/3/16.
 */


var tapWaitStart = -1;
var activeHole = null;
var inputBlocked = false;

var STATES = {
    INACTIVE: 0,
    ACTIVE: 1,
    GOOD_TAP: 2,
    BAD_TAP: 3
};

var grid = [];
for(var j=0; j<4; j++) {
    for (var i = 0; i < 4; i++) {
        grid.push({
            i:i,
            j:j,
            state:STATES.INACTIVE,
            highlight: 0
        })
    }
}

var radius = 40;
var xoff = 0;
var yoff = 200;
var score = 0;

var startText = {
    text : "Tap only the RED holes",
    fill: 'black',
    opacity: 0.0
};

var missedText = {
    text:0,
    fill: 'black',
    opacity: 1.0
};

var ctx = null;
var canvas = null;

function convertMouseToHole(e) {
    var rect = canvas.getBoundingClientRect();
    var pt = {
        x: Math.floor((e.clientX - rect.left - xoff)/100),
        y: Math.floor((e.clientY - rect.top - yoff)/100)
    };

    if(pt.x < 0 || pt.x >= 4) return null;
    if(pt.y < 0 || pt.y >= 4) return null;
    var hole = grid[pt.x+pt.y*4];
    return hole;
}
function setup() {
    canvas = document.getElementById('canvas');
    canvas.addEventListener("mousedown", function(e) {
        if(inputBlocked === true) {
            console.log("you must wait!");
            return;
        }
        //console.log("mouse down");
        var hole = convertMouseToHole(e);
        if(hole != null){
            console.log("tapped on a hole");
            holeTap(hole);
        }
    });
    canvas.addEventListener("mouseup", function(e) {
        //console.log("mouse up");
    });
    ctx = canvas.getContext('2d');

    drawScreen();

    //startRoundAnim();

    connect();
}


function checkInput() {
    if(tapWaitStart == -1) return;
    if(new Date().getTime() - tapWaitStart > 3000) {
        console.log("it's been a second!");
        tapWaitStart = -1;
        // if not top on hole while active, and timeout, anim out, start next set of active
        //anim out the hole
        //paralyze for 2 seconds
        console.log("you must wait to seconds");
        missedText.text += 1;
        delayTime();
        //inputBlocked = true;
        doAnim(
            { at: 0, target:activeHole, prop:'highlight', from:1.0, to:0, dur: 500}
            //{ at:2000, fun:startActive}
        )
    }
}

function drawScreen() {
    checkInput();
    updateAnims();
    clearScreen();
    drawGrid(grid);
    drawOverlayText();
    requestAnimationFrame(drawScreen);
}

function clearScreen() {
    var dim = {
        w: canvas.width,
        h: canvas.height
    };
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0,0,dim.w,dim.h);
}

function drawOverlayText() {
    ctx.save();
    ctx.fillStyle = startText.fill;
    ctx.globalAlpha = startText.opacity;
    ctx.font = '20pt Arial';
    ctx.fillText(startText.text,50,100);
    ctx.restore();

    ctx.save();
    ctx.font = '50pt Arial';
    ctx.fillStyle = "#33aa88";
    ctx.fillText(""+score, 30, 70);
    ctx.restore();

    ctx.save();
    ctx.font = '50pt Arial';
    ctx.fillStyle = "#33aa88";
    ctx.fillText(""+missedText.text, 300, 70);
    ctx.restore();
}

function drawGrid(grid) {
    grid.forEach(function(hole) {
        ctx.save();
        ctx.translate(hole.i*100+50+xoff, hole.j*100+50 + yoff);
        ctx.fillStyle = calcHoleColor(hole);
        ctx.beginPath();
        ctx.arc(0,0, radius, 0, Math.PI*2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    })
}

function calcHoleColor(hole) {
    if(hole.state == STATES.INACTIVE) {
        return "black";
    }
    if(hole.state == STATES.ACTIVE) {
        var str = 'rgba('+Math.floor(hole.highlight*255)+',0,0,1)';
//        console.log(str);
        //return 'green';
        //return "green";
        return str;
    }
}


function startRoundAnim() {
    //do these in parallel
    doAnim(
        { at:500,  target:startText, prop:'opacity', from:0, to:1.0, dur: 500},
        { at:2000, target:startText, prop:'opacity', from:1.0, to:0, dur: 500},
        { at:2500, fun: startActive},
        { at: 10*1000, fun: endRound }
    );
}

var GLOBAL_ANIMS = [];


function endRound() {
    console.log("the round must end now");
    tapWaitStart = -1;
    startText.text  = "Round Over";
    inputBlocked = true;
    doAnim(
        { at: 0, target: startText, prop:'opacity', from:0, to:1.0, dur: 500}
    )
}
function Anim(props) {
    this.delay = props.at;
    if(!this.delay) this.delay = 0;
    this.startTime = -1;
    this.propertyName = props.prop;
    this.target = props.target;
    this.startValue = props.from;
    this.endValue = props.to;
    this.duration = props.dur;
    this.fun = props.fun;
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



function updateAnims() {
    var time = new Date().getTime();
    //remove dead animations first w/ a filter
    //if(anim.state == anim.STATES.STOPPED) {
    //}
    GLOBAL_ANIMS.forEach(function(anim) {
        if(anim.state == anim.STATES.NOT_STARTED) {
            //console.log("we must start it");
            anim.start(time);
        }
        if(anim.state == anim.STATES.PLAYING) {
            anim.update(time);
        }
    })
}
function doAnim() {
    var args = Array.prototype.slice.call(arguments);
    args.forEach(function(an) {
        GLOBAL_ANIMS.push(new Anim(an));
    });
}

function pickRandomHole(grid) {
    return Math.floor(Math.random()*grid.length);
}

function startActive() {
    console.log('starting the active');
    //set active holes
    var holeNumber = pickRandomHole(grid);
    grid[holeNumber].state = STATES.ACTIVE;
    activeHole = grid[holeNumber];

    doAnim(
        { at:0, target: grid[holeNumber], prop:'highlight', from:0, to:1.0, dur: 300}
    );

    tapWaitStart = new Date().getTime();

    //anim active holes in
    // if tap on hole while active, anim out, start next set of active
    // if tap on wrong hole, anim out, wait N seconds, start next set of active
}

function animHoleGood(hole) {
    doAnim(
        { at:0, target: hole, prop:'highlight', from:1.0, to:0, dur: 150}
    );
}

function incrementScore() {
    score += 1;
}
function playGoodSound() {
    //noop
}
function incrementBadTap() {
    missedText.text += 1;
}
function animHoleBad(hole) {
    doAnim(
        { at:0, target: hole, prop:'highlight', from:1.0, to:0, dur: 150}
    );
}
function playBadSound() {
    //noop
}
function delayTime() {
    inputBlocked = true;
    tapWaitStart = -1;
    doAnim({ at: 2000, fun: function() {
        inputBlocked = false;
        //console.log("you can play again");
        startActive();
    }})
}
function holeTap(hole) {
    if(hole.state == STATES.ACTIVE) {
        //console.log("good tap");
        //hole.state = STATES.GOOD_TAP;
        incrementScore();
        animHoleGood(hole);
        playGoodSound();
        //startActive();
        doAnim(
            { at: 500, fun: function() {
               //console.log("resetting the hole");
                hole.state = STATES.INACTIVE
            }},
            //{ at:500,  target:startText, prop:'opacity', from:0, to:1.0, dur: 500},
            //{ at:2000, target:startText, prop:'opacity', from:1.0, to:0, dur: 500},
            { at:500, fun: startActive}
        );
        return;
    }
    if( hole.state == STATES.INACTIVE ) {
        //console.log("bad tap");
        //hole.state = STATES.;
        incrementBadTap();
        animHoleBad(activeHole);
        playBadSound();
        delayTime();
        return;
    }
}


var pubnub = null;

function connect() {
    console.log("connecting to pubnub");
    var CHANNEL_NAME = "simple-channel";
    pubnub = PUBNUB({
        publish_key:"pub-c-f68c149c-2149-48dc-aeaf-ee3c658cfb8a",
        subscribe_key:"sub-c-51b69c64-3269-11e6-9060-0619f8945a4f",
        error: function(err) {
            console.log("error",err);
        },
        uuid:'billy'
    });

    pubnub.subscribe({
        channel:CHANNEL_NAME,
        message: function(msg,env,chan) {
            console.log("got a message",msg,env,chan);
        },
        connect: function() {
            console.log("connected to pubnub");
            //state.connectionStatus = "connected";
            //sync();
        },
        disconnect: function() {
            //state.connectionStatus = "disconnected";
            //sync();
        }
    });

    pubnub.state({
        channel:CHANNEL_NAME,
        state: {
            "name":"Master Bonny"
        },
        callback: function(m) {
            console.log("the state was sent");
        }
    });

}

/*
 Start round
 Draw grid
 Change colors at a target speed and simultaneous rate
 Switch color back and increment score if tap
 If wrong tap paralyze for 1 sec
 Show current score
 End round and say congrats
 Start music at start of round
 Make tap sound effect
 Make change color effect
 Make missed tap effect
 Make wrong color tap effect
 */

setup();