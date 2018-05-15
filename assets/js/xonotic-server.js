const request_url = "https://dpmaster.deathmask.net/?game=xonotic&showplayers=1&xml=1&server=";
const mapshot_dir = "/images/mapshots/";
const mapshot_suffix = ".jpg";
const playerfields = ["name", "ping", "score", "team"];
const team_names = ["-", "<font color=red>Red</font>", "<font color=blue>Blue</font>",
                    "<font color=yellow>Yellow</font>", "<font color=pink>Pink</font>"];


function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/\'/g, '&#39;');
}


function unescapeHTML(str) {
    return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'');
}


function unescapeFontHTML(str) {
    return str.replace(/&lt;font(.*?)&gt;/g, "<font$1>").replace(/&lt;\/font&gt;/g, "</font>");
}


function extractInfo(xmldata) {
    let server = $('qstat', xmldata).find("server");
    let address = server.attr("address");
    let status = server.attr("status");
    if (status != "UP") {
        return {"address": address, "status": status};
    }
    let map = escapeHTML(server.find("map").text());
    let numplayers = Number(server.find("numplayers").text());
    let maxplayers = Number(server.find("maxplayers").text());
    let gametype = escapeHTML(server.find("rules>rule[name=qcstatus]").text().split(":", 1)[0]);
    let players = [];
    server.find("players>player").each(function() {
        let player = {};
        for (let field of playerfields) {
            player[field] = $(this).find(field).html();
        };
        if (player["ping"] <= 0) {
            player["ping"] = "BOT";
        };
        if (player["score"] == -666) {
            player["score"] = "Spectator";
        };
        player["name"] = unescapeFontHTML(escapeHTML(unescapeHTML(player["name"])));
        player["team"] = team_names[player["team"]];
        if (player["team"] === undefined) {
            player["team"] = "-";
        };
        players.push(player);
    });
    return {"address": address, "status": "UP", "map": map, "numplayers": numplayers,
            "maxplayers": maxplayers, "players": players, "gametype": gametype};
}


function getServerinfo(address, callback, extradata) {
    $.ajax({
        type: 'GET',
//         url: 'qstat.xml',
        url: request_url + address,
        dataType: 'xml',
        cache: true,
        success: function (data) {
            let info = extractInfo(data);
            if (info["address"] != address) {
                console.error("Response for wrong server " + info["address"]);
                return;
            };
            callback(info, extradata);
        },
        error: function(data){
            console.log("Error loading XML data");
        }
    });
}


function populateServerPage(address) {
    function _populateServerPage(info, extrainfo) {
        if (info["status"] !== "UP") {
            $('#mapshot').attr("src", "/images/offline.svg");
            return;
        };
        let map = info["map"];
        $('#mapshot').bind('error', function(err) {
            $(this).attr("src", "/images/noscreenshot.svg");
        }).attr("src", mapshot_dir + map + mapshot_suffix);
        $('#mapname').text(map);
        $('#gametype').text(info["gametype"]);
        $('#player_overview').text(info.numplayers + "/" + info.maxplayers);
        $('#player_table').empty();
        for (let player of info.players) {
            let row = "<tr>";
            for (let field of playerfields) {
                row += "<td>" + player[field] + "</td>";
            }
            row += "</tr>"
            $('#player_table').last().append(row);
        };
    };
    getServerinfo(address, _populateServerPage, undefined);
}


function populateServerOverview(servers) {
    function _populateRow(info, id) {
        if (info["status"] !== "UP") {
            $('#status-'+id).html('<span style="color:red;">Currently Offline</span>');
            return;
        }
        $('#status-'+id).text(info["numplayers"] + "/" + info["maxplayers"]);
    };
    for (let server of servers) {
        let identifier = server[0];
        let address = server[1];
        getServerinfo(address, _populateRow, identifier);
    };
}
