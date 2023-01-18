const { getDatabase, ref, get, set, remove } = require("firebase/database");
const { initializeApp } = require("firebase/app");
const express = require("express");
const cors = require("cors");
const path = require("path");
const client = express();

client.use( cors() );
client.set( "view engine", "ejs" );
client.use( express.json({limit:'1gb'}) );
client.use( express.urlencoded({ extended: true }) );
client.set( "views", path.join( __dirname, "public" ) );

/**
 * @param { String } databaseURL
 * @return { void }
 **/
function firebase( database ) {
    const application = typeof database === "string" ? initializeApp({
        databaseURL: database
    }) : initializeApp( database );
    return getDatabase( application );
}
firebase.exists = async function( databaseURL ) {
    try {
        const database = ref( firebase( databaseURL ), "testing" );
        await get( database )
        return true
    } catch (e) {
        return false
    }
}

client.post("/api/v1/server", async ( req, res ) => {
    const isFirebase = await firebase.exists( req.body['databaseURL'] || "https://google.com" );
    if ( !isFirebase || !req.body['databaseURL'] || !req.body['databasePATH'] || !req.body['state'] ) return res.status(404).render("error");
    
    if ( req.body['state']?.toUpperCase() == "GET" ) {
        const initialize = new Array();
        const database = ref( firebase( req.body['databaseURL'] ), req.body['databasePATH'] );
        await get( database ).then( snapshots => {
            snapshots.forEach( snapshot => {
                initialize.push( snapshot.val() )
            })
            res.status(200).json({
                statusCode: 200,
                response: initialize
            })
        }).catch( error => {
            res.status(404).json({
                statusCode: 404,
                response: initialize
            })
        })
        return !0
    } else if ( req.body['state']?.toUpperCase() == "SET" && typeof req.body['data'] == "object" ) {
        let token = new Date().getTime();
        if ( !req.body['data'].slimedb_key_token ) {
            req.body['data'].slimedb_key_token = token;
        } else {
            token = req.body['data'].slimedb_key_token;
        }
        const database = ref( firebase( req.body['databaseURL'] ), req.body['databasePATH'] + `/${token}` );
        await set( database, req.body['data'] ).then( snapshots => {
            res.status(200).json({
                statusCode: 200,
                success: true
            })
        }).catch( error => {
            res.status(404).json({
                statusCode: 404,
                success: false
            })
        })
        return !0
    } else if ( req.body['state']?.toUpperCase() == "DEL" && typeof req.body['remove'] == "object" ) {
        let fullpath = req.body['databasePATH'];
        if ( req.body['remove'].slimedb_key_token ) {
            fullpath += `/${req.body['remove'].slimedb_key_token}`;
        } else {
            return res.status(404).json({
                statusCode: 404,
                remove: false
            })
        }
        const database = ref( firebase( req.body['databaseURL'] ), fullpath );
        await remove( database ).then( snapshots => {
            res.status(200).json({
                statusCode: 200,
                remove: true
            })
        }).catch( error => {
            res.status(404).json({
                statusCode: 404,
                remove: false
            })
        })
        return !0
    } else {
        return res.status(404).render("error")
    }
});

client.get("*", async ( req, res ) => {
    res.status(404).render("error");
});
client.all("*", async ( req, res ) => {
    res.status(404).json({
        statusCode: 404,
        message: "File not found!"
    });
});

client.listen(8250, function() {
    console.log(" [INFO] Server running " + new Date().toUTCString() )
})
