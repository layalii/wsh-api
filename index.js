const express = require("express");
const app = express();
const Wappalyzer = require("wappalyzer");
const mongoose = require("mongoose");
const cors = require("cors");

app.use(express.json()); // for parsing application/json
app.use(cors());

mongoose.connect("mongodb://localhost:27017/wsh-db", {
  useNewUrlParser: true
});
const Schema = mongoose.Schema;

const websiteSchema = new Schema(
  {
    url: String,
    data: String
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const websites = mongoose.model("website", websiteSchema);

const port = 4000;

const options = {
  debug: false,
  delay: 500,
  maxDepth: 3,
  maxUrls: 10,
  maxWait: 5000,
  recursive: true,
  userAgent: "Wappalyzer",
  htmlMaxCols: 2000,
  htmlMaxRows: 2000
};

const _isUrlValid = url => {
  if (!url || typeof url !== "string") return false;

  const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;
  const regex = new RegExp(expression);

  if (url.match(regex)) {
    return true;
  } else {
    return false;
  }
};

app.get("/api", (req, res) => {
  res.send("Hello");
});

app.post("/api", (req, res) => {
  if (!req.body || !req.body.url || !_isUrlValid(req.body.url)) {
    res.send({ action: false, msg: "invalid url" });
  }
  const _url = req.body.url;
  const wappalyzer = new Wappalyzer(_url, options);

  websites
    .findOne({ url: _url })
    .then(doc => {
      if (!doc) {
        wappalyzer
          .analyze()
          .then(json => {
            const site = new websites({
              url: _url,
              data: JSON.stringify(json)
            });

            site
              .save()
              .then(() => {
                res.send({
                  action: true,
                  data: {
                    ...json,
                    categories: wappalyzer.wappalyzer.categories
                  }
                });
              })
              .catch(e => {
                console.log(e);
                res.send({
                  action: true,
                  data: {
                    ...json,
                    categories: wappalyzer.wappalyzer.categories
                  }
                });
              });
          })
          .catch(e => {
            console.log(e);
            res.send({ action: false, msg: "invalid url" });
          });
      } else {
        const _data = JSON.parse(doc.toJSON().data);
        res.send({
          action: true,
          data: {
            ..._data,
            categories: wappalyzer.wappalyzer.categories
          }
        });
      }
    })
    .catch(error => {
      res.send({ action: false, msg: "Something went wrong" });
    });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
