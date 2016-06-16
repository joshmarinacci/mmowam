/**
 * Created by josh on 6/3/16.
 */


var pubnub = null;
var CHANNEL_NAME = "simple-channel";

var ICONS = ['elephant','giraffe','hippo','monkey','panda','parrot','penguin','pig','rabbit','snake'];
var ADJECTIVES = ['Saucy',"Sweet","Snarky",'Silly','Sassy'];


var tapWaitStart = -1;
var activeHole = null;
var inputBlocked = false;

var round_in_progress = false;
var playerState = {
    uuid:"unknown-uuid",
    score:0
};
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

function resetGrid() {
    grid.forEach(function(cell) {
        cell.state = STATES.INACTIVE;
        cell.highlight = 0;
    });
}

var radius = 40;
var xoff = 0;
var yoff = 200;

var startText = {
    text : "Tap only the RED holes",
    fill: 'black',
    opacity: 0.0
};

var img = new Image();
var avatar = {
    img: img,
    opacity: 1.0
};

var ctx = null;
var canvas = null;


var settings = processLocation();
console.log("got the settings",settings);


function checkChannelName() {
    styleDom("channel-panel",'visibility','hidden');
    var channel_name = getDom('channel-name');
    console.log("the selected channel name is", channel_name);
    //CHANNEL_NAME = channel_name;
    connect();
}

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

function calculateUUID() {
    if(settings.uuid) return settings.uuid;
    var key = 'mmowam-player-uuid';
    if(!sessionStorage.getItem(key)) sessionStorage.setItem(key, PUBNUB.uuid());
    return sessionStorage.getItem(key);
}

function calculateIcon() {
    var key = 'mmowam-player-icon';
    if(!sessionStorage.getItem(key)) sessionStorage.setItem(key, pick(ICONS));
    return sessionStorage.getItem(key);
}

function calculateAdjective() {
    var key = 'mmowam-player-adjective';
    if(!sessionStorage.getItem(key)) sessionStorage.setItem(key, pick(ADJECTIVES));
    return sessionStorage.getItem(key);
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
    playerState.adjective = calculateAdjective();
    playerState.icon = calculateIcon();
    playerState.uuid = calculateUUID();
    img.src = "../images/sqr/"+playerState.icon+".png";


    if(!settings.channel) {
        styleDom("channel-panel",'visibility','visible');
        onClick("connect-button", checkChannelName);
    } else {
        connect();
    }
}

function checkInput() {
    if(tapWaitStart == -1) return;
    if(round_in_progress && new Date().getTime() - tapWaitStart > 3000) {
        console.log("it's been a second!");
        tapWaitStart = -1;
        // if not top on hole while active, and timeout, anim out, start next set of active
        //anim out the hole
        //paralyze for 2 seconds
        console.log("you must wait to seconds");
        //avatar.text += 1;
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
    ctx.font = '20pt Scope One';
    ctx.fillText(startText.text,50,200);
    ctx.restore();

    ctx.save();
    ctx.font = '80pt Scope One';
    ctx.fillStyle = "#33aa88";
    ctx.fillText(""+playerState.score, 20, 120);
    ctx.restore();

    ctx.save();
    ctx.font = '26pt Bungee Shade';
    ctx.fillStyle = "#33aa88";
    ctx.fillText("MMOWAM", 90, 70);
    ctx.restore();

    ctx.save();
    ctx.translate(400-80-20,20);
    ctx.drawImage(avatar.img, 0, 20, 80, 80);
    ctx.font = '18pt Scope One';
    ctx.fillStyle = "#33aa88";
    ctx.fillText(""+playerState.adjective,  0, 120);
    ctx.fillText(""+playerState.icon,       0, 140);
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
    if(hole.state == STATES.INACTIVE) return "black";
    if(hole.state == STATES.ACTIVE)   return 'rgba('+Math.floor(hole.highlight*255)+',0,0,1)';
}

function startCountdown() {
    doAnim(
        { at:   0,  target:'countdown-overlay', style:'visibility',value:'visible'},
        { at:   0,  target:'countdown-overlay', prop:'innerHTML', value:"3"},
        { at: 500,  target:'countdown-overlay', prop:'innerHTML', value:"2"},
        { at:1000,  target:'countdown-overlay', prop:'innerHTML', value:"1"},
        { at:1500,  target:'countdown-overlay', prop:'innerHTML', value:"Go!"},
        { at:2000,  target:'countdown-overlay', style:'visibility',value:'hidden'},
        { at: 2000, fun: function() {
            console.log("really starting now");
            startRoundAnim();
        }}
    );
}

function startRoundAnim() {
    console.log('startign the round ');
    startText.text = "Tap only the RED holes";
    playerState.score = 0;
    //avatar.text = 0;
    resetGrid();
    inputBlocked = false;
    //do these in parallel
    doAnim(
        { at:500,  target:startText, prop:'opacity', from:0, to:1.0, dur: 500},
        { at:2000, target:startText, prop:'opacity', from:1.0, to:0, dur: 500},
        { at:2500, fun: startActive}
        //{ at: 10*1000, fun: endRound }
    );
    round_in_progress = true;
    updateState();
}

function endRound() {
    tapWaitStart = -1;
    startText.text  = "Round Over";
    inputBlocked = true;
    doAnim(
        { at: 0, target: startText, prop:'opacity', from:0, to:1.0, dur: 500}
    );
    round_in_progress = false;
    activeHole = null;
    resetGrid();
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

function updateState() {
    console.log("sending state", playerState)
    pubnub.state({
        channel:CHANNEL_NAME,
        state: playerState
    });
}

function incrementScore() {
    playerState.score += 1;
    updateState();
}
function playGoodSound() {
    //noop
}
function incrementBadTap() {
    //avatar.text += 1;
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
        if(round_in_progress) {
            inputBlocked = false;
            //console.log("you can play again");
            startActive();
        } else {
            console.log("the game is over now");
        }
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


function connect() {
    pubnub = PUBNUB({
        publish_key:"pub-c-f68c149c-2149-48dc-aeaf-ee3c658cfb8a",
        subscribe_key:"sub-c-51b69c64-3269-11e6-9060-0619f8945a4f",
        error: function(err) {
            console.log("error",err);
        },
        uuid:playerState.uuid
    });

    pubnub.subscribe({
        channel:CHANNEL_NAME,
        message: function(msg,env,chan) {
            console.log("got a message",msg,env,chan);
            if(msg.type == 'action') {
                executeRemoteAction(msg);
            }
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

    playerState.name = playerState.uuid
    updateState();
}

var ACTIONS = {
    countdown: function(args) {
        console.log("starting the countdown");
        startCountdown();
    },
    start: function(args) {
        console.log("starting the game", args);
        startRoundAnim();
    },
    end: function(args) {
        console.log("ending a round");
        endRound();
    }
};

function executeRemoteAction(act) {
    console.log("executing action", act.action);
    ACTIONS[act.action](act.data);
}

setup();