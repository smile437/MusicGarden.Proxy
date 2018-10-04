const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const mysql = require('mysql');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const port = 8000;
const MSS = "http://localhost:53155/api/values/";
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

const knex = require('knex')({
    client: 'mysql',
    connection: {
        host: "localhost",
        user: "root",
        password: "123456",
        database: "musiclib"
    }
});

app.listen(port, () => {
    console.log(`Connected to database!\nWe are live on ${port}`);
});

app.get("/music", function (req, res) {
    knex.select().table('music').then(function (a) {
        console.log("Success: ", a);
        res.send(a);
    });
});

app.get("/music/search/:query", function (req, res) {
    let query = queryWithoutSpaces(req.params.query);

    knex('music').select().where('title', 'like', '%' + query + '%').then(function (result) {
        console.log("result:", result);
        if (result.length >= 10) {
            res.send(result);
        }
        else {
            console.log(req.params.query);
            let temp = req.params.query;
            if (req.params.query.includes(".")) {
                temp = req.params.query.replace(/\./g, ")(");
            }
            let service = JSON.parse(httpGet(encodeURI(temp)));
            console.log("param: ", req.params.query);
            console.log("service: ", service.length);
            if (service.length > 0) {
                console.log("type", typeof (service));
                console.log("service length", service.length);
                for (let i = 0; i < service.length; i++) {
                    console.log("title", service[i].Title);
                    let query = knex('music')
                        .insert({
                            title: service[i].Title,
                            author: service[i].PrimaryArtistName,
                            album: service[i].TypeAlbumName,
                            lyrics: service[i].Lyrics,
                            youtube: service[i].Youtube,
                            genre: service[i].Genre
                        }).toSQL();

                    let sql = query.sql.replace("insert", 'insert ignore');
                    knex.raw(sql, query.bindings).then(function () {
                    });

                    query = knex('album')
                        .insert({
                            name: service[i].TypeAlbumName,
                            author: service[i].PrimaryArtistName,
                            cover: service[i].HeaderImageUrl
                        }).toSQL();

                    sql = query.sql.replace("insert", 'insert ignore');
                    knex.raw(sql, query.bindings).then(function () {
                    });

                    knex('author')
                        .insert({
                            name: service[i].PrimaryArtistName
                        }).toSQL();

                    sql = query.sql.replace("insert", 'insert ignore');
                    knex.raw(sql, query.bindings).then(function () {
                    });

                }
                knex('music').select().where('title', 'like', '%' + query + '%').then(function (result) {
                    res.send(result);
                });
            }
        }
    }).catch(function (err) {
        if (err) {
            res.sendStatus(503);
        }
    });
});
app.get("/music/details/:title", function (req, res) {
    console.log("ASDAS", req.params.title);
    let query = req.params.title;

    let subQuery = knex('music').select('album').where('music.title', '=', query ).limit(1);
    knex('music').join('album')
        .select('music.*', 'album.cover')
        .where('music.title', '=', query)
        .andWhere('album.name', '=', subQuery)
        .then(function (a) {
            console.log(a);
            res.send(a);
        }).catch(function (error) {
        console.error(error);
    });
});

function httpGet(query) {
    const xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", MSS + "/" + query, false);
    xmlHttp.send(query);
    return xmlHttp.responseText;
}

function queryWithoutSpaces(queryWithSPaces) {
    let query = "";
    if (queryWithSPaces.includes(" ")) {
        query = queryWithSPaces.replace(/ /g, "%");
    }
    else {
        query = queryWithSPaces;
    }
    return query;
}