import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();

const PORT = 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("booknook-app");
const addBookCollection = db.collection("books");
const borrowCollection = db.collection("borrows");

const JWKS = createRemoteJWKSet(new URL(`http://localhost:3000/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).send({
        message: "Unauthorized: Token is missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.BETTER_AUTH_URL,
      audience: process.env.JWT_AUDIENCE,
    });

    req.user = payload;

    next();
  } catch (error) {
    console.error("JWT Error:", error.message);

    return res.status(401).send({
      message: "Invalid or expired token",
    });
  }
};

app.post("/add-book", async (req, res) => {
  const data = req.body;
  const result = await addBookCollection.insertOne(data);
  res.send(result);
});

app.get("/books", async (req, res) => {
  const result = await addBookCollection.find({}).toArray();
  res.send(result);
});

app.get("/books/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const result = await addBookCollection.findOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.get("/featured-books", async (req, res) => {
  const result = await addBookCollection.find().limit(6).toArray();
  res.send(result);
});

app.get("/my-books", async (req, res) => {
  const { userEmail } = req.query;
  if (!userEmail) {
    return res.status(400).send({ message: "userEmail is required" });
  }
  const result = await addBookCollection.find({ email: userEmail }).toArray();
  res.send(result);
});

app.patch("/books/:id", async (req, res) => {
  const { id } = req.params;
  const { userEmail } = req.query;
  const { _id, email, ...updates } = req.body;

  const ownerEmail = userEmail ?? email;

  const result = await addBookCollection.updateOne(
    { _id: new ObjectId(id), email: ownerEmail },
    { $set: updates },
  );
  if (result.matchedCount === 0) {
    return res.status(403).send({ message: "Book Not Found" });
  }
  res.send(result);
});

app.delete("/books/:id", async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;

  const result = await addBookCollection.deleteOne({
    _id: new ObjectId(id),
    email: email,
  });

  if (result.deletedCount === 0) {
    return res.status(403).send({ message: "Not allowed or book not found" });
  }
  res.send(result);
});

app.get("/add-books/:email", async (req, res) => {
  const { email } = req.params;
  const result = await addBookCollection.find({ email: email }).toArray();
  res.send(result);
});

app.post("/my-borrows", async (req, res) => {
  const data = req.body;
  const result = await borrowCollection.insertOne(data);
  res.send(result);
});

app.get("/my-borrows", async (req, res) => {
  const { userEmail } = req.query;
  if (!userEmail) {
    return res.status(400).send({ message: "userEmail is required" });
  }
  const result = await borrowCollection.find({ userEmail }).toArray();
  res.send(result);
});

app.get("/my-borrows/:email", async (req, res) => {
  const { email } = req.params;
  const result = await borrowCollection.find({ userEmail: email }).toArray();
  res.send(result);
});

app.patch("/my-borrows/:id", async (req, res) => {
  const { id } = req.params;
  const { userEmail } = req.query;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid borrow id" });
  }

  const result = await borrowCollection.updateOne(
    { _id: new ObjectId(id), userEmail, returnDate: { $exists: false } },
    { $set: { returnDate: new Date().toISOString() } },
  );

  if (result.matchedCount === 0) {
    return res
      .status(404)
      .send({ message: "Borrow record not found or already returned" });
  }
  res.send(result);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
