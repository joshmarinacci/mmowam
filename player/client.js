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

var radius = 45;
var xoff = 0;
var yoff = 215;
var canvasXoff = 0;
var gridSpacing = 95;
var canvasScale = 1.5;
var idealWidth = 400;
var idealHeight = 600;
var mathSeed = 0;

var startText = {
    text : "Tap only the RED holes",
    fill: 'black',
    opacity: 0.0
};

var img = new Image();
img.loaded = false;
img.onload = function() {
    img.loaded = true;
};

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
    CHANNEL_NAME = channel_name;
    connect();
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

// ========== input functions ==============
function handleInput(e) {
    e.preventDefault();
    e.stopPropagation();
    if(inputBlocked === true) {
        console.log("you must wait!");
        return;
    }
    var hole = convertMouseToHole(e);
    if(hole != null){
        console.log("tapped on a hole", hole);
        holeTap(hole);
    }
}

function convertMouseToHole(e) {
    var rect = canvas.getBoundingClientRect();
    var pt1 = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
    var pt2 = { x: pt1.x/canvasScale, y: pt1.y/canvasScale};
    var pt3 = {
        x: Math.floor((pt2.x - xoff)/gridSpacing),
        y: Math.floor((pt2.y - yoff)/gridSpacing)
    };

    if(pt3.x < 0 || pt3.x >= 4) return null;
    if(pt3.y < 0 || pt3.y >= 4) return null;
    var hole = grid[pt3.x+pt3.y*4];
    return hole;
}

function setup() {
    canvas = document.getElementById('canvas');
    /*
    canvas.addEventListener("touchstart", function(e) {
        console.log("touch started",e);
        handleInput(e);
    });
    */
    canvas.addEventListener("mousedown", handleInput);
    canvas.addEventListener("mouseup", function(e) {});
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
        CHANNEL_NAME = settings.channel;
        connect();
    }
}




// ============ drawing functions =============

function drawScreen() {
    try {
        var rect = canvas.getBoundingClientRect();
        var err = Math.abs(canvas.width - rect.width);
        if (err > 2) {
            canvas.width = rect.width;
            canvas.height = rect.height;
            var sc = canvas.width / idealWidth;
            var sc2 = canvas.height / idealHeight;
            canvasScale = Math.min(sc, sc2);
        }

        checkInput();
        updateAnims();

        var ctx = canvas.getContext('2d');
        ctx.save();
        canvasXoff = canvas.width - idealWidth * canvasScale;
        //ctx.translate(canvasXoff/2-10,0);
        ctx.scale(canvasScale, canvasScale);
        clearScreen(ctx);
        drawGrid(grid, ctx);
        drawOverlayText(ctx);
        ctx.restore();
    } catch(ex) {
        console.log(ex);
    }
    requestAnimationFrame(drawScreen);
}

function clearScreen(ctx) {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0,0,idealWidth,idealHeight);
}

function drawOverlayText(ctx) {
    ctx.save();
    ctx.font = '40pt Bungee Shade';
    ctx.fillStyle = "#33aa88";
    ctx.fillText("MMOWAM", 60, 50);
    ctx.restore();


    ctx.save();
    ctx.font = '90pt Scope One';
    ctx.fillStyle = "#33aa88";
    ctx.fillText(""+playerState.score, 20, 150);
    ctx.restore();


    ctx.save();
    ctx.translate(400-80-20,50);
    //console.log("img = ", avatar.img.complete);
    if(img.loaded) ctx.drawImage(avatar.img, 0, 20, 80, 80);
    ctx.font = '18pt Scope One';
    ctx.fillStyle = "#33aa88";
    ctx.fillText(""+playerState.adjective,  -100, 60);
    ctx.fillText(""+playerState.icon,       -100, 80);
    ctx.restore();


    ctx.save();
    ctx.fillStyle = startText.fill;
    ctx.globalAlpha = startText.opacity;
    ctx.font = '20pt Scope One';
    ctx.fillText(startText.text,50,200);
    ctx.restore();

}

