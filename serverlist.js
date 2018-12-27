/*
	YASL for Minetest - Yet Another Server List
	(c) Pierre-Yves Rollo

	This file is part of YASL.

	signs is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	signs is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with signs.  If not, see <http://www.gnu.org/licenses/>.
*/

// Constants
let srvurl = 'http://servers.minetest.net/list.json';

// Global variables
var mainstate; // Program state
var srvdata; // Servers data

// Observables
var obinit=[];
var obstate=[];
var obfilter=[];
var obsort=[];
var obdata=[];

function notify(observers) {
    for (var index in observers)
        observers[index]();
}

// State management
function state_from_url() {
    var res;
    mainstate = {};
    var index = window.location.href.indexOf("#");
    if (index >= 0) {
        var args = "&"+window.location.href.substr(index+1)
        while (res=args.match(/^&([^&]*)(.*)$/)) {
            args = res[2];
            index = res[1].indexOf("=");
            if (index >=0) 
                mainstate[res[1].substr(0, index)] = res[1].substr(index+1);
            else
                mainstate[res] = "";
        }
    }
}

function state_to_url() {
    var args = "";
    var index, base;
    for (index in mainstate) {
        if (args != "") args = args+"&";
        args+=index+"="+mainstate[index];
    }
    index = window.location.href.indexOf("#");

    if (index >= 0)
        base = window.location.href.substr(0, index);
    else
        base = window.location.href;

    if (args != "") 
        window.location.href = base + "#" + args;
    else
        window.location.href = base;
}

function state_changed() {
    state_to_url();
    notify(obstate);
}

// Rendering general functions
function tooltip(content, tooltip) {
   return "<div class=\"tooltip\">"+content+"<span class=\"tooltiptext\">"+tooltip+"</span></div>";
}

function escapeHTML(str) {
   	if(!str) return str; 
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); 
}

/*
// Navigation functions
function show_page() {
    var pages=['servers', 'players', 'debug'];

//    if (!mainstate.page) mainstate.page="servers";
    if (pages.indexOf(mainstate.page) < 0) mainstate.page="servers";
    
    for (var i in pages) {
        if (pages[i] == mainstate.page) {
            document.getElementById("page-"+pages[i]).style.visibility="visible";
            document.getElementById("button-"+pages[i]).classList.add("active");
        } else {
            document.getElementById("page-"+pages[i]).style.visibility="hidden";
            document.getElementById("button-"+pages[i]).classList.remove("active");
        }
    }
}
obstate.push(show_page);


function change_page(page) {
    mainstate.page=page;
    state_changed();
}
*/

// JSON Data fetching
var xmlhttp; // Http request

if (window.XMLHttpRequest) // code for IE7+, Firefox, Chrome, Opera, Safari
    xmlhttp = new XMLHttpRequest();
else // code for IE6, IE5
    xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");

xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) 
        on_receive_data(JSON.parse(xmlhttp.responseText));
}

function fetch_data() {
    xmlhttp.open("GET", srvurl, true);
    xmlhttp.send();
}
obinit.push(fetch_data);

function sort_array_by_key(array) {
    var keys = []
    for (var key in array)
        keys.push(key);
    
    keys.sort();
    
    var result = {};
    for (var key in keys)
        result[keys[key]] = array[keys[key]];
    
    return result;
}

function on_receive_data(data) {
    srvdata = data // Peut être à améliorer : separer la partie technique du traitement fonctionnel des donnees
    var mods = {}
    var srvlist = srvdata.list

    for (var i in srvlist) {
        srvlist[i].rank = Number(i)+1;
        for (var j in srvlist[i].mods)
            if (mods[srvlist[i].mods[j]])
                mods[srvlist[i].mods[j]] = mods[srvlist[i].mods[j]]+1;
            else
                mods[srvlist[i].mods[j]] = 1;
    }
    
    srvdata.mods = sort_array_by_key(mods);
    notify(obdata);
}

/*
function update_buttons() {
    document.getElementById("button-servers").innerHTML = "Servers ("+srvdata.total.servers+")";
    document.getElementById("button-players").innerHTML = "Players ("+srvdata.total.clients+")";
}
obdata.push(update_buttons);
*/

