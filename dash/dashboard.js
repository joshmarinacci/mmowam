/**
 * Created by josh on 6/14/16.
 */


console.log("loading the dashboard");

var COLORS = ["red","green","blue","orange","black","white","purple",'brown','gray'];
var FLAVORS = ["salty",'sweet','spicy','tangy','sour','bland'];
var ANIMALS = ['bear','cat','chipmunk','dog','wolf','fox','lion','tiger','elephant'];

var pubnub = null;
var CHANNEL_NAME = "simple-channel";

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
    CONNECTION_STATUS: "connection-status"
};

var state = {
    randomSeed:0,
    channelName:"no-name",
    status:"no-game",
    playerCount:0,
    playerList: [],
    connectionStatus:"not-connected"
};


function setup() {
    state.channelName = pick(COLORS)+'-'+pick(FLAVORS) + '-' + pick(ANIMALS);
    sync();
    connect();
    onClick(IDS.START_GAME,startGame);
}


function startGame() {
    state.randomSeed = Math.floor(Math.random()*10*1000);
    sync();
    pubnub.publish({
        channel:CHANNEL_NAME,
        message: {
            "type":"action",
            "action":"start",
            "data": {
                "seed":state.randomSeed
            }
        }
    })
}

function sync() {
    syncDom(IDS.RANDOM_SEED, state.randomSeed);
    syncDom(IDS.CHANNEL_NAME, state.channelName);
    syncDom(IDS.GAME_STATUS, state.status);
    syncDom(IDS.PLAYER_COUNT, state.playerCount);
    syncDom(IDS.CONNECTION_STATUS, state.connectionStatus);
    syncPlayerList(IDS.PLAYER_LIST, state.playerList);
}

function syncDom(id, value) {
    var elem = document.getElementById(id);
    //console.log("id = ", id, elem, value);
    elem.innerHTML = (typeof value !== 'undefined')?value.toString():'undefined';
}

function syncPlayerList(id, value) {
    var elem = document.getElementById(id);
    elem.innerHTML = value.map(function(player) {
        return "<li>" + player.uuid + ": name = " + player.state.name + " score = " + player.state.score + "</li>"
    }).join("");
}

function onClick(id, cb) {
    var elem = document.getElementById(id);
    elem.addEventListener('click',cb);
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
    console.log("keys = ",Object.keys(change.data));
    Object.keys(change.data).forEach(function(key) {
        console.log("setting",key,'to',change.data[key]);
        player.state[key] = change.data[key];
    });
    console.log("now player is", player, player.state);

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