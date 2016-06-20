/**
 * Created by josh on 6/14/16.
 */

var BASE_URL = "http://joshondesign.com/p/apps/mmowam/player/?channel=";
var COLORS = ["red","green","blue","orange","black","white","purple",'brown','gray'];
var FLAVORS = ["salty",'sweet','spicy','tangy','sour','bland'];
var ANIMALS = ['bear','cat','chipmunk','dog','wolf','fox','lion','tiger','elephant'];

var pubnub = null;
var CHANNEL_NAME = "simple-channel";
var ROUND_LENGTH = 30;

var audio1 = new Audio("../music/wonderland.mp3");
//audio1.play();
var audio2 = new Audio("../music/level1.mp3");

var IDS = {
    CHANNEL_NAME: "channel-name",
    PLAYER_LIST: "player-list",
    PLAYER_COUNT: "player-count",
    GAME_STATUS: "game-status",
    RANDOM_SEED: "random-seed",
    START_GAME: "start-game",
    ROUND_TIMER: "timer",
    CONNECTION_STATUS: "connection-status"
};

var state = {
    randomSeed:0,
    channelName:"no-name",
    status:"no-game",
    playerCount:0,
    playerList: [],
    connectionStatus:"not-connected",
    timeLeft: -1,
    isPlaying: false,
};


function setup() {
    var settings = processLocation();
    state.channelName = pick(COLORS)+'-'+pick(FLAVORS) + '-' + pick(ANIMALS);
    if(settings.channel) {
        state.channelName = settings.channel;
    }
    CHANNEL_NAME = state.channelName;
    new QRCode(document.getElementById("qrcode"), {
        width: 128,
        height: 128,
        colorDark : "#444400",
        colorLight : "#ffff00",
        text:BASE_URL+state.channelName
    });
    audio2.play();
    sync();
    connect();
    onClick(IDS.START_GAME,startGame);
    runAnimLoop();
}


function startGame() {
    if(state.isPlaying) {
        stopGame();
    }
    state.isPlaying = true;
    state.randomSeed = Math.floor(Math.random()*10*1000);
    try {
        if(!audio2.paused) {
            audio2.pause();
            audio2.currentTime = 0;
        }
        if(!audio1.paused) {
            audio1.pause();
            audio1.currentTime = 0;
        }
        setTimeout(function() {
            audio1.play();
        },150);
    } catch (ex){
        console.log(ex);
    }
    //show overlay
    doAnim(
        { at:   0,  fun: function() {
            console.log("starting with the channel name", CHANNEL_NAME);
            pubnub.publish({
                channel:CHANNEL_NAME,
                message: {
                    "type":"action",
                    "action":"countdown",
                }
            });
        }},
        { at:   0,  target:'countdown-overlay', style:'visibility',value:'visible'},
        { at:   0,  target:'countdown-overlay', prop:'innerHTML',  value:"<b>3</b>"},
        { at:1000,  target:'countdown-overlay', prop:'innerHTML',  value:"<b>2</b>"},
        { at:2000,  target:'countdown-overlay', prop:'innerHTML',  value:"<b>1</b>"},
        { at:3000,  target:'countdown-overlay', prop:'innerHTML',  value:"<b>Go!</b>"},
        { at:4000,  target:'countdown-overlay', style:'visibility',value:'hidden'},
        { at:4000, fun: function() {
            console.log("really starting now");
            pubnub.publish({
                channel:CHANNEL_NAME,
                message: {
                    "type":"action",
                    "action":"start",
                    "data": {
                        "seed":state.randomSeed
                    }
                }
            });
            //countdown from 30 seconds
            startTimer();
            sync();
        }}
    );

}

function stopGame() {
    state.timeLeft = 0;
    clearInterval(timer_id);
    if(!audio1.paused) audio1.pause();
    audio1.currentTime = 0;
    if(!audio2.paused) audio2.pause();
    audio2.play();

    pubnub.publish({
        channel:CHANNEL_NAME,
        message: {
            "type":"action",
            "action":"end"
        }
    });
    state.isPlaying = false;
}

var timer_id;
function startTimer() {
    state.timeLeft = ROUND_LENGTH;
    timer_id = setInterval(function() {
        state.timeLeft--;
        sync();
        if(state.timeLeft < 0) {
            clearInterval(timer_id);
            endRound();
        }
    },1000);
}