/* ==== Debug ==== */
/*
function populate_debug_info() {
    var page = document.getElementById("page-servers");
    var srvlist = srvdata.list
    // List analysis
    var keys = {}
    for (var index in srvlist) {
        for (var key in srvlist[index]) {
            if (keys[key])
                keys[key] = keys[key] + 1;
            else
                keys[key] = 1;
        }
    }

    var html = "";

    for (var key in keys)
        html+= " " + key + "("+ keys[key]+")<br/>";
    document.getElementById("debug-keys").innerHTML = html;
    
    document.getElementById("debug-raw").innerHTML = JSON.stringify(srvdata);
}
obdata.push(populate_debug_info);
*/
/* ==== Filtering ==== */

var filter_types = {
    mod:{
        test:function(server, value) {
            for (index in server.mods)
                if (server.mods[index] == value)
                    return 1;
            return 0;
        },
        values:function() {
            result = {}
            for (var index in srvdata.mods)
                result[index] = index+" ("+srvdata.mods[index]+")";
            return result;
        },
    },
    pvp:{
        test:function(server, value) { 
            return (value == 'yes' &&  server.pvp) || (value == 'no' &&  !server.pvp);
        },
        values:function() { return { 'yes':'Yes', 'no':'No' }; },
    },
    creative:{
        test:function(server, value) { 
            return (value == 'yes' &&  server.creative) || (value == 'no' &&  !server.creative);
        },
        values:function() { return { 'yes':'Yes', 'no':'No' }; },
    },
    damage:{
        test:function(server, value) { 
            return (value == 'yes' &&  server.damage) || (value == 'no' &&  !server.damage);
        },
        values:function() { return { 'yes':'Yes', 'no':'No' }; },
    },
}

function string_to_filters(string) {
    var filters=[];
    string="+"+string;
    while (res=string.match(/^\+([a-zA-Z0-9_]+):([^+]+)(.*)$/)) {
            string=res[3];
            if (filter_types[res[1]])
                filters.push({ type:res[1], value:res[2]})
    }
    return filters;
}

function filters_to_string(filters) {
    var string="";
    for (var index in filters) {
        if (string !="") string+="+";
        string+=filters[index].type+":"+filters[index].value;
    }
    return string;
}

function test_filters(server, filters) {
    for (var index in filters)
        if (filter_types[filters[index].type] && !filter_types[filters[index].type].test(server, filters[index].value))
            return 0;
    return 1;
}

function remove_filter(index) {
    var filters =  string_to_filters(mainstate.filters);
    if (filters[index]) {
        filters.splice(index,1);
        if (filters.length)
            mainstate.filters = filters_to_string(filters);
        else
            delete mainstate.filters;
        notify(obfilter);
        state_changed();
    }
}

function on_change(id) {
    var element=document.getElementById(id);  
    switch (id) {
        case "filter-types":
            var listel = document.getElementById('filter-list-values');
            if (element.value && filter_types[element.value]) {
                var html="<option value=\"\">Select value:";
                var values = filter_types[element.value].values();
                
                for (var index in values) 
                    html+="<option value=\""+index+"\">"+values[index];
                listel.innerHTML = html;
                listel.disabled =false;
            }
            else
            {
                listel.value = "";
                listel.innerHTML = "<option value=\"\">Select value:";
                listel.disabled = true;
                document.getElementById('filter-button').disabled = true;
            }
            break;
        case "filter-list-values":
            if (element.value)
                document.getElementById('filter-button').disabled = false;
            else
                document.getElementById('filter-button').disabled = true;
            break;
    }
}

function populate_filter_types_list () {
    var element=document.getElementById("filter-types");  
    var html="<option value=\"\">Select filter:</option>";
    for (index in filter_types) {
        html+="<option value=\""+index+"\">"+index;
    }
    element.innerHTML = html;
    element.disabled=false;
}
obinit.push(populate_filter_types_list);

