/**
 * This block shows what must be changed
 */
// // HTTP STUFF STARTS
// const http = require('http').Server(app);
// const io = require('socket.io')(http);
// http.listen(3000, function () {
//     console.log('listening on *:3000');
// });
// // Client ID, Secret, and Redirect URI
// const clientID = 'b49aee0617164a9d9c1c0bee5ab57ba4'; // Your client id
// const clientSecret = '039f4f5c76eb481db6fdec590fdfd65e'; // Your secret
// const redirectURI = "localhost:3000"; // Redirect URI Domain only
// // HTTP STUFF ENDS

// Imports and constants
const request = require('request');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
http.listen(3000, function () {
    console.log('listening on *:3000');
});
// // Client ID, Secret, and Redirect URI
const clientID = ''; // Your client id
const clientSecret = ''; // Your secret
const redirectURI = "localhost:3000"; // Redirect URI Domain only
const encodedClientIDAndSecret = new Buffer(clientID + ':' + clientSecret).toString('base64');
const allClients = [];
const songsInRoom = [[]];

// Routes
app.get('/.well-known/pki-validation/134B9C41265DFFF1E96D6217BC8938A3.txt', function (req, res) {
    try {
        res.sendFile(__dirname + '/public/134B9C41265DFFF1E96D6217BC8938A3.txt');
    } catch (e) {
        return next(e);
    }
})
;
app.get('/', function (req, res) {
    try {
        res.sendFile(__dirname + '/landingPage.html');
    } catch (e) {
        return next(e);
    }
});
app.get('/home', function (req, res) {
    try {
        res.sendFile(__dirname + '/index.html');
    } catch (e) {
        return next(e);
    }
});
app.get('/party', function (req, res) {
    try {
        res.sendFile(__dirname + '/party.html');
    } catch (e) {
        return next(e);
    }
});
app.get('/about', function (req, res) {
    try {
        res.sendFile(__dirname + '/about.html');
    } catch (e) {
        return next(e);
    }
});
app.get('/contact', function (req, res) {
    try {
        res.sendFile(__dirname + '/contact.html');
    } catch (e) {
        return next(e);
    }
});
app.get('/howTo', function (req, res) {
    try {
        res.sendFile(__dirname + 'howToUse.html');
    } catch (e) {
        return next(e);
    }
});
app.get('/application-summary', function (req, res) {
    try {
        res.sendFile(__dirname + '/application-summary.html');
    } catch (e) {
        return next(e);
    }
});
app.get('/changelog', function (req, res) {
    try {
        res.sendFile(__dirname + '/changelog.html');
    } catch (e) {
        return next(e);
    }
});
// Authorisation callback
app.get('/callback', function (req, res) {
    try {
        const authorisationCode = req.query.code;
        const requestURL = "https://accounts.spotify.com/api/token";
        const encodedFormData = {
            grant_type: "authorization_code",
            redirect_uri: "http://" + redirectURI + "/callback",
            code: authorisationCode
        };
        const httpHeaders = {
            Authorization: 'Basic ' + encodedClientIDAndSecret,
            "Content-Type": "x-www-formurlencoded"
        };
        request.post({url: requestURL, form: encodedFormData, headers: httpHeaders}, function (error, response, body) {
            const parsedBody = JSON.parse(body);
            return res.redirect("/party?token=" + parsedBody.access_token + "&refresh=" + parsedBody.refresh_token);
        });
    } catch (e) {
        return next(e);
    }
});
app.use(express.static(__dirname + '/public'));
app.get('*', function (req, res) {
    try {
        res.sendFile(__dirname + '/404pageNotFound.html')
    } catch (e) {
        return next(e);
    }
});

