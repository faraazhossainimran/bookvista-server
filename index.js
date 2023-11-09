const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middleware

app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://bookvista-9b00d.web.app"],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eihrzue.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const logger = (req, res, next) => {
  console.log("log: info", req.method, req.url);
  next();
};

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const roomsCollection = client.db("bookvista").collection("rooms");
    const bookingCollection = client.db("bookvista").collection("booking");
    // get all rooms data
    app.get("/rooms", async (req, res) => {
      const result = await roomsCollection.find().toArray();
      res.send(result);
    });
    // get single room data
    app.get("/rooms/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });
    // book room
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log("from booking", booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });
    // bookings
    app.get("/bookings", async (req, res) => {
      console.log(req.query.email);
      console.log("token owner info", req.user);
      // if (req.user.email !== req.query.email) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      let query = {};
      if (req.query?.email) {
        query = { userEmail: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    // get a booked room
    // app.get("/bookings", async (req, res) => {
    //   const result = await bookingCollection.find().toArray();
    //   res.send(result);
    // });
    // Delete a specific bookedroom
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });
    // patch a rooms reviews
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const newReviews = req.body;
      const object = {
        user_name: newReviews.user_name,
        rating: newReviews.rating,
        userPhoto: newReviews.userPhoto,
        review_text: newReviews.review_text,
      };
      const updatedDoc = {
        $push: { reviews: object },
      };
      const result = await roomsCollection.updateOne(query, updatedDoc);
      res.send(result);
    });
    // get reviews
    app.get("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });
    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 60 * 60 * 1000
        })
        .send({ success: true });
    });

    // clear cookies
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res.clearCookie("token", { maxAge: 0, secure: true, sameSite: 'none' }).send({ success: true });
    });
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(`coffee server is running`);
});

app.listen(port, () => {
  console.log(`port is running on port ${port}`);
});
