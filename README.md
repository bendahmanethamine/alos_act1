# alos_act1
# ========
#
Thamine Bendahmane

questions:
1 Modifier le code du Listing 2 pour a cher seulement les 10 premiers enregistrements.
        
        let req = unirest("GET", "http://localhost:3000/times?_limit=10");
        req.end(function (res) {
            if (res.error) throw new Error(res,error)
                console.log(res.body)
})
2 Écrire une fonction qui permet de filtrer seulement les ressources de votre API dont le
nom commence par la lettre M.

        let req1 = unirest("GET", "http://localhost:3000/times/");
        req1.end((response1) => {

            console.log("les cities M:", response1.body.filter((m) => m.city.startsWith("M")));

            })
3 Que signifier la ligne Numéro 6 du Listing 2.

        La directive no-cache response indique que la réponse peut être stockée dans des caches, mais la réponse doit être validée auprès du serveur d'origine avant chaque réutilisation, même lorsque le cache est déconnecté du serveur d'origine.

    source de reponse: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#:~:text=The%20no%2Dcache%20response%20directive%20indicates%20that%20the%20response%20can%20be%20stored%20in%20caches%2C%20but%20the%20response%20must%20be%20validated%20with%20the%20origin%20server%20before%20each%20reuse%2C%20even%20when%20the%20cache%20is%20disconnected%20from%20the%20origin%20server.
