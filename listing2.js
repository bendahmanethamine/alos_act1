let unirest = require('unirest');
let req = unirest("GET", "http://localhost:3000/times?_limit=10");
let req1 = unirest("GET", "http://localhost:3000/times/");

req.header({
    "Cache-Control": "no-cache",

})
req.end((response) => {

    console.log("Les 10 premiers:", response.body);

})
/*
Écrire une fonction qui permet de filtrer seulement les ressources de votre API dont le
nom commence par la lettre M
*/


req1.end((response1) => {

    console.log("la lettre M:", response1.body.filter((m) => m.city.startsWith("M")));

})