function drawGrid(grid,ctx) {
    grid.forEach(function(hole) {
        ctx.save();
        ctx.translate(hole.i*gridSpacing+60+xoff, hole.j*gridSpacing+50 + yoff);
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



// ============= actions ============

function startCountdown() {
    doAnim(
        { at:   0,  target:'countdown-overlay', style:'visibility',value:'visible'},
        { at:   0,  target:'countdown-overlay', prop:'innerHTML',  value:"<b>3</b>"},
        { at:1000,  target:'countdown-overlay', prop:'innerHTML',  value:"<b>2</b>"},
        { at:2000,  target:'countdown-overlay', prop:'innerHTML',  value:"<b>1</b>"},
        { at:3000,  target:'countdown-overlay', prop:'innerHTML',  value:"<b>Go!</b>"},
        { at:4000,  target:'countdown-overlay', style:'visibility',value:'hidden'}
    );
}

function startRoundAnim(seed) {
    console.log('starting the round ');
    mathSeed = seed;
    startText.text = "Tap only the RED holes";
    playerState.score = 0;
    resetGrid();
    inputBlocked = false;
    doAnim(
        { at:0,    target:startText, prop:'opacity', from:0,   to:1.0, dur: 500},
        { at:2000, target:startText, prop:'opacity', from:1.0, to:0,   dur: 500}
    );
    startActive();
    round_in_progress = true;
    updateState();
}

function startActive() {
    console.log('starting the active');
    //set active holes
    var holeNumber = pickRandomHole(grid);
    activeHole = grid[holeNumber];
    activeHole.state = STATES.ACTIVE;

    doAnim(
        { at:0, target: activeHole, prop:'highlight', from:0, to:1.0, dur: 300}
    );

    tapWaitStart = new Date().getTime();

    if(settings.auto == 'true' && activeHole !== null) {
        console.log("doing auto");
        doAnim({
            at: 1000, fun: function() {
                console.log("doing auto");
                if(!activeHole) return
                holeTap(activeHole);
            }
        })
    }
}

//called every animation frame
function checkInput() {
    if(tapWaitStart == -1) return;
    //if playing a round
    // and current time - tapwaitstart is greater than 3 seconds
    //the user didn't tap anything.
    if(round_in_progress && new Date().getTime() - tapWaitStart > 3000) {
        console.log("it's been a second!");
        tapWaitStart = -1;
        // if not top on hole while active, and timeout, anim out, start next set of active
        //anim out the hole
        //paralyze for 2 seconds
        console.log("you must wait two seconds");
        //avatar.text += 1;
        //delayTime();
        //inputBlocked = true;
        doAnim(
            { at: 0, target:activeHole, prop:'highlight', from:1.0, to:0, dur: 500},
            { at:2000, fun:startActive}
        )
    }
}

function blockInput() {
    console.log("blocking input");
    inputBlocked = true;
}
function unblockInput() {
    console.log("unblocking input");
    inputBlocked = false;
}
function delayTime() {
    doAnim({ at: 2000, fun: function() {
        if(round_in_progress) {
            unblockInput();
            startActive();
        } else {
            console.log("the game is over now");
            unblockInput();
        }
    }})
}

function holeTap(hole) {
    if(hole.state == STATES.ACTIVE) {
        console.log("good tap");
        incrementScore();
        animHoleGood(hole);
        playGoodSound();
        //startActive();
        hole.state = STATES.INACTIVE;
        startActive();
        return;
    } else {
        console.log("bad tap");
        animHoleBad(activeHole);
        activeHole.state = STATES.INACTIVE;
        playBadSound();
        blockInput();
        tapWaitStart = -1;
        delayTime();
        return;
    }
}

function endRound() {
    console.log("ending round");
    tapWaitStart = -1;
    startText.text  = "Round Over";
    unblockInput();
    doAnim(
        { at: 0, target: startText, prop:'opacity', from:0, to:1.0, dur: 500}
    );
    round_in_progress = false;
    activeHole = null;
    resetGrid();
}

//http://indiegamr.com/generate-repeatable-random-numbers-in-js/
function pickRandomHole(grid) {
    var max = grid.length;
    var min = 0;
    mathSeed = (mathSeed * 9301 + 49297) % 233280;
    var rnd = mathSeed / 233280;
    var val = Math.floor(min + rnd * (max - min));
    return val;
}

function animHoleGood(hole) {
    doAnim(
        { at:0, target: hole, prop:'highlight', from:1.0, to:0, dur: 150}
    );
}

function updateState() {
    console.log("sending state", JSON.stringify(playerState));
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

function animHoleBad(hole) {
    doAnim(
        { at:0, target: hole, prop:'highlight', from:1.0, to:0, dur: 150}
    );
}
function playBadSound() {
    //noop
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
            //console.log("got a message",msg,env,chan);
            if(msg.type == 'action') {
                executeRemoteAction(msg);
            }
        },
        connect: function() {
            console.log("connected to pubnub with channel", CHANNEL_NAME);
            //state.connectionStatus = "connected";
        },
        disconnect: function() {
            //state.connectionStatus = "disconnected";
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
        console.log("starting the game", args.seed);
        startRoundAnim(args.seed);
    },
    end: function(args) {
        console.log("ending a round");
        endRound();
    }
};

function executeRemoteAction(act) {
    ACTIONS[act.action](act.data);
}

setup();