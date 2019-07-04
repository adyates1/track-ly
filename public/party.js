$(document).ready(function () {
    // Cookie functions
    function setCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
    // Get the input field
    var searchBox = document.getElementById("inputSong");

    // Execute a function when the user releases a key on the keyboard
    searchBox.addEventListener("keyup", function (event) {
        // Cancel the default action, if needed
        event.preventDefault();
        // Number 13 is the "Enter" key on the keyboard
        if (event.keyCode === 13) {
            // Trigger the button element with a click
            document.getElementById("inputSongBtn").click();
        }
    });

    // Initialise Socket.IO, constants and variables
    const socket = io();
    const REDIRECT_URI_DOMAIN = "track-ly.com";
    let userID;
    let playlistID = localStorage.getItem("playlistID");
    const url = window.location.href;
    const partyNo = localStorage.getItem("roomNo");
    const nickName = localStorage.getItem("name");
    let allSongs;
    const host = localStorage.getItem("isHost");
    let allowExplicit = (localStorage.getItem("allowExplicitSongs") == 'true');
    let allowDelete = (localStorage.getItem("allowDeleteSongs") == 'true');
    let maxSongs = Number.MAX_SAFE_INTEGER;
    let songsUsed = parseInt(localStorage.getItem("songsUsed"));

    $("#songsAddedDisplay").html(songsUsed);
    $("#maximumSongsDisplay").html(maxSongs);

    let displayValue;
    if (allowExplicit) {
        displayValue = "Allowed";
    } else {
        displayValue = "Not allowed"
    }
    $("#explicitSongsDisplay").html(displayValue);

    if (allowDelete) {
        displayValue = "Allowed";
    } else {
        displayValue = "Not allowed"
    }
    $("#deleteSongsDisplay").html(displayValue);

    $("#slideshowModal").modal('show');

    // Gets all songs from local storage if it exists
    if (localStorage.getItem("allSongs") == "undefined") {
        allSongs = [];
    }
    else {
        allSongs = JSON.parse(localStorage.getItem("allSongs"));
    }
    let authorised = false;
    // If the user has authorised, commit the access token to local storage
    if (url.includes("token")) {
        authorised = true;
        document.getElementById('launchBtn').style.display = "inline-block";
        localStorage.setItem("access_token", url.substring(url.indexOf("token=") + 6, url.indexOf("&")));
        localStorage.setItem("refresh_token", url.substring(url.indexOf("refresh=") + 8, url.length));
        socket.emit("getUserProfileInfo", localStorage.getItem("access_token"));
        document.getElementById('alertLocation').innerHTML = document.getElementById('alertLocation').innerHTML + '<div class="alert alert-dismissible alert-warning mb-0" role="alert">\n' +
            '  <button type="button" class="close" data-dismiss="alert">&times;</button><strong>Note: </strong> If your songs are not showing up on the list, please refresh the page.\n' +
            '</div><br>'
    }
    socket.emit("joinedPartyRoom", partyNo, nickName);
    //  ----  END SETUP   ---

    /**
     *  jQuery Click Handlers
     */

    $("#launchBtn").click(function (e) {
        window.location.href = "spotify:playlist:" + playlistID;
        document.getElementById('alertLocation').innerHTML = document.getElementById('alertLocation').innerHTML +
            "<div class='alert alert-dismissible alert-success mt-2'><button type='button' class='close' data-dismiss='alert'>&times;</button><strong>Spotify launched!</strong> If that didn't quite work, try the <a href='https://open.spotify.com/user/" + userID + "/playlist/" + playlistID
            + "' target='blank'>Spotify Web Player</a></div>"
    });

    // Shows help modal
    $("#helpButton").click(function (e) {
        e.preventDefault();
        $("#helpModal").modal('show');
    });

    // Expands the nav bar menu on small screens
    $(".dropdown-menu li a").click(function (e) {
        e.preventDefault();
        $(".btn:first-child").text($(this).text());
        $(".btn:first-child").val($(this).text());

    });

    // User confirmed playlist to import
    $("#addConfirmedPlaylist").click(function (e) {
        e.preventDefault();
        const confirmedPlaylist = $('#playlistModalBody input:radio:checked');
        const playlist = confirmedPlaylist.attr('value');
        $('#choosePlaylistModal').modal('hide');
        localStorage.setItem("playlistID", playlist);
        playlistID = playlist;
        localStorage.setItem("spotifyLinked", 'true');
    });

    // When the user selects a song, send it to the server to be added to the list & playlists
    $("#inputSongBtn").click(function () {
        if (!($("#inputSong").val() == "")) {
            socket.emit("getSong", $("#inputSong").val(), $("#typeSelection").val().toLowerCase(), allowExplicit);
        }
    });

    // Opens the spotify authorisation prompt and redirects to the same page with
    // the access and refresh tokens as GET parameters - for a NEW playlist
    $("#authoriseButton").click(function () {
        localStorage.setItem("allSongs", JSON.stringify(allSongs));
        localStorage.setItem("spotifyLinked", 'true');
        localStorage.setItem("actionRequested", "createPlaylist");
        const client_id = ""; // CLIENT ID
        setCookie("initialLink", true, 1);
        // Open the auth popup
        window.location.href = "https://accounts.spotify.com/authorize?client_id=" + client_id +
            "&response_type=code" +
            "&redirect_uri=https://" + REDIRECT_URI_DOMAIN + "/callback" +
            "&scope=playlist-read-collaborative playlist-modify-private playlist-read-private playlist-modify-public";
    });

    // Opens the spotify authorisation prompt and redirects to the same page with
    // the access and refresh tokens as GET parameters - for an EXISTING playlist
    $("#importPlButton").click(function () {
        localStorage.setItem("allSongs", JSON.stringify(allSongs));
        localStorage.setItem("spotifyLinked", 'true');
        localStorage.setItem("actionRequested", "importPlaylist");
        const client_id = ""; // CLIENT ID
        setCookie("initialLink", true, 1);
        // Open the auth popup
        window.location.href = "https://accounts.spotify.com/authorize?client_id=" + client_id +
            "&response_type=code" +
            "&redirect_uri=https://" + REDIRECT_URI_DOMAIN + "/callback" +
            "&scope=playlist-read-collaborative playlist-modify-private playlist-read-private playlist-modify-public";
    });

    // When the user selects a song, add it to the playlist
    $("#addConfirmedSongs").click(function () {
        if (songsUsed < maxSongs || isNaN(maxSongs) || maxSongs == null) {
            const confirmedSong = $('#modalBody input:radio:checked');
            const song = confirmedSong.attr('value');
            $('#songConfirmModal').modal('hide');
            socket.emit("addedSongs", song, nickName);
            songsUsed += 1;
            $("#songsAddedDisplay").html(songsUsed);
            localStorage.setItem("songsUsed", songsUsed);
        } else {
            console.log(maxSongs == Number.MAX_SAFE_INTEGER);
            console.log(maxSongs);
            alert("You've used all your available songs!");
        }
    });

    /**
     *  Room Updates
     */

    // When the user has joined a room, ensure they have a copy of any songs
    socket.on("joinedRoom", function (roomNo, clients) {
        $("#title").text("Room: " + roomNo);
        $("#members").html("<p></p>");
        for (let i = 0; i < clients.length; i++) {
            $("#members").append("<p>" + clients[i] + "</p>");
        }
        if (allSongs[0] == "undefined" && clients.length == 1) {
            allSongs = JSON.parse(localStorage.getItem("allSongs"));
            for (let i = 0; i < allSongs.length; i++) {
                const artist = allSongs[i].artist;
                const song = allSongs[i].name;
                const imgUrl = allSongs[i].imgUrl;
                const songId = allSongs[i].id;
                const uniqueID = Date.now();
                // Adds songs to the song list
                if (allowDelete) {
                    $("#songList").append("<div class='flex-container pl-2 songItem  border rounded mb-2 animate-bottom animate-opacity'><p class='align-center flex-item' style='flex-grow: 1'>" + artist + ", " + song + "<sub>Added by: " + allSongs[i].addedBy + "</sub></p><img id='" + uniqueID + "' src='delete.png' class='flex-item' /><img class='flex-item pr-2' src='" + imgUrl + "'/></div>");
                    document.getElementById(uniqueID).addEventListener("click", function () {
                        socket.emit("deleteSongIntention", songId, allSongs[i].name);
                    });
                } else {
                    $("#songList").append("<div class='flex-container pl-2 songItem  border rounded mb-2 animate-bottom animate-opacity'><p class='align-center flex-item' style='flex-grow: 1'>" + artist + ", " + song + "<sub>Added by: " + allSongs[i].addedBy + "</sub></p><img class='flex-item pr-2' src='" + imgUrl + "'/></div>");
                }
            }
        }
        if (!(allSongs[0] === undefined)) {
            socket.emit("giveSongs", allSongs);
        }
        if (host == "true") {
            maxSongs = parseInt(localStorage.getItem("maxSongs"));
            socket.emit("valueOfMaxSongs", maxSongs);
            socket.emit("allowExplicitSongs", allowExplicit);
            socket.emit("allowDeleteSongs", allowDelete);
        }
    });

    // Called when the list of clients is updated so that the room members can be displayed accurately
    socket.on("roomUpdate", function (roomNo, clients) {
        $("#members").html("<p></p>");
        for (let i = 0; i < clients.length; i++) {
            $("#members").append("<p>" + clients[i] + "</p>");
        }
    });

    /**
     *  Room Preference Sharing
     */

    // Receives max songs for the room
    socket.on('maxSongVal', function (maxSongVal) {
        if (maxSongs > maxSongVal) {
            maxSongs = maxSongVal;
            console.log(maxSongs);
        }
        $("#maximumSongsDisplay").html(maxSongs);

    });

    // Receives explicit song value preference for room
    socket.on('allowExplicit', function (allow) {
        allowExplicit = allow;
        console.log(allowExplicit);
        let displayValue;
        if (allowExplicit) {
            displayValue = "Allowed";
        } else {
            displayValue = "Not allowed"
        }
        $("#explicitSongsDisplay").html(displayValue);

    });

    // Receives allow delete preference for room
    socket.on('allowDelete', function (allow) {
        allowDelete = allow;
        let displayValue;
        if (allowDelete) {
            displayValue = "Allowed";
        } else {
            displayValue = "Not allowed"
        }
        $("#deleteSongsDisplay").html(displayValue);
    });

    /**
     * (Non-Spotify) Playlist Maintenance
     */

    // Callback when the user wants to import one of their playlists to display their playlists
    socket.on("gotPlaylists", function (playlistObj) {
        $("#choosePlaylistModal").modal('show');
        $("#playlistModalBody").html("<p></p>");
        // User has no playlists
        if (playlistObj == undefined) {
            $("#playlistModalBody").append("<h2>Uh oh! No playlists were found!</h2>");
        }
        // Add playlists to modal
        for (let i = 0; i < playlistObj.length; i++) {
            const id = playlistObj[i].id;
            const name = playlistObj[i].name;
            $("#playlistModalBody").append("<div class=\"radio\">\n<label><input class='radioselector' type='radio' name=\"optradio\" value=" + id + ">" + name + "</label></div>");
        }
    });

    // Displays a passed set of songs to the song list
    socket.on('previousSongs', function (songs) {
        let spotifyPreviouslyIntegrated = authorised;
        let backupOfSongs;
        if (spotifyPreviouslyIntegrated) {
            backupOfSongs = allSongs;
        }
        if (allSongs <= songs) {
            allSongs = songs;
        }

        $("#songList").html("<p></p>");
        for (let i = 0; i < allSongs.length; i++) {
            const artist = allSongs[i].artist;
            const song = allSongs[i].name;
            const imgUrl = allSongs[i].imgUrl;
            const songId = allSongs[i].id;
            const uniqid = Date.now();
            // Adds songs to the song list
            if (allowDelete) {
                $("#songList").append("<div class='flex-container pl-2 songItem  border rounded mb-2 animate-bottom animate-opacity'><p class='align-center flex-item' style='flex-grow: 1'>" + artist + ", " + song + "<sub>Added by: " + allSongs[i].addedBy + "</sub></p><img id='" + uniqid + "' src='delete.png' class='flex-item' /><img class='flex-item pr-2' src='" + imgUrl + "'/></div>");
                document.getElementById(uniqid).addEventListener("click", function () {
                    socket.emit("deleteSongIntention", songId, song);
                });
            } else {
                $("#songList").append("<div class='flex-container pl-2 songItem  border rounded mb-2 animate-bottom animate-opacity'><p class='align-center flex-item' style='flex-grow: 1'>" + artist + ", " + song + "<sub>Added by: " + allSongs[i].addedBy + "</sub></p><img class='flex-item pr-2' src='" + imgUrl + "'/></div>");
            }
        }
        // TODO here we can't just add the songs again
        if (spotifyPreviouslyIntegrated) {
            let songsToSendToSpotify = [];
            for (let i = 0; i < allSongs.length; i++) {
                let found = false;
                for (let j = 0; j < backupOfSongs.length; j++) {
                    if (allSongs[i].id == backupOfSongs[j].id) {
                        found = true;
                    }
                }
                if (!found) {
                    songsToSendToSpotify.push(allSongs[i]);
                }
            }
            socket.emit("addExistingSongs", localStorage.getItem("userId"), songsToSendToSpotify, localStorage.getItem("access_token"), playlistID);
        }
    });

    // Gives the playlist ID back to the user that requested it
    socket.on("givePlaylistID", function (playlistId) {
        playlistID = playlistId;
        localStorage.setItem("playlistID", playlistID);
        if (getCookie("initialLink") == "true") {
            socket.emit("addExistingSongs", localStorage.getItem("userId"), allSongs, localStorage.getItem("access_token"), playlistID);
        }
    });

    // Adds songs to the list and Spotify if required
    socket.on("songsToAdd", function (songData) {
        allSongs.push(songData);
        localStorage.setItem("allSongs", JSON.stringify(allSongs));
        if (localStorage.getItem("spotifyLinked") == 'true') {
            socket.emit("postSongs", songData, localStorage.getItem("access_token"), userID, localStorage.getItem("playlistID"));
        }
        const artist = songData.artist;
        const song = songData.name;
        const imgUrl = songData.imgUrl;
        const uniqueID = Date.now();
        if (allowDelete) {
            $("#songList").append("<div class='flex-container pl-2 songItem  border rounded mb-2 animate-bottom animate-opacity'><p class='align-center flex-item' style='flex-grow: 1'>" + artist + ", " + song + "<sub>Added by: " + songData.addedBy + "</sub></p><img id='" + uniqueID + "' src='delete.png' class='flex-item' /><img class='flex-item pr-2' src='" + imgUrl + "'/></div>");
            document.getElementById(uniqueID).addEventListener("click", function () {
                socket.emit("deleteSongIntention", songData.id, songData.name);
            });
        } else {
            $("#songList").append("<div class='flex-container pl-2 songItem  border rounded mb-2 animate-bottom animate-opacity'><p class='align-center flex-item' style='flex-grow: 1'>" + artist + ", " + song + "<sub>Added by: " + songData.addedBy + "</sub></p><img class='flex-item pr-2' src='" + imgUrl + "'/></div>");
        }
    });

    // Song ID and Name to delete
    socket.on('songDeletionStaged', function (songID, songName) {
        // If the user has linked Spotify, then delete from their playlist
        if (authorised) {
            socket.emit("deleteSong", songID, userID, playlistID, localStorage.getItem("access_token"));
        }
        $("p:contains('" + songName + "')").parent().remove();
        // delete song from allSongs
        for (let i = 0; i < allSongs.length; i++) {
            if (allSongs[i].id == songID) {
                allSongs.splice(i, 1);
            }
        }
    });

    /**
     *  Spotify OAuth Token Generation, Profile and Search Integration
     */

    // If the token needed to be refreshed, it shall be passed through here
    socket.on("gotNewToken", function (access_token) {
        socket.emit("getUserProfileInfo", access_token);
       // localStorage.setItem("actionRequested", "none");
        localStorage.setItem("access_token", access_token);
        console.log(access_token);
        console.log(localStorage.getItem("refresh_token"));
    });

    // Refresh the access token because the server returned a 401 when performing a Spotify API Request
    socket.on('getNewToken', function () {
        let refreshToken = localStorage.getItem("refresh_token");
        socket.emit("getNewTokenFromSpotify", refreshToken);
    });

    // Once a user id has been found, commit it to local storage and consider the user's previous action
    socket.on("gotUserID", function (id) {
        userID = id;
        localStorage.setItem("userId", id);
        //  Get the user's previous action
        const action = localStorage.getItem("actionRequested");
        //if we need to create a new playlist
        if (action == "createPlaylist") {
            socket.emit("getRoomPlaylistID", localStorage.getItem("userId"), localStorage.getItem("access_token"), playlistID, partyNo);
            localStorage.setItem("actionRequested", "none")
        }
        // if we need to import an existing playlist
        if (action == "importPlaylist") {
            // socket emit to get playlists
            socket.emit("getPlaylists", localStorage.getItem("userId"), localStorage.getItem("access_token"));
            localStorage.setItem("actionRequested", "none");
        }
    });

    // Callback from the server with a set of songs that match a query
    socket.on('songConfirmation', function (data) {
        $('#songConfirmModal').modal('show');
        $("#modalBody").html("<p></p>");
        if (data == undefined) {
            $("#modalBody").append("<h2>Uh oh! No songs were found!</h2>");
        }

        const songs = data;
        for (let i = 0; i < songs.length; i++) {
            const artist = songs[i].artist;
            const song = songs[i].name;
            const songId = songs[i].id;
            const songUrl = songs[i].imgUrl;
            $("#modalBody").append("" +
                "<div class=\"radio\">" +
                "<div class='flex-container pl-2 songItem  border rounded mb-2'><p class='align-center flex-item'><label><input class='radioselector' type='radio' name=\"optradio\" value=" + songId + ">" + " " + artist + ", " + song +
                "</label></p><img class='flex-item pr-2' src=' " + songUrl + "'/></div></div>");
        }
    });

    socket.on("notUsersPlaylist", function(){
        document.getElementById('alertLocation').innerHTML = document.getElementById('alertLocation').innerHTML + '<div class="alert alert-dismissible alert-danger mb-0" role="alert">\n' +
            '  <button type="button" class="close" data-dismiss="alert">&times;</button><strong>Error: </strong> The playlist you\'re trying to add to is not owned by this Spotify account.\n' +
            '</div>'
    });
});