app.use(function(err, req, res, next) {
    // Do logging and user-friendly error message display
    console.error(err);
    res.status(500).send({status:500, message: 'internal error', type:'internal'});
});
// First join to any page
io.on('connection', function (socket) {

    /**
     * Socket.IO Room Handling
     */

    allClients.push(socket);
    console.log("Total users: " + allClients.length);

    // TODO Room names could be nicer
    // Creates a party with a unique room number
    socket.on("createParty", function () {
        try {
            const indices = "qwertyuiopasdfghjklzxcvbnm0123456789";
            let room = "";
            for (let x = 0; x < 6; x++) {
                const rand = Math.floor(Math.random() * 36);
                room = room + indices.charAt(rand);
            }
            socket.join(room);
            socket.room = room;
            io.to(room).emit('joinedRoom', socket.room, true);
        } catch (error) {
            console.log(error);
        }
    });

    // Ensures that a room exists before joining one
    socket.on("joinedPartyRoom", function (room, nickName) {
        try {
            socket.join(room);
            socket.room = room;
            socket.nickname = nickName;
            const socketIDs = io.sockets.adapter.rooms[room].sockets;
            const clients = [];
            for (let socketId in socketIDs) {
                clients.push(io.sockets.connected[socketId].nickname);
            }
            io.to(socket.room).emit('joinedRoom', socket.room, clients);
        } catch (error) {
            console.log(error);
        }
    });

    // Joining a room
    socket.on('joinRoom', function (room) {
        socket.join(room);
    });

    // Informs other members of a party member joining
    socket.on("joiningParty", function (roomToJoin) {
        try {
            for (let i = 0; i < allClients.length; i++) {
                if (allClients[i].room == roomToJoin) {
                    socket.emit("joinedRoom", roomToJoin, false);
                }
            }
        } catch (error) {
            console.log(error);
        }
    });

    // Handle disconnect
    socket.on('disconnect', function () {
        const i = allClients.indexOf(socket);
        allClients.splice(i, 1);
        const room = socket.room;
        let clients = [];
        for (let j = 0; j < allClients.length; j++) {
            if (allClients[j].room == room) {
                clients.push(allClients[j].nickname);
            }
        }
        let songs = [];
        if (!(songsInRoom[socket.room] == null)) {
            songs = songsInRoom[socket.room];
        } else {
            songs = [];
        }
        io.to(socket.room).emit('roomUpdate', socket.room, clients, songs);
    });

    // Gives a list of songs to a new client
    socket.on("giveSongs", function (songs) {
        io.to(socket.room).emit('previousSongs', songs);
    });

    // Called when one user intends to delete a song. The server must then call on all connected users to send over their
    // access tokens for deletion
    socket.on("deleteSongIntention", function (songID, songName) {
        io.to(socket.room).emit('songDeletionStaged', songID, songName); // Tell users to send IDs
    });

    /**
     *  Socket.IO Room Preferences Value Sharing
     */

    // Gives a new client the max number of songs
    socket.on("valueOfMaxSongs", function (maxSongs) {
        io.to(socket.room).emit('maxSongVal', maxSongs);
    });

    // Gives a new client the explicit songs feature value
    socket.on("allowExplicitSongs", function (allow) {
        console.log(allow);
        io.to(socket.room).emit('allowExplicit', allow);
    });

    // Gives a new client the song deletion feature value
    socket.on("allowDeleteSongs", function (allow) {
        io.to(socket.room).emit('allowDelete', allow);
    });

    /**
     *  Spotify Authentication
     */

    // Gets the initial token for a user through the auth code flow
    socket.on("getNewInitialToken", function (redirectURI, authorisationCode) {
        try {
            const requestUrl = "https://accounts.spotify.com/api/token";
            const encodedFormData = {
                grant_type: "authorization_code",
                redirect_uri: redirectURI,
                code: authorisationCode
            };
            const headers = {
                Authorization: 'Basic ' + encodedClientIDAndSecret,
                "Content-Type": "x-www-formurlencoded"
            };
            request.post({url: requestUrl, form: encodedFormData, headers: headers}, function (error, response, body) {
                const parsedBody = JSON.parse(body);
                io.sockets.connected[socket.id].emit("gotNewInitialToken", parsedBody.access_token, parsedBody.refresh_token);
            });
        } catch (error) {
            console.log(error);
        }
    });

    // Gets a new token for a client whose token has expired
    socket.on("getNewTokenFromSpotify", function (refreshToken) {
        try {
            const requestUrl = "https://accounts.spotify.com/api/token";
            const encodedFormData = {
                grant_type: "refresh_token",
                refresh_token: refreshToken
            };
            const headers = {
                Authorization: 'Basic ' + encodedClientIDAndSecret,
                "Content-Type": "x-www-formurlencoded"
            };
            request.post({url: requestUrl, form: encodedFormData, headers: headers}, function (err, res, body) {
                const parsedBody = JSON.parse(body);
                io.to(socket.room).emit("gotNewToken", parsedBody.access_token);
            });
        } catch (error) {
            console.log(error);
        }
    });

    /**
     *  Spotify User Profile Interactions
     */

    // Gets a User's Spotify ID
    socket.on("getUserProfileInfo", function (accessToken) {
        try {
            const requestOptions = {
                url: 'https://api.spotify.com/v1/me',
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                },
                json: true
            };
            request.get(requestOptions, function (error, response, body) {
                console.log(body);
                io.sockets.connected[socket.id].emit("gotUserID", body.id);
                if (response.statusCode === 401) {
                    io.to(socket.room).emit('getNewToken');
                }
            });
        } catch (error) {
            console.log(error);
        }
    });

    // When the user wants to import a playlist, returns their top 20
    socket.on("getPlaylists", function (userID, accessToken) {
        try {
            const requestOptions = {
                url: "https://api.spotify.com/v1/users/" + userID + "/playlists",
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                }
            };
            request.get(requestOptions, function (err, res, body) {
                const parsedBody = JSON.parse(body);
                const newPlaylistObject = [];
                for (let x = 0; x < parsedBody.items.length; x++) {
                    const playlistFormat = {id: null, name: null};
                    playlistFormat.id = parsedBody.items[x].id;
                    playlistFormat.name = parsedBody.items[x].name;
                    newPlaylistObject.push(playlistFormat);
                }
                io.sockets.connected[socket.id].emit("gotPlaylists", newPlaylistObject);
            });
        } catch (error) {
            console.log(error);
        }
    });

    // Gets a playlist ID or makes a playlist if it's nonexistent
    socket.on("getRoomPlaylistID", function (userID, accessToken, potentialPlaylistID, roomID) {
        try {
            if (potentialPlaylistID == 'undefined' || potentialPlaylistID == 'null' || potentialPlaylistID == null || potentialPlaylistID == undefined) {
                let requestOptions = {
                    url: "https://api.spotify.com/v1/users/" + userID + "/playlists",
                    headers: {
                        'Authorization': 'Bearer ' + accessToken,
                        'Content-Type': 'application/json'
                    },
                    body: "{\"name\" : \"" + roomID + "\"}"
                };
                request.post(requestOptions, function (err, res, body) {
                    const parsedBody = JSON.parse(body);
                    const playlistID = parsedBody.id;
                    io.sockets.connected[socket.id].emit("givePlaylistID", playlistID);
                });
            } else {
                try {
                    let requestOptions = {
                        url: "https://api.spotify.com/v1/users/" + userID + "/playlists/" + potentialPlaylistID,
                        headers: {
                            'Authorization': 'Bearer ' + accessToken,
                            'Content-Type': 'application/json'
                        },
                    };
                    request.get(requestOptions, function (err, res, body) {
                        if (res.statusCode === 401) {
                            io.to(socket.room).emit('getNewToken');
                        }
                        io.sockets.connected[socket.id].emit('givePlaylistID', potentialPlaylistID);
                    });
                } catch (error) {
                    console.log(error);
                }
            }
        } catch (error) {
            console.log(error);
        }
    });

    /**
     *  Spotify User Playlist Interactions
     */

    // Actually deletes a song from a given player's playlist, and sends them the OK to delete song from UI
    socket.on("deleteSong", function (songToDeleteID, userID, playlistID, accessToken) {
        let requestOptions = {
            url: "https://api.spotify.com/v1/users/" + userID + "/playlists/" + playlistID + "/tracks",
            headers: {
                'Authorization': 'Bearer ' + accessToken,
            },
            body: JSON.stringify({"tracks": [{"uri": "spotify:track:" + songToDeleteID}]})
        };
        request.delete(requestOptions, function (err, res, body) {
            // TODO delete songs from UI initiated here?
        });
    });

    // When the playlist has been updated, inform all users of the change
    socket.on("addedSongs", function (song, addedBy) {
        try {
            const requestOptions = {
                url: 'https://accounts.spotify.com/api/token',
                headers: {
                    'Authorization': 'Basic ' + encodedClientIDAndSecret
                },
                form: {
                    grant_type: 'client_credentials'
                },
                json: true
            };
            request.post(requestOptions, function (error, response, body) {
                // use the access token to access the Spotify Web API
                const token = body.access_token;
                const requestOptions = {
                    url: 'https://api.spotify.com/v1/tracks/' + song,
                    headers: {
                        'Authorization': 'Bearer ' + token,
                    },
                    json: true
                };
                request.get(requestOptions, function (error, response, body) {
                    if (response.statusCode === 401) {
                        io.to(socket.room).emit('getNewToken');
                    }
                    const songObject = {"name": "", "artist": "", "id": "", "imgUrl": "", "addedBy": ""};
                    songObject.name = body.name;
                    songObject.artist = body.album.artists[0].name;
                    songObject.id = body.id;
                    songObject.imgUrl = body.album.images[0].url;
                    songObject.addedBy = addedBy;
                    io.to(socket.room).emit("songsToAdd", songObject);
                });
            });
        } catch (error) {
            console.log(error);
        }
    });

    // Adds a set of existing songs from a user's list to a Spotify playlist
    socket.on("addExistingSongs", function (userID, songsToAdd, accessToken, playlistID) {
        try {
            const options = {
                url: "https://api.spotify.com/v1/users/" + userID + "/playlists/" + playlistID,
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                }
            };
            request.get(options, function (error, response, body) {
                try {
                    let songListAsJSON = "[";
                    for (let i = 0; i < songsToAdd.length; i++) {
                        songListAsJSON = songListAsJSON + '\"spotify:track:' + songsToAdd[i].id + '\"';
                        if (i !== songsToAdd.length - 1) {
                            songListAsJSON = songListAsJSON + ",";
                        }
                    }
                    songListAsJSON = songListAsJSON + "]";
                    const requestOptions = {
                        url: "https://api.spotify.com/v1/users/" + userID + "/playlists/" + playlistID + "/tracks",
                        headers: {
                            'Authorization': 'Bearer ' + accessToken,
                            'Content-Type': 'application/json'
                        },
                        body: "{\"uris\" :" + songListAsJSON + "}"
                    };
                    request.post(requestOptions, function (err, res, body) {
                        if (res.statusCode === 401) {
                            io.to(socket.room).emit('getNewToken');
                        }
                    });
                } catch (error) {
                    console.log(error);
                }
            });
        } catch (error) {
            console.log(error);
        }
    });

    // Posts a song to the Spotify API to add to a playlist
    socket.on("postSongs", function (songObject, accessToken, userID, playlistID) {
        try {
            let songListAsJson = "[";
            songListAsJson = songListAsJson + '\"spotify:track:' + songObject.id + '\"' + "]";
            const options = {
                url: "https://api.spotify.com/v1/users/" + userID + "/playlists/" + playlistID + "/tracks",
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                },
                body: "{\"uris\" :" + songListAsJson + "}"
            };
            request.post(options, function (error, response, body) {
                if (response.statusCode === 401) {
                    io.to(socket.room).emit('getNewToken');
                }
                try{
                    if(JSON.parse(body).error.status == 403){
                        io.sockets.connected[socket.id].emit("notUsersPlaylist");
                    }
                }catch(e){


                }
            });
        } catch (error) {
            console.log(error);
        }
    });

    /**
     *  Spotify Search Interactions
     */

    // Gets a list of songs from the Spotify API
    socket.on("getSong", function (song, searchCategory, allowExplicitSongs) {
        const requestOptions = {
            url: 'https://accounts.spotify.com/api/token',
            headers: {
                'Authorization': 'Basic ' + encodedClientIDAndSecret
            },
            form: {
                grant_type: 'client_credentials'
            },
            json: true
        };
        request.post(requestOptions, function (error, response, body) {
            let requestOptions;
            try {
                if (response.statusCode === 401) {
                    io.to(socket.room).emit('getNewToken');
                }
                if (!error && response.statusCode === 200) {
                    // use the access token to access the Spotify Web API
                    const accessToken = body.access_token;
                    if (searchCategory == 'track') {
                        requestOptions = {
                            url: 'https://api.spotify.com/v1/search' + '?type=track&q=' + song,
                            headers: {
                                'Authorization': 'Bearer ' + accessToken,
                            },
                            json: true
                        };
                        request.get(requestOptions, function (error, response, body) {

                            try {
                                if (response.statusCode === 401) {
                                    io.to(socket.room).emit('getNewToken');
                                }
                                const songs = [];
                                for (let i = 0; i < body.tracks.items.length; i++) {
                                    const songObject = {"name": "", "artist": "", "id": "", "imgUrl": ""};
                                    songObject.name = body.tracks.items[i].name;
                                    songObject.artist = body.tracks.items[i].album.artists[0].name;
                                    songObject.id = body.tracks.items[i].id;
                                    songObject.imgUrl = body.tracks.items[i].album.images[0].url;
                                    if (!(!allowExplicitSongs && body.tracks.items[i].explicit)) {
                                        songs.push(songObject);
                                    }
                                }
                                if (!(songs[0] == undefined)) {
                                    io.sockets.connected[socket.id].emit('songConfirmation', songs);
                                }
                            } catch (error) {
                                console.log("Error in track request")
                            }
                        });
                    }
                    if (searchCategory == 'artist') {
                        requestOptions = {
                            url: 'https://api.spotify.com/v1/search' + '?type=artist&q=' + song,
                            headers: {
                                'Authorization': 'Bearer ' + accessToken,
                            },
                            json: true
                        };
                        request.get(requestOptions, function (error, response, body) {
                            if (response.statusCode === 401) {
                                io.to(socket.room).emit('getNewToken');
                            }
                            try {
                                const artistFound = body.artists.items[0].id;
                                request.post(requestOptions, function (error, response, body) {
                                    if (response.statusCode === 401) {
                                        io.to(socket.room).emit('getNewToken');
                                    }
                                    if (!error && response.statusCode === 200) {
                                        const options = {
                                            url: 'https://api.spotify.com/v1/artists/' + artistFound + '/top-tracks?country=US',
                                            headers: {
                                                'Authorization': 'Bearer ' + accessToken,
                                            },
                                            json: true
                                        };
                                        request.get(options, function (error, response, body) {
                                            if (response.statusCode === 401) {
                                                io.to(socket.room).emit('getNewToken');
                                            }
                                            const songs = [];
                                            for (let i = 0; i < body.tracks.length; i++) {
                                                const songObject = {"name": "", "artist": "", "id": "", "imgUrl": ""};
                                                songObject.name = body.tracks[i].name;
                                                songObject.artist = body.tracks[i].album.artists[0].name;
                                                songObject.id = body.tracks[i].id;
                                                songObject.imgUrl = body.tracks[i].album.images[0].url;
                                                if (!(!allowExplicitSongs && body.tracks[i].explicit)) {
                                                    songs.push(songObject);
                                                }
                                            }
                                            io.sockets.connected[socket.id].emit('songConfirmation', songs);
                                        });
                                    }
                                });
                            } catch (error) {
                                console.log("Error in artist search")
                            }
                        });
                    }
                    if (searchCategory == 'album') {
                        requestOptions = {
                            url: 'https://api.spotify.com/v1/search' + '?type=album&q=' + song,
                            headers: {
                                'Authorization': 'Bearer ' + accessToken,
                            },
                            json: true
                        };
                        request.get(requestOptions, function (error, response, body) {
                            try {
                                if (response.statusCode === 401) {
                                    io.to(socket.room).emit('getNewToken');
                                }
                                const albumFound = body.albums.items[0].id;
                                const imgUrl = body.albums.items[0].images[0].url;
                                request.post(requestOptions, function (error, response, body) {
                                    if (!error && response.statusCode === 200) {
                                        const options = {
                                            url: 'https://api.spotify.com/v1/albums/' + albumFound + '/tracks',
                                            headers: {
                                                'Authorization': 'Bearer ' + accessToken,
                                            },
                                            json: true
                                        };
                                        request.get(options, function (error, response, body) {
                                            if (response.statusCode === 401) {
                                                io.to(socket.room).emit('getNewToken');
                                            }
                                            const songs = [];
                                            for (let i = 0; i < body.items.length; i++) {
                                                const songObject = {"name": "", "artist": "", "id": "", "imgUrl": ""};
                                                songObject.name = body.items[i].name;
                                                songObject.artist = body.items[i].artists[0].name;
                                                songObject.id = body.items[i].id;
                                                songObject.imgUrl = imgUrl;
                                                if (!(!allowExplicitSongs && body.items[i].explicit)) {
                                                    songs.push(songObject);
                                                }
                                            }
                                            io.sockets.connected[socket.id].emit('songConfirmation', songs);
                                        });
                                    }
                                });
                            } catch (error) {
                                console.log("Error in album search")
                            }
                        });
                    }
                }
            } catch (error) {
                console.log(error);
            }
        });
    });
});
process.on('uncaughtException', function (err) {
    console.log('Caught exception: ', err);
    console.log(err.stack)
});