function display_filters() {
    var element =document.getElementById("filters");
    var html = "";
    var filters = string_to_filters(mainstate.filters);
    for (var index in filters) {
        var filter = filters[index];
        html+="<span class=\"box\">"+filter.type+":"+filter.value+"<span class=\"clickable remove\" onclick=\"remove_filter("+index+")\" onmouseenter=\"this.parentElement.classList.add('remover')\"  onmouseleave=\"this.parentElement.classList.remove('remover')\">X</span></span>";
    }
    element.innerHTML=html;
}
obfilter.push(display_filters);
//obdata.push(display_filters);

function add_filter() {
    var type=document.getElementById("filter-types").value;  
    var value=document.getElementById("filter-list-values").value;
    if (type && filter_types[type]) {
        var filters = string_to_filters(mainstate.filters);
        filters.push({ type:type, value:value });
        mainstate.filters = filters_to_string(filters);
        state_changed();
        notify(obfilter);
    }
}

/* ==== Server list ==== */

function server_flag_html(value, image, tooltipon, tooltipoff) {
    if (value==1)
        return "<td class='flag'>"+tooltip("<img src=\""+image+"\"/>", tooltipon)+"</td>";
    if (value==0)
        return "<td class='flag'>"+tooltip("<img class=\"disabled\" src=\"icons/server_flags_none.png\"/>", tooltipoff)+"</td>";
    return "<td class='flag unknown'></td>";
}

    
function server_time(seconds) {
    
    var durations = {
        y:Math.round(seconds/3153600)/10,
        d:Math.round(seconds/86400),
        h:Math.round(seconds/3600),
        m:Math.round(seconds/60)
    }

    for (var i in durations) {
        if (durations[i] > 1)
            return durations[i]+i;
    }
    
    return seconds+"s";
}

var sorts = {
    rank:function(a, b)          { return a.rank - b.rank },
    clients:function(a, b)       { return a.clients - b.clients },
    clients_max:function(a, b)   { return a.clients_max - b.clients_max },
    clients_avg:function(a, b)   { return a.pop_v - b.pop_v },
    clients_top:function(a, b)   { return a.clients_top - b.clients_top },
    flag_creative:function(a, b) { return a.creative - b.creative },
    flag_pvp:function(a, b)      { return a.pvp - b.pvp },
    flag_damage:function(a, b)   { return a.damage - b.damage },
    flag_password:function(a, b) { return a.password - b.password },
    flag_far:function(a, b)      { return a.can_see_far_names - b.can_see_far_names },
    flag_rollback:function(a, b) { return a.rollback - b.rollback },
    uptime:function(a, b)        { return a.uptime - b.uptime },
    age:function(a, b)           { return a.game_time - b.game_time },
    ping:function(a, b)          { return a.ping - b.ping },
    lag:function(a, b)           { return a.lag - b.lag },
    name:function(a, b)          { return (a.name > b.name)?1:-1 },
    address:function(a, b)       { return (a.address > b.address)?1:-1 },
    description:function(a, b)   { return (a.description > b.description)?1:-1 },
    version:function(a, b)       { return (a.version > b.version)?1:-1 },
    subgame:function(a, b)       { return (a.subgame > b.subgame)?1:-1 },
    mapgen:function(a, b)        { return (a.mapgen > b.mapgen)?1:-1 },
};

function sort(el) {
    if (el.id.substr(0,5) == "sort-") { 
        var column = el.id.substr(5);
        if (sorts[column]) {
            if (mainstate.sort == column) {
                if (mainstate.order == "desc")
                    mainstate.order = "asc";
                else
                    mainstate.order = "desc";
                } else {
                mainstate.sort = column;
                mainstate.order = "asc";
            }
            state_changed();
            notify(obsort);
        }    
    }
}


