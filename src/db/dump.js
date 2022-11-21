const db = require("./db");
const fs = require('fs');

//only for dev purposes
(async () => {
    let data = await db.ref(``)
        .get();

    fs.writeFile("./dump.json", JSON.stringify(data.val(), null, 4), () => {});
})();