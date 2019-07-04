$(document).ready(function () {
    document.cookie = "";
    // Get the input field
    var name = document.getElementById("inputName");

    // Execute a function when the user releases a key on the keyboard
    name.addEventListener("keyup", function (event) {
        // Cancel the default action, if needed
        event.preventDefault();
        // Number 13 is the "Enter" key on the keyboard
        if (event.keyCode === 13) {
            // Trigger the button element with a click
            document.getElementById("createPartyBtn").click();
        }
    });
// Get the input field
    var joinParty = document.getElementById("inputPartyId");

// Execute a function when the user releases a key on the keyboard
    joinParty.addEventListener("keyup", function (event) {
        // Cancel the default action, if needed
        event.preventDefault();
        // Number 13 is the "Enter" key on the keyboard
        if (event.keyCode === 13) {
            // Trigger the button element with a click
            document.getElementById("joinPartyBtn").click();
        }
    });

    if (!(localStorage.getItem("cookieConsent") == 'true')) {
        $("#requestCookiesModal").modal('show');
    }

    $("#cookieConsent").click(function () {
        localStorage.setItem("cookieConsent", true);
        $("#requestCookiesModal").modal('hide');
    });
    $("#noCookieConsent").click(function () {
        window.location.href = ("/");
    });
    var socket = io();
    // Create connection to server
    localStorage.setItem("spotifyLinked", false);
    localStorage.setItem("playlistID", 'undefined');
    localStorage.setItem("allSongs", "undefined");
    localStorage.setItem("isHost", false);
    localStorage.setItem("maxSongs", undefined);
    localStorage.setItem("border rounded", 0);
    localStorage.setItem("allowExplicitSongs", true);
    localStorage.setItem("allowDeleteSongs", false);
    localStorage.setItem("songsUsed", 0);

    // Clear local storage
    $("#createPartyBtn").click(function () {
        $("#createPartyModal").modal('show');
    });

    $("#joinPartyBtn").click(function () {
        // Poll server to join room
        var roomToJoin = $("#inputPartyId").val();
        socket.emit("joiningParty", roomToJoin);
    });

    $("#modalCreateParty").click(function () {
        socket.emit("createParty");
        // Create a new party
    });

    socket.on("joinedRoom", function (roomNo, host) {
        // If joining room is successful join room iff you have a name
        if (!($("#inputName").val() == "")) {
            // If joining room is successful join room iff your name is smaller than 20 characters
            if (!($("#inputName").val().length > 20)) {
                var roomToJoin = roomNo;
                var name = $("#inputName").val();
                // Set name and room number
                localStorage.setItem("name", name);
                localStorage.setItem("roomNo", roomToJoin);

                if (host) {
                    localStorage.setItem("isHost", true);
                    if (!isNaN($("#maxSongsPerUser").val())) {
                        localStorage.setItem("maxSongs", parseInt($("#maxSongsPerUser").val()));
                    } else {
                        localStorage.setItem("maxSongs", undefined);
                    }
                    if ($("#explicitSongSelector").val() == "No") {
                        localStorage.setItem("allowExplicitSongs", false)
                    }
                    if ($("#deleteSongsSelector").val() == "Yes") {
                        localStorage.setItem("allowDeleteSongs", true);
                    }
                    localStorage.setItem("name", "👑 " + name);
                }
                window.location.href = ("/party");
            } else {
                alert("Please enter a smaller name")
            }
        } else {
            alert("Please enter a name");
        }
    });
});