function endRound() {
    stopGame();
    var winner = null;
    state.playerList.forEach(function(player) {
        if(!player.state.score) return;
        if(winner == null) winner = player;
        if(player.state.score > winner.state.score) {
            winner = player;
        }
    });
    if(winner !== null) {
        doAnim(
            {
                at: 0,
                target: 'countdown-overlay',
                prop: 'innerHTML',
                value: "<b>" + winner.state.adjective + " " + winner.state.icon + " Wins!<br/>Fatality!</b>"
            },
            {at: 0, target: 'countdown-overlay', style: 'visibility', value: 'visible'}
        )
    } else {
        doAnim(
        {
            at: 0,
                target: 'countdown-overlay',
            prop: 'innerHTML',
            value: "<b>No Winner. <br/> Frowny Face!</b>"
        },
        {at: 0, target: 'countdown-overlay', style: 'visibility', value: 'visible'}
        )
    }

}

function runAnimLoop() {
    updateAnims();
    requestAnimationFrame(runAnimLoop);
}


function sync() {
    //syncDom(IDS.RANDOM_SEED, state.randomSeed);
    syncDom(IDS.CHANNEL_NAME, BASE_URL + state.channelName);
    //syncDom(IDS.GAME_STATUS, state.status);
    syncDom(IDS.PLAYER_COUNT, state.playerCount);
    //syncDom(IDS.CONNECTION_STATUS, state.connectionStatus);
    syncDom(IDS.ROUND_TIMER, state.timeLeft);
    syncPlayerList(IDS.PLAYER_LIST, state.playerList);
}


function syncPlayerList(id, value) {
    var elem = document.getElementById(id);
    var arr = value.slice();
    arr.sort(function(a,b){
        if(a.state.score < b.state.score) {
            return 1;
        } else {
            return -1;
        }
    });
    elem.innerHTML = arr.map(function(player) {
        var score = 0;
        if(player.state.score) score = player.state.score;
        var icon = 'elephant';
        var adjective = 'saucy';
        if(player.state.icon) icon = player.state.icon;
        if(player.state.adjective) adjective = player.state.adjective;

        var img = "../images/sqr/"+icon+".png";
        var name = adjective + " " + icon;
        return "<li class='player-status'>"
            +"<span class='player-name'>" + name + "</span>"
            +"<img  class='player-icon' src='"+img+"' />"
            +"<span class='player-score-wrapper'><span class='player-score' style='width:"+(score/10*100)+"%;'>" + player.state.score + "</span></span>"
            +"</li>"
    }).join("");
}


function connect() {
    console.log("connecting to pubnub");
    pubnub = PUBNUB({
        publish_key:"pub-c-f68c149c-2149-48dc-aeaf-ee3c658cfb8a",
        subscribe_key:"sub-c-51b69c64-3269-11e6-9060-0619f8945a4f",
        error: function(err) {
            console.log("error",err);
        },
        uuid:'dashboard'
    });

    pubnub.subscribe({
        channel:CHANNEL_NAME,
        message: function(msg,env,chan) {
            //console.log("got a message",msg,env,chan);
        },
        connect: function() {
            console.log("connected to pubnub on channel", CHANNEL_NAME);
            state.connectionStatus = "connected";
            sync();
            getPlayerList();
        },
        disconnect: function() {
            state.connectionStatus = "disconnected";
            sync();
        },
        presence: function(m) {
            //console.log("presence event",m);
            state.playerCount = m.occupancy - 1;
            if(m.action == 'state-change') {
                setPlayerState(m);
            }
            sync();
        }
    })
}


function setPlayerState(change) {
    var players = state.playerList.filter(function(pl) {
        if(pl.uuid == change.uuid) return true;
        return false;
    });
    var player = null;
    if(players.length == 1) {
        //console.log("found the player");
        player = players[0];
    } else {
        //console.log("didn't find the player. adding");
        var obj = {uuid: change.uuid, state:{
            missed:0,
            score:0
        }};
        state.playerList.push(obj);
        player = obj;
    }
    Object.keys(change.data).forEach(function(key) {
        player.state[key] = change.data[key];
    });
}

function getPlayerList() {
    pubnub.here_now({
        channel: CHANNEL_NAME,
        state:true,
        uuids:true,
        callback: function(m) {
            var ids = m.uuids.filter(function(user) { return user.uuid !== 'dashboard'});
            state.playerList = ids;
            sync()
        }
    })
}



console.log(IDS.CHANNEL_NAME);
setup();