function populate_servers_list() {

    var filters =  string_to_filters(mainstate.filters);

    if (!srvdata) return;

    var srvlist = srvdata.list;

    if (mainstate.sort) 
        if (sorts[mainstate.sort]) {
            srvlist.sort(sorts[mainstate.sort]);
            if (mainstate.order == "desc")
                srvlist.reverse();
        } else {
            mainstate.sort = nil;
            mainstate.order = nil;
            state_changed();
        }

    var html = "<table><tr>";
    //head row 1
    html+="<th rowspan=2 class='rank clickable' id='sort-rank' onclick=\"sort(this)\">Rank</th>";
    html+="<th colspan=4 class='head'>Players</th><th colspan=6 class='head'>Flags</th>";
    html+="<th rowspan=2 class='text clickable' id='sort-name' onclick='sort(this)'>Name</th>";
    html+="<th rowspan=2 class='text clickable' id='sort-address' onclick='sort(this)'>Address[:Port]</th>";
    html+="<th rowspan=2 class='text clickable' id='sort-description' onclick='sort(this)'>Description</th>";
    html+="<th colspan=4 class='head'>Server state</th>";
    html+="<th rowspan=2 class='smalltext clickable' id='sort-version' onclick='sort(this)'>Version</th>";
    html+="<th rowspan=2 class='smalltext clickable' id='sort-subgame' onclick='sort(this)'>Subgame</th>";
    html+="<th rowspan=2 class='smalltext clickable' id='sort-mapgen' onclick='sort(this)'>Mapgen</th>";
    html+="</tr><tr>";
    //head row 2
    html+="<th class='nb clickable' id='sort-clients' onclick='sort(this)'>nb</th>";
    html+="<th class='nb clickable' id='sort-clients_max' onclick='sort(this)'>max</th>";
    html+="<th class='nb clickable' id='sort-clients_avg' onclick='sort(this)'>avg</th>";
    html+="<th class='nb clickable' id='sort-clients_top' onclick='sort(this)'>top</th>";
    html+="<th class='flag clickable' id='sort-flag_creative' onclick='sort(this)'>crv</th>";
    html+="<th class='flag clickable' id='sort-flag_pvp' onclick='sort(this)'>pvp</th>";
    html+="<th class='flag clickable' id='sort-flag_damage' onclick='sort(this)'>dmg</th>";
    html+="<th class='flag clickable' id='sort-flag_password' onclick='sort(this)'>pwd</th>";
    html+="<th class='flag clickable' id='sort-flag_far' onclick='sort(this)'>far</th>";
    html+="<th class='flag clickable' id='sort-flag_rollback' onclick='sort(this)'>rol</th>";
    html+="<th class='nb clickable' id='sort-uptime' onclick='sort(this)'>upt</th>";
    html+="<th class='nb clickable' id='sort-age' onclick='sort(this)'>age</th>";
    html+="<th class='nb clickable' id='sort-ping' onclick='sort(this)'>ping</th>";
    html+="<th class='nb clickable' id='sort-lag' onclick='sort(this)'>lag</th>";
    
    html+="</tr></table>"
    document.getElementById("servers-header").innerHTML = html;
    
    html = "<table>";
    
    for (var index in srvlist) {
        var srv = srvlist[index];
        
        if (test_filters(srv, filters)) {
            html+="<tr>";

            // Rank
            html+="<td class='rank'>"+srv.rank+"</td>";
            
            // Players
            html+="<td class='nb'>"+srv.clients+"</td>";
            html+="<td class='nb'>"+(srv.clients_max>99?"99+":srv.clients_max)+"</td>";
            html+="<td class='nb'>"+Math.floor(srv.pop_v)+"</td>";
            html+="<td class='nb'>"+srv.clients_top+"</td>";
            
            // Server flags
            html+=server_flag_html(srv.creative,          "icons/server_flags_creative.png", "Creative mode",     "Not in creative mode");
            html+=server_flag_html(srv.pvp,               "icons/server_flags_pvp.png",      "PVP enabled",       "PVP disabled");
            html+=server_flag_html(srv.damage,            "icons/server_flags_damage.png",   "Damage enabled",    "Damage disabled");
            html+=server_flag_html(srv.password,          "icons/server_flags_password.png", "Password required", "Password optional");
            html+=server_flag_html(srv.can_see_far_names, "icons/server_flags_far.png",      "Can see far names", "Can't see far names");
            html+=server_flag_html(srv.rollback,          "icons/server_flags_roll.png",     "Rollback",          "No rollback");

            // Server name
            if (srv.url) 
                html+="<td class='text'><a href=\""+escapeHTML(srv.url)+"\">"+escapeHTML(srv.name)+"</td>";
            else
                html+="<td class='text'>"+escapeHTML(srv.name)+"</td>";

            // Server address
            if (srv.port && srv.port  != 30000)
                html+="<td class='text'>"+tooltip(srv.address+":"+srv.port, srv.ip+":"+srv.port)+"</td>";
            else
                html+="<td class='text'>"+tooltip(srv.address,srv.ip+":"+srv.port)+"</td>";
            
            // Server description
            html+="<td class='text'>"+escapeHTML(srv.description)+"</td>";
                        
            // Uptime, age, ping, lag
            if (srv.uptime>=0) html+="<td class='nb'>"+server_time(srv.uptime)+"</td>"; else html+="<td class='nb unknown'></td>";
            if (srv.game_time>=0) html+="<td class='nb'>"+server_time(srv.game_time)+"</td>"; else html+="<td class='nb unknown'></td>";
            if (srv.ping>=0) html+="<td class='nb'>"+Math.round(srv.ping*1000)+"</td>"; else html+="<td class='nb unknown'></td>";
            if (srv.lag>=0) html+="<td class='nb'>"+Math.round(srv.lag*1000)+"</td>"; else html+="<td class='nb unknown'></td>";
            
            // Version, subgame, mapgen
            if (srv.version) html+="<td class='smalltext'>"+escapeHTML(srv.version)+"</td>"; else html+="<td class='nb unknown'></td>";
            if (srv.gameid) html+="<td class='smalltext'>"+escapeHTML(srv.gameid)+"</td>"; else html+="<td class='nb unknown'></td>";
            if (srv.mapgen) html+="<td class='smalltext'>"+escapeHTML(srv.mapgen)+"</td>"; else html+="<td class='nb unknown'></td>";
            
  /*          var mods="";
            if (srv.mods)
                for (index2 in srv.mods) {
                    if (mods)
                        mods+=", "+srv.mods[index2];
                    else
                        mods = srv.mods[index2];
                }
            html += "<td>"+mods+"</td>";
            html = html + "</td>";
*/    //            list = list + "<td>"+srv.port+"</td>";
            html = html + "</th>";
        }
    }

    html = html + "</table>"
    document.getElementById("servers-list").innerHTML = html;
}
obdata.push(populate_servers_list);
obfilter.push(populate_servers_list);
obsort.push(populate_servers_list);

