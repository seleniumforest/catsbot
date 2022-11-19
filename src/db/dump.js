const db = require("./db");

//only for dev purposes
(async () => {
    let data = await db.ref(``)
        .get();

    console.log(JSON.stringify(data.val(), null, 4));
})();