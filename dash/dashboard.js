/**
 * Created by josh on 6/14/16.
 */


console.log("loading the dashboard");

var COLORS = ["red","green","blue","orange","black","white","purple",'brown','gray'];
var FLAVORS = ["salty",'sweet','spicy','tangy','sour','bland'];
var ANIMALS = ['bear','cat','chipmunk','dog','wolf','fox','lion','tiger','elephant'];

var pubnub = null;
var CHANNEL_NAME = "simple-channel";
var ROUND_LENGTH = 10;

function pick(arr) {
    return arr[Math.floor(Math.random()*arr.length)];
}


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
};


function setup() {
    state.channelName = pick(COLORS)+'-'+pick(FLAVORS) + '-' + pick(ANIMALS);
    //CHANNEL_NAME = state.channelName;
    sync();
    connect();
    onClick(IDS.START_GAME,startGame);
    runAnimLoop();
}


function startGame() {
    state.randomSeed = Math.floor(Math.random()*10*1000);
    //show overlay
    doAnim(
        { at:   0,  target:'countdown-overlay', style:'visibility',value:'visible'},
        { at:   0,  target:'countdown-overlay', prop:'innerHTML', value:"3"},
        { at: 500,  target:'countdown-overlay', prop:'innerHTML', value:"2"},
        { at:1000,  target:'countdown-overlay', prop:'innerHTML', value:"1"},
        { at:1500,  target:'countdown-overlay', prop:'innerHTML', value:"Go!"},
        { at:2000,  target:'countdown-overlay', style:'visibility',value:'hidden'},
        { at: 2000, fun: function() {
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

var timer_id;
function startTimer() {
    state.timeLeft = ROUND_LENGTH;
    timer_id = setInterval(function() {
        console.log("counting down");
        state.timeLeft--;
        sync();
        if(state.timeLeft < 0) {
            clearInterval(timer_id);
            endRound();
        }
    },1000);
}

function endRound() {
    console.log("the round has ended");
    state.timeLeft = 0;
    console.log("player status = ",state.playerList);
    var winner = null;
    state.playerList.forEach(function(player) {
        if(!player.state.score) return;
        if(winner == null) winner = player;
        if(player.state.score > winner.state.score) {
            winner = player;
        }
    });
    //blink the winner text
    pubnub.publish({
        channel:CHANNEL_NAME,
        message: {
            "type":"action",
            "action":"end"
        }
    });
    doAnim(
        { at: 0, target:'countdown-overlay', prop:'innerHTML',   value:winner.state.name+" Wins!<br/>Fatality!"},
        { at: 0, target:'countdown-overlay', style:'visibility', value:'visible'}
    )

}

function runAnimLoop() {
    updateAnims();
    requestAnimationFrame(runAnimLoop);
}


function sync() {
    syncDom(IDS.RANDOM_SEED, state.randomSeed);
    syncDom(IDS.CHANNEL_NAME, state.channelName);
    syncDom(IDS.GAME_STATUS, state.status);
    syncDom(IDS.PLAYER_COUNT, state.playerCount);
    syncDom(IDS.CONNECTION_STATUS, state.connectionStatus);
    syncDom(IDS.ROUND_TIMER, state.timeLeft);
    syncPlayerList(IDS.PLAYER_LIST, state.playerList);
}


function syncPlayerList(id, value) {
    var elem = document.getElementById(id);
    elem.innerHTML = value.map(function(player) {
        var score = 0;
        if(player.state.score) score = player.state.score;
        return "<li class='player-status'>"
            +"<span class='player-name'>" + player.state.name + "</span>"
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
            console.log("connected to pubnub");
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
        callback: function(m) {
            //console.log("list of users", m.uuids);
            var ids = m.uuids.filter(function(user) { return user.uuid !== 'dashboard'});
            state.playerList = ids;
            sync()
        }
    })
}



console.log(IDS.CHANNEL_NAME);
setup();