// Pour l'instant doit être apres le push de populate server list sinon elle ecrase la modif...
function display_sort() {
    var el;
    for (i in sorts) {
        el = document.getElementById('sort-'+i);
        if (el) {
            el.classList.remove('asc', 'desc');
            if (i == mainstate.sort) {
                el.classList.add(mainstate.order);
            }
        } 
    }
}
obsort.push(display_sort);

/*
function populate_players_list() {
    var page =  document.getElementById("page-players");

    var srvlist = srvdata.list

    var servers = {}
    var names = []
    
    for (var i in srvlist) {
        for (var j in srvlist[i].clients_list) {
            var player = servers[srvlist[i].clients_list[j]]
            if (servers[srvlist[i].clients_list[j]])
                servers[srvlist[i].clients_list[j]] = servers[srvlist[i].clients_list[j]] + ", "  + srvlist[i].name;
            else {
                servers[srvlist[i].clients_list[j]] = srvlist[i].name;
                names.push(srvlist[i].clients_list[j]);
            }
        }
    }
    
    names.sort(function(a,b) { return a.toLowerCase().localeCompare(b.toLowerCase());});

    var html = "<table><tr><th>Player</th><th>Servers</th></tr>";
    for (var i in names)
        html = html+"<tr><td>"+names[i]+"</td><td>"+servers[names[i]]+"</td></tr>"
    html = html + "</table>";

    page.innerHTML  = html;
}
obdata.push(populate_players_list);
*/

function init() {
    state_from_url();
    if (!mainstate.page | mainstate.page == "") 
        mainstate.page="servers";
    notify(obinit);
    state_changed();
    notify(obfilter);